// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ClaudeInputViewProvider } from './ui/webviewViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Claude Editor Input extension is now active!');

	// Create and register WebviewViewProvider
	const claudeInputProvider = new ClaudeInputViewProvider(context);
	const webviewViewProviderDisposable = vscode.window.registerWebviewViewProvider('claude-input', claudeInputProvider);

	// New command: Show Claude Input view
	const showClaudeInputDisposable = vscode.commands.registerCommand('claude-editor-input.showClaudeInput', async () => {
		try {
			// Ensure Claude terminal
			await claudeInputProvider.ensureClaudeTerminal();
			// Show Explorer and then move focus to the view
			await vscode.commands.executeCommand('workbench.view.explorer');
			await vscode.commands.executeCommand('claude-input.focus');
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});


	context.subscriptions.push(
		webviewViewProviderDisposable,
		showClaudeInputDisposable,
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// No special cleanup needed as WebviewView is managed automatically
}
