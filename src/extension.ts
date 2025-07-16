// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

let _tempDocumentOpenCount = 0;
const tempDocumentUris: Set<string> = new Set();
const tempFilePaths: Map<string, string> = new Map(); // URI -> file path mapping
const originalEditorInfo: Map<
  string,
  { document: vscode.TextDocument; selection: vscode.Selection }
> = new Map(); // URI -> original editor info

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("Claude Editor Input extension is now active!");

  // Register the main command
  const openClaudeInputEditorDisposable = vscode.commands.registerCommand(
    "claude-editor-input.openClaudeInputEditor",
    async () => {
      try {
        await createTemporaryEditor();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  // Monitor when tabs are closed to detect closed temporary editors
  const onDidChangeTabsDisposable = vscode.window.tabGroups.onDidChangeTabs(
    async (event) => {
      // Handle closed tabs
      for (const closedTab of event.closed) {
        if (closedTab.input instanceof vscode.TabInputText) {
          const uriString = closedTab.input.uri.toString();
          if (tempDocumentUris.has(uriString)) {
            try {
              await handleDocumentCloseByUri(uriString);
            } catch (error) {
              vscode.window.showErrorMessage(
                `Error processing document: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        }
      }
    },
  );

  context.subscriptions.push(
    openClaudeInputEditorDisposable,
    onDidChangeTabsDisposable,
  );
}

/**
 * Create and display a temporary Markdown editor
 */
async function createTemporaryEditor(): Promise<void> {
  // Save current active editor info before creating temporary editor
  const activeEditor = vscode.window.activeTextEditor;
  let originalInfo:
    | { document: vscode.TextDocument; selection: vscode.Selection }
    | undefined;
  if (activeEditor) {
    originalInfo = {
      document: activeEditor.document,
      selection: activeEditor.selection,
    };
  }

  // Generate unique temporary file name
  const timestamp = Date.now();
  const fileName = `claude-input-${timestamp}.md`;
  const tmpFilePath = path.join(os.tmpdir(), fileName);

  // Create temporary file with placeholder comment
  const placeholder = `<!--This is a temporary editor for Claude Code. Enter your prompt for Claude here. -->\n`;
  fs.writeFileSync(tmpFilePath, placeholder, "utf8");

  // Open the temporary file
  const document = await vscode.workspace.openTextDocument(tmpFilePath);

  // Show the document in editor and move cursor to line 2
  const editor = await vscode.window.showTextDocument(document, {
    preview: false,
    preserveFocus: false,
  });

  // Move cursor to line 2, column 1 (0-indexed)
  const position = new vscode.Position(1, 0);
  editor.selection = new vscode.Selection(position, position);

  // Track this document as temporary (after showing to avoid timing issues)
  tempDocumentUris.add(document.uri.toString());
  tempFilePaths.set(document.uri.toString(), tmpFilePath);

  // Save original editor info if available
  if (originalInfo) {
    originalEditorInfo.set(document.uri.toString(), originalInfo);
  }

  _tempDocumentOpenCount++;
}

/**
 * Handle when a temporary document is closed by URI
 */
async function handleDocumentCloseByUri(uriString: string): Promise<void> {
  console.debug(`Handling document close for: ${uriString}`);

  // Remove from tracking
  tempDocumentUris.delete(uriString);

  // Get temporary file path
  const tmpFilePath = tempFilePaths.get(uriString);
  tempFilePaths.delete(uriString);

  if (!tmpFilePath) {
    console.debug(`No temporary file path found for: ${uriString}`);
    return;
  }

  // Read content from temporary file if it still exists
  let content = "";
  if (fs.existsSync(tmpFilePath)) {
    try {
      content = fs.readFileSync(tmpFilePath, "utf8").trim();
    } catch (error) {
      console.error(`Failed to read temporary file: ${tmpFilePath}`, error);
    }

    // Delete the temporary file
    try {
      fs.unlinkSync(tmpFilePath);
      console.debug(`Deleted temporary file: ${tmpFilePath}`);
    } catch (error) {
      console.error(`Failed to delete temporary file: ${tmpFilePath}`, error);
    }
  }

  // Remove all HTML comment blocks (including multiline)
  if (content) {
    content = content.replace(/<!--([\s\S]*?)-->/g, "").trim();
  }

  if (!content) return;

  // Restore original editor and selection if available
  const originalInfo = originalEditorInfo.get(uriString);
  if (originalInfo) {
    try {
      const editor = await vscode.window.showTextDocument(
        originalInfo.document,
        {
          preview: false,
          preserveFocus: false,
        },
      );
      editor.selection = originalInfo.selection;
    } catch (error) {
      console.error(`Failed to restore original editor: ${error}`);
    }
    originalEditorInfo.delete(uriString);
  }

  // Find Claude terminal
  let claudeTerminal = findClaudeTerminal();

  if (!claudeTerminal) {
    // If there is no terminal, execute the start command
    await vscode.commands.executeCommand("claude-code.runClaude.keyboard");
    // 5秒待機
    await new Promise((resolve) => setTimeout(resolve, 5000));
    // Find the terminal again
    claudeTerminal = findClaudeTerminal();
  }

  if (!claudeTerminal) {
    vscode.window.showErrorMessage(
      "Claude terminal not found. Please ensure the Claude extension is running.",
    );
    return;
  }

  claudeTerminal.show();
  claudeTerminal.sendText(content, false);
}

/**
 * Find Claude extension terminal
 */
function findClaudeTerminal(): vscode.Terminal | undefined {
  const terminals = vscode.window.terminals;

  // Look for terminals that might be associated with Claude
  // Common patterns: terminals with 'claude', 'anthropic', or 'mcp' in the name
  const claudePatterns = [/claude/i, /anthropic/i];

  for (const terminal of terminals) {
    const name = terminal.name.toLowerCase();

    // Check if terminal name matches any Claude-related pattern
    if (claudePatterns.some((pattern) => pattern.test(name))) {
      return terminal;
    }
  }

  return undefined;
}

// This method is called when your extension is deactivated
export function deactivate() {
  tempDocumentUris.clear();
  tempFilePaths.clear();
  originalEditorInfo.clear();
}
