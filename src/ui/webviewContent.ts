import * as vscode from 'vscode';

export function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude Input</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            padding: 8px;
            margin: 0;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            box-sizing: border-box;
        }

        .input-container {
            display: flex;
            gap: 8px;
            align-items: flex-start;
            height: 100%;
        }

        #messageInput {
            flex: 1;
            min-height: 60px;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: vertical;
            box-sizing: border-box;
        }

        #messageInput:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        #messageInput::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }

        #sendButton {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: inherit;
            transition: background-color 0.2s;
            white-space: nowrap;
        }

        #sendButton:hover:not(:disabled) {
            background-color: var(--vscode-button-hoverBackground);
        }

        #sendButton:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        /* スクロールバーのスタイル */
        #messageInput::-webkit-scrollbar {
            width: 8px;
        }

        #messageInput::-webkit-scrollbar-track {
            background: var(--vscode-scrollbarSlider-background);
        }

        #messageInput::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-hoverBackground);
            border-radius: 4px;
        }

        #messageInput::-webkit-scrollbar-thumb:hover {
            background: var(--vscode-scrollbarSlider-activeBackground);
        }
    </style>
</head>
<body>
    <div class="input-container">
        <textarea
            id="messageInput"
            placeholder="Claudeに質問やリクエストを入力してください..."
        ></textarea>
        <button id="sendButton">送信</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');

        let isLoading = false;

        // メッセージ送信機能
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isLoading) return;

            // 入力欄をクリア
            messageInput.value = '';

            // ローディング状態に設定
            setLoading(true);

            // 拡張機能にメッセージを送信
            vscode.postMessage({
                command: 'userQuery',
                text: text
            });
        }

        // ローディング状態の管理
        function setLoading(loading) {
            isLoading = loading;
            sendButton.disabled = loading;
            sendButton.textContent = loading ? '送信中...' : '送信';
        }

        // イベントリスナー
        sendButton.addEventListener('click', sendMessage);

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // 拡張機能からのメッセージを受信
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.command) {
                case 'loadingState':
                    setLoading(message.loading);
                    break;

                case 'assistantMessage':
                case 'error':
                    setLoading(false);
                    break;
            }
        });

        // 初期フォーカス
        messageInput.focus();
    </script>
</body>
</html>`;
}
