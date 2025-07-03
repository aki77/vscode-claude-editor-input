# Claude Editor Input

Claude Editor Input is a Visual Studio Code extension that provides a simple interface for sending prompts to the Anthropic Claude Code Extension.

![Demo](https://i.gyazo.com/02f621336bda48159b665c969f431b65.gif)

## Features

- Provides a dedicated chat interface for interacting with Claude.
- Send your prompt directly to Claude's terminal with a single action.
- Access the Claude Input view from the Explorer sidebar for easy prompt management.

## Usage

### Method 1: Using Command Palette
1. Open the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`).
2. Select `Show Claude Input`.
3. This will open the Explorer sidebar and focus on the Claude Input view.
4. Type your message in the text area.
5. Press `Enter` to send your message to Claude (use `Shift+Enter` for new lines).

### Method 2: Using Explorer Sidebar
1. Open the Explorer sidebar.
2. Find the "Claude Input" view.
3. Type your message in the text area.
4. Press `Enter` to send your message to Claude (use `Shift+Enter` for new lines).

## Requirements

- [Anthropic Claude Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) must be installed and enabled.

## Settings

No additional settings are required.

## Known Issues

- If Claude's terminal is not running, the extension will automatically attempt to start it.
- The extension requires the Anthropic Claude Code Extension to be properly installed and authenticated.

## License

MIT
