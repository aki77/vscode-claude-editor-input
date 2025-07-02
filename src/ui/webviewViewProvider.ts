import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';
import { WebviewMessage } from '../types/message';

export class ClaudeInputViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionContext: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionContext.extensionUri]
        };

        webviewView.webview.html = getWebviewContent(webviewView.webview, this._extensionContext);

        // WebViewからのメッセージを処理
        webviewView.webview.onDidReceiveMessage(
            async (message: WebviewMessage) => {
                switch (message.command) {
                    case 'userQuery':
                        await this.handleUserQuery(message.text);
                        break;
                }
            },
            undefined,
            this._extensionContext.subscriptions
        );
    }

    /**
     * ユーザーのクエリを処理してClaudeに送信
     */
    private async handleUserQuery(query: string): Promise<void> {
        if (!this._view) {
            return;
        }

        try {
            // ローディング状態を表示
            this._view.webview.postMessage({
                command: 'loadingState',
                loading: true
            });

            // Claudeターミナルを確保（ない場合は作成）
            let claudeTerminal = await this.ensureClaudeTerminal();

            if (!claudeTerminal) {
                // Claudeターミナルが作成できない場合、エラーを表示
                this._view.webview.postMessage({
                    command: 'error',
                    message: 'Claudeターミナルを作成できませんでした。Claude拡張機能が正しくインストールされ、認証されていることを確認してください。'
                });
                this._view.webview.postMessage({
                    command: 'loadingState',
                    loading: false
                });
                return;
            }

            // Claudeターミナルを表示
            claudeTerminal.show();

            // 少し待機してからメッセージを送信
            await new Promise(resolve => setTimeout(resolve, 100));
            claudeTerminal.sendText(query);
            claudeTerminal.sendText('');

            // ローディング終了
            this._view.webview.postMessage({
                command: 'loadingState',
                loading: false
            });

        } catch (error) {
            console.error('Error handling user query:', error);
            this._view.webview.postMessage({
                command: 'error',
                message: `エラーが発生しました: ${error instanceof Error ? error.message : String(error)}`
            });
            this._view.webview.postMessage({
                command: 'loadingState',
                loading: false
            });
        }
    }

    /**
     * Claudeターミナルを検索
     */
    private findClaudeTerminal(): vscode.Terminal | undefined {
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

    /**
     * Claudeターミナルがない場合に作成
     */
    public async ensureClaudeTerminal(): Promise<vscode.Terminal | undefined> {
        let claudeTerminal = this.findClaudeTerminal();

        if (!claudeTerminal) {
            try {
                await vscode.commands.executeCommand('claude-code.runClaude.keyboard');
                // 5秒待機
                await new Promise(resolve => setTimeout(resolve, 5000));
                claudeTerminal = this.findClaudeTerminal();
            } catch (error) {
                console.error('Failed to create Claude terminal:', error);
            }
        }

        return claudeTerminal;
    }
}
