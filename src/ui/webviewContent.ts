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
            padding: 4px;
            margin: 0;
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            box-sizing: border-box;
        }

        .input-container {
            height: 100%;
        }

        #messageInput {
            width: 100%;
            min-height: 40px;
            height: 100%;
            padding: 6px 8px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
            resize: none;
            box-sizing: border-box;
        }

        #messageInput:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        #messageInput:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        #messageInput::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }

        /* Scrollbar style */
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
            data-vscode-context='{"webviewSection": "editor"}'
            placeholder="Enter your question or request for Claude..."
        ></textarea>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        const messageInput = document.getElementById('messageInput');

        let isLoading = false;
        let isComposing = false;

        // Message sending function
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isLoading) return;

            // Clear input field
            messageInput.value = '';

            // Set loading state
            setLoading(true);

            // Send message to extension
            vscode.postMessage({
                command: 'userQuery',
                text: text
            });
        }

        // Manage loading state
        function setLoading(loading) {
            isLoading = loading;
            messageInput.disabled = loading;

            // Keep focus
            if (!loading) {
                setTimeout(() => messageInput.focus(), 10);
            }
        }

        // Event listeners for IME composition
        messageInput.addEventListener('compositionstart', () => {
            isComposing = true;
        });

        messageInput.addEventListener('compositionend', () => {
            isComposing = false;
        });

        // Event listener for key events
        messageInput.addEventListener('keydown', (e) => {
            // NOTE: Even if you specify "webviewSection": "editor", it does not work. Manually handle Ctrl+P and Ctrl+F.
            if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
                if (e.key === 'p') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveCursorUp();
                    return;
                }
                if (e.key === 'f') {
                    e.preventDefault();
                    e.stopPropagation();
                    moveCursorRight();
                    return;
                }
            }

            if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                e.preventDefault();
                sendMessage();
            }
        });

        function moveCursorUp() {
            const textarea = messageInput;
            const text = textarea.value;
            const cursorPos = textarea.selectionStart;

            const beforeCursor = text.substring(0, cursorPos);
            const currentLineStart = beforeCursor.lastIndexOf('\\n') + 1;
            const currentColumn = cursorPos - currentLineStart;

            const prevLineEnd = beforeCursor.lastIndexOf('\\n');
            if (prevLineEnd === -1) return; // If it's the first line

            const prevLineStart = beforeCursor.lastIndexOf('\\n', prevLineEnd - 1) + 1;
            const prevLineLength = prevLineEnd - prevLineStart;

            const newColumn = Math.min(currentColumn, prevLineLength);
            const newPos = prevLineStart + newColumn;

            textarea.setSelectionRange(newPos, newPos);
        }

        function moveCursorRight() {
            const textarea = messageInput;
            const newPos = Math.min(textarea.selectionStart + 1, textarea.value.length);
            textarea.setSelectionRange(newPos, newPos);
        }

        // Receive messages from extension
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

        // Initial focus
        messageInput.focus();
    </script>
</body>
</html>`;
}
