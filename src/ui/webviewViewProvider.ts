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

        // Handle messages from the WebView
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
     * Handle user's query and send it to Claude
     */
    private async handleUserQuery(query: string): Promise<void> {
        if (!this._view) {
            return;
        }

        try {
            // Show loading state
            this._view.webview.postMessage({
                command: 'loadingState',
                loading: true
            });

            // Ensure Claude terminal (create if not exists)
            let claudeTerminal = await this.ensureClaudeTerminal();

            if (!claudeTerminal) {
                // If Claude terminal cannot be created, show error
                this._view.webview.postMessage({
                    command: 'error',
                    message: 'Failed to create Claude terminal. Please make sure the Claude extension is properly installed and authenticated.'
                });
                this._view.webview.postMessage({
                    command: 'loadingState',
                    loading: false
                });
                return;
            }

            // Show Claude terminal
            claudeTerminal.show();

            // Wait a bit before sending the message
            await new Promise(resolve => setTimeout(resolve, 100));
            claudeTerminal.sendText(query);
            // Wait a bit to ensure the message is sent as a command, not just a newline
            await new Promise(resolve => setTimeout(resolve, 50));
            claudeTerminal.sendText('');

            // Return focus to the webview
            await new Promise(resolve => setTimeout(resolve, 1000));
            this._view.show();

            // End loading state
            this._view.webview.postMessage({
                command: 'loadingState',
                loading: false
            });

        } catch (error) {
            console.error('Error handling user query:', error);
            this._view.webview.postMessage({
                command: 'error',
                message: `An error occurred: ${error instanceof Error ? error.message : String(error)}`
            });
            this._view.webview.postMessage({
                command: 'loadingState',
                loading: false
            });
        }
    }

    /**
     * Find Claude terminal
     */
    private findClaudeTerminal(): vscode.Terminal | undefined {
        const terminals = vscode.window.terminals;

        // Search for terminals with Claude-related patterns
        const claudePatterns = [
            /claude/i,
            /anthropic/i,
        ];

        for (const terminal of terminals) {
            const name = terminal.name.toLowerCase();

            // Check if terminal name matches Claude-related patterns
            if (claudePatterns.some(pattern => pattern.test(name))) {
                return terminal;
            }
        }

        return undefined;
    }

    /**
     * Create Claude terminal if not exists
     */
    public async ensureClaudeTerminal(): Promise<vscode.Terminal | undefined> {
        let claudeTerminal = this.findClaudeTerminal();

        if (!claudeTerminal) {
            try {
                await vscode.commands.executeCommand('claude-code.runClaude.keyboard');
                // Wait 5 seconds
                await new Promise(resolve => setTimeout(resolve, 5000));
                claudeTerminal = this.findClaudeTerminal();
            } catch (error) {
                console.error('Failed to create Claude terminal:', error);
            }
        }

        return claudeTerminal;
    }
}
