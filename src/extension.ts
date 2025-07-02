// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { getWebviewContent } from './ui/webviewContent';
import { WebviewMessage } from './types/message';

let currentPanel: vscode.WebviewPanel | undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Claude Editor Input extension is now active!');

	// メインコマンド: Claude Chat UIを開く
	const openClaudeChatDisposable = vscode.commands.registerCommand('claude-editor-input.openClaudeChat', async () => {
		try {
			// 1. Claudeターミナルを探す（なければ開く）
			let claudeTerminal = findClaudeTerminal();
			if (!claudeTerminal) {
				await vscode.commands.executeCommand('claude-code.runClaude.keyboard');
				// 5秒待機
				await new Promise(resolve => setTimeout(resolve, 5000));
				claudeTerminal = findClaudeTerminal();
			}

			if (!claudeTerminal) {
				vscode.window.showErrorMessage('Claude terminal not found. Please ensure the Claude extension is running.');
				return;
			}

			// 2. Claudeターミナルを表示
			claudeTerminal.show();

			// 3. エディタを下に分割
			await vscode.commands.executeCommand('workbench.action.splitEditorDown');
		// 4. 既存のパネルがある場合は閉じる
		if (currentPanel) {
			currentPanel.dispose();
		}

		// 5. 分割された下側のエディタグループにフォーカスを移動
		await vscode.commands.executeCommand('workbench.action.focusBelowGroup');

		// 6. 新しいWebViewパネルを作成（現在アクティブなエディタグループ = 下側に）
		currentPanel = vscode.window.createWebviewPanel(
			'claudeInput',
			'Claude Input',
			vscode.ViewColumn.Active,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [context.extensionUri]
			}
		);

			// WebViewのHTMLコンテンツを設定
			currentPanel.webview.html = getWebviewContent(currentPanel.webview, context);

			// WebViewからのメッセージを処理
			currentPanel.webview.onDidReceiveMessage(
				async (message: WebviewMessage) => {
					switch (message.command) {
						case 'userQuery':
							await handleUserQuery(message.text);
							break;
					}
				},
				undefined,
				context.subscriptions
			);

			// パネルが閉じられたときの処理
			currentPanel.onDidDispose(() => {
				currentPanel = undefined;
			}, null, context.subscriptions);

		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	context.subscriptions.push(openClaudeChatDisposable);
}

/**
 * ユーザーのクエリを処理してClaudeに送信
 */
async function handleUserQuery(query: string): Promise<void> {
	if (!currentPanel) {
		return;
	}

	try {
		// Claudeターミナルを探す
		let claudeTerminal = findClaudeTerminal();

		if (!claudeTerminal) {
			// Claudeターミナルが見つからない場合、エラーを表示
			currentPanel.webview.postMessage({
				command: 'error',
				message: 'Claudeターミナルが見つかりません。Claude拡張機能が正しくインストールされ、認証されていることを確認してください。'
			});
			return;
		}

		// Claudeターミナルを表示
		claudeTerminal.show();

		// ローディング状態を表示
		currentPanel.webview.postMessage({
			command: 'loadingState',
			loading: true
		});

		// 少し待機してからメッセージを送信
		await new Promise(resolve => setTimeout(resolve, 100));
		claudeTerminal.sendText(query);
		claudeTerminal.sendText('');

		// ローディング終了
		currentPanel.webview.postMessage({
			command: 'loadingState',
			loading: false
		});

	} catch (error) {
		console.error('Error handling user query:', error);
		currentPanel.webview.postMessage({
			command: 'error',
			message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
		});
	}
}

/**
 * Claudeターミナルを検索
 */
function findClaudeTerminal(): vscode.Terminal | undefined {
	const terminals = vscode.window.terminals;

	// Claude関連のパターンでターミナルを検索
	const claudePatterns = [
		/claude/i,
		/anthropic/i,
	];

	for (const terminal of terminals) {
		const name = terminal.name.toLowerCase();

		// ターミナル名がClaude関連のパターンにマッチするかチェック
		if (claudePatterns.some(pattern => pattern.test(name))) {
			return terminal;
		}
	}

	return undefined;
}

// This method is called when your extension is deactivated
export function deactivate() {
	if (currentPanel) {
		currentPanel.dispose();
	}
}
