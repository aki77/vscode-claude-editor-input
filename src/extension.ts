// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

let tempDocumentOpenCount = 0;
let tempDocumentUris: Set<string> = new Set();
let tempFilePaths: Map<string, string> = new Map(); // URI -> file path mapping

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Claude Editor Input extension is now active!');

	// Register the main command
	const openClaudeInputEditorDisposable = vscode.commands.registerCommand('claude-editor-input.openClaudeInputEditor', async () => {
		try {
			await createTemporaryEditor();
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	// Monitor when visible text editors change to detect closed temporary editors
	const onDidChangeVisibleEditorsDisposable = vscode.window.onDidChangeVisibleTextEditors(async (editors) => {
		// Get currently visible temporary document URIs
		const visibleTempUris = new Set<string>();
		for (const editor of editors) {
			if (isTemporaryDocument(editor.document)) {
				visibleTempUris.add(editor.document.uri.toString());
			}
		}

		// Find temporary documents that are no longer visible (closed)
		const closedTempUris: string[] = [];
		for (const tempUri of tempDocumentUris) {
			if (!visibleTempUris.has(tempUri)) {
				closedTempUris.push(tempUri);
			}
		}

		// Handle closed temporary documents
		for (const closedUri of closedTempUris) {
			try {
				await handleDocumentCloseByUri(closedUri);
			} catch (error) {
				vscode.window.showErrorMessage(`Error processing document: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	});

	context.subscriptions.push(openClaudeInputEditorDisposable, onDidChangeVisibleEditorsDisposable);
}

/**
 * Create and display a temporary Markdown editor
 */
async function createTemporaryEditor(): Promise<void> {
	// Generate unique temporary file name
	const timestamp = Date.now();
	const fileName = `claude-input-${timestamp}.md`;
	const tmpFilePath = path.join(os.tmpdir(), fileName);

	// Create temporary file with placeholder comment
	const placeholder = `<!--This is a temporary editor for Claude Code. Enter your prompt for Claude here. -->\n`;
	fs.writeFileSync(tmpFilePath, placeholder, 'utf8');

	// Open the temporary file
	const document = await vscode.workspace.openTextDocument(tmpFilePath);

	// Show the document in editor and move cursor to line 2
	const editor = await vscode.window.showTextDocument(document, {
		preview: false,
		preserveFocus: false
	});

	// Move cursor to line 2, column 1 (0-indexed)
	const position = new vscode.Position(1, 0);
	editor.selection = new vscode.Selection(position, position);

	// Track this document as temporary (after showing to avoid timing issues)
	tempDocumentUris.add(document.uri.toString());
	tempFilePaths.set(document.uri.toString(), tmpFilePath);
	tempDocumentOpenCount++;
}

/**
 * Check if a document is one of our temporary documents
 */
function isTemporaryDocument(document: vscode.TextDocument): boolean {
	return tempDocumentUris.has(document.uri.toString());
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
	let content = '';
	if (fs.existsSync(tmpFilePath)) {
		try {
			content = fs.readFileSync(tmpFilePath, 'utf8').trim();
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
		content = content.replace(/<!--([\s\S]*?)-->/g, '').trim();
	}

	if (!content) {
		vscode.window.showInformationMessage('Document was empty, nothing to send.');
		return;
	}

	// Copy content to clipboard
	await vscode.env.clipboard.writeText(content);

	// Find Claude terminal
	const claudeTerminal = findClaudeTerminal();

	if (!claudeTerminal) {
		vscode.window.showErrorMessage('Claude terminal not found. Please ensure the Claude extension is running.');
		return;
	}

	// Activate terminal and paste content
	claudeTerminal.show();

	// Small delay to ensure terminal is focused
	await new Promise(resolve => setTimeout(resolve, 100));

	// Paste clipboard content to terminal
	await vscode.commands.executeCommand('workbench.action.terminal.paste');

	vscode.window.showInformationMessage('Content sent to Claude terminal successfully!');
}

/**
 * Handle when a temporary document is closed
 */
async function handleDocumentClose(document: vscode.TextDocument): Promise<void> {
	const uriString = document.uri.toString();
	await handleDocumentCloseByUri(uriString);
}

/**
 * Find Claude extension terminal
 */
function findClaudeTerminal(): vscode.Terminal | undefined {
	const terminals = vscode.window.terminals;

	// Look for terminals that might be associated with Claude
	// Common patterns: terminals with 'claude', 'anthropic', or 'mcp' in the name
	const claudePatterns = [
		/claude/i,
		/anthropic/i,
	];

	for (const terminal of terminals) {
		const name = terminal.name.toLowerCase();

		// Check if terminal name matches any Claude-related pattern
		if (claudePatterns.some(pattern => pattern.test(name))) {
			return terminal;
		}
	}

	// If no specific Claude terminal found, try to find any active terminal
	// This is a fallback - user might have renamed the terminal
	if (terminals.length > 0) {
		// Return the most recently created terminal (last in array)
		return terminals[terminals.length - 1];
	}

	return undefined;
}

// This method is called when your extension is deactivated
export function deactivate() {
	tempDocumentUris.clear();
	tempFilePaths.clear();
}
