// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let tempDocumentOpenCount = 0;
let tempDocumentUris: Set<string> = new Set();
let tempDocumentContents: Map<string, string> = new Map();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Claude Editor Input extension is now active!');

	// Register the main command
	const sendToClaudeTerminalDisposable = vscode.commands.registerCommand('claude-editor-input.sendToClaudeTerminal', async () => {
		try {
			await createTemporaryEditor();
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	// Monitor when documents are closed
	const onDidCloseDisposable = vscode.workspace.onDidCloseTextDocument(async (document) => {
		console.debug(`Document closed: ${document.uri.toString()}`);
		if (isTemporaryDocument(document)) {
			try {
				await handleDocumentClose(document);
			} catch (error) {
				vscode.window.showErrorMessage(`Error processing document: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	});

	// Monitor when documents change to cache content
	const onDidChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
		const document = event.document;
		if (isTemporaryDocument(document)) {
			const text = document.getText();
			// Do not cache if empty characters
			if (text.trim() !== '') {
					tempDocumentContents.set(document.uri.toString(), text);
			}
		}
	});

	context.subscriptions.push(sendToClaudeTerminalDisposable, onDidCloseDisposable, onDidChangeDisposable);
}

/**
 * Create and display a temporary Markdown editor
 */
async function createTemporaryEditor(): Promise<void> {
	// Create untitled document with Markdown language
	const document = await vscode.workspace.openTextDocument({
		language: 'markdown',
		content: ''
	});

	// Track this document as temporary
	tempDocumentUris.add(document.uri.toString());
	tempDocumentOpenCount++;

	// Show the document in editor
	await vscode.window.showTextDocument(document, {
		preview: false,
		preserveFocus: false
	});
}

/**
 * Check if a document is one of our temporary documents
 */
function isTemporaryDocument(document: vscode.TextDocument): boolean {
	return document.isUntitled &&
		   document.languageId === 'markdown' &&
		   tempDocumentUris.has(document.uri.toString());
}

/**
 * Handle when a temporary document is closed
 */
async function handleDocumentClose(document: vscode.TextDocument): Promise<void> {
	const uriString = document.uri.toString();
	console.debug(`Handling document close for: ${uriString}`);

	// Remove from tracking
	tempDocumentUris.delete(uriString);

	// Get document content from cache
	const content = tempDocumentContents.get(uriString)?.trim() || '';

	// Remove from content cache
	tempDocumentContents.delete(uriString);

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
 * Find Claude extension terminal
 */
function findClaudeTerminal(): vscode.Terminal | undefined {
	const terminals = vscode.window.terminals;

	// Look for terminals that might be associated with Claude
	// Common patterns: terminals with 'claude', 'anthropic', or 'mcp' in the name
	const claudePatterns = [
		/claude/i,
		/anthropic/i,
		/mcp/i,
		/model.*context.*protocol/i
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
	tempDocumentContents.clear();
}
