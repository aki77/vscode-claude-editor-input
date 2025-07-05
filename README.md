# Claude Code Editor Input

Claude Code Editor Input is a Visual Studio Code extension that provides a convenient way to input text in a temporary Markdown editor and send it directly to the Anthropic Claude Code Extension.

## Features

- Opens a temporary Markdown editor for composing prompts to Claude
- Automatically sends content to Claude Code Extension terminal when the editor is closed
- Automatically starts Claude terminal if not already running

## Usage

### Method 1: Using Command Palette
1. Open the command palette (`Cmd+Shift+P` or `Ctrl+Shift+P`)
2. Search for and select `Open Claude Input Editor`
3. A temporary Markdown file will open with a placeholder comment
4. Write your prompt for Claude in the editor
5. Close the editor tab to automatically send the content to Claude

### Method 2: Using Keyboard Shortcut
1. Press `Ctrl+Alt+I` (on both Windows/Linux and Mac)
2. A temporary Markdown file will open
3. Write your prompt for Claude
4. Close the editor tab to send the content

### Method 3: Using Editor Title Button
1. When the Claude Code extension is available, you'll see a note icon in the editor title bar
2. Click the icon to open the Claude Input Editor
3. Write your prompt and close the tab to send

## Requirements

- [Anthropic Claude Code Extension](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) must be installed and enabled
- The Claude Code extension must be properly authenticated

## Settings

No additional settings are required.

## License

MIT
