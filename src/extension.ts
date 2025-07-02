// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ClaudeInputViewProvider } from './ui/webviewViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Claude Editor Input extension is now active!');

	// WebviewViewProviderを作成・登録
	const claudeInputProvider = new ClaudeInputViewProvider(context);
	const webviewViewProviderDisposable = vscode.window.registerWebviewViewProvider('claude-input', claudeInputProvider);

	// 新しいコマンド: Claude Inputビューを表示
	const showClaudeInputDisposable = vscode.commands.registerCommand('claude-editor-input.showClaudeInput', async () => {
		try {
			// Claudeターミナルを確保
			await claudeInputProvider.ensureClaudeTerminal();
			// エクスプローラーを表示してからビューにフォーカスを移動
			await vscode.commands.executeCommand('workbench.view.explorer');
			await vscode.commands.executeCommand('claude-input.focus');
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	// 旧コマンド: 互換性のため残すが、新しい実装を使用
	const openClaudeChatDisposable = vscode.commands.registerCommand('claude-editor-input.openClaudeChat', async () => {
		// 新しいコマンドを実行
		await vscode.commands.executeCommand('claude-editor-input.showClaudeInput');
	});

	context.subscriptions.push(
		webviewViewProviderDisposable,
		showClaudeInputDisposable,
		openClaudeChatDisposable
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	// WebviewViewは自動的に管理されるため、特別なクリーンアップは不要
}
