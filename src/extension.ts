// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

let tempDocumentOpenCount = 0;
let tempDocumentUris: Set<string> = new Set();
let tempFilePaths: Map<string, string> = new Map(); // URI -> file path mapping

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Claude Editor Input extension is now active!');

	// claudeTerminalが閉じられたときに一時エディタも閉じる
	const onTerminalCloseDisposable = vscode.window.onDidCloseTerminal(async (closedTerminal) => {
		// 閉じられたターミナルがclaudeTerminalかどうかチェック
		const claudePatterns = [
			/claude/i,
			/anthropic/i,
		];

		if (claudePatterns.some(pattern => pattern.test(closedTerminal.name))) {
			// 一時ファイルのエディタをすべて閉じる
			const editorsToClose: vscode.TextEditor[] = [];

			vscode.window.visibleTextEditors.forEach(editor => {
				if (isTemporaryDocument(editor.document)) {
					editorsToClose.push(editor);
				}
			});

			// エディタを順番に閉じる
			for (const editor of editorsToClose) {
				// TabGroups APIを使用してタブを直接閉じる
				const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
				const tabToClose = tabs.find(tab =>
					tab.input instanceof vscode.TabInputText &&
					tab.input.uri.toString() === editor.document.uri.toString()
				);

				if (tabToClose) {
					await vscode.window.tabGroups.close(tabToClose, true);
				}
			}

			// 一時ファイルの追跡情報をクリア
			tempDocumentUris.clear();
			tempFilePaths.clear();
			tempDocumentOpenCount = 0;
		}
	});

	// メインコマンド: 一時エディタを開く
	const openClaudeInputEditorDisposable = vscode.commands.registerCommand('claude-editor-input.openClaudeInputEditor', async () => {
		try {
			// 1. claudeTerminalを探す（なければ開く）
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

			// 2. claudeTerminalを表示
			claudeTerminal.show();

			// 3. エディタを下に分割
			await vscode.commands.executeCommand('workbench.action.splitEditorDown');

			// 4. 新規で開いた下のエディタで一時ファイルを開く
			await createTemporaryEditorInSplit();
		} catch (error) {
			vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
		}
	});

	// Enterで送信コマンド
	const sendToClaudeTerminalDisposable = vscode.commands.registerTextEditorCommand('claude-editor-input.sendToClaudeTerminal', async (editor, edit) => {
		const document = editor.document;
		if (!isTemporaryDocument(document)) {
			return;
		}

		// 送信内容を取得
		let content = document.getText().replace(/<!--([\s\S]*?)-->/g, '').trim();

		if (!content) {
			vscode.window.showInformationMessage('Document was empty, nothing to send.');
			return;
		}

		await editor.edit(editBuilder => {
			editBuilder.replace(new vscode.Range(0, 0, document.lineCount, 0), '');
		});

		let claudeTerminal = findClaudeTerminal();

		if (!claudeTerminal) {
			vscode.window.showErrorMessage('Claude terminal not found. Please ensure the Claude extension is running.');
			return;
		}

		claudeTerminal.show();
		await new Promise(resolve => setTimeout(resolve, 100));
		// await vscode.commands.executeCommand('workbench.action.terminal.paste');
		claudeTerminal.sendText(content);
		claudeTerminal.sendText('');
	});

	context.subscriptions.push(openClaudeInputEditorDisposable, sendToClaudeTerminalDisposable, onTerminalCloseDisposable);
}

/**
 * Create and display a temporary Markdown editor in the split (下側)エディタ
 */
async function createTemporaryEditorInSplit(): Promise<void> {
	// Generate unique temporary file name
	const timestamp = Date.now();
	const fileName = `claude-input-${timestamp}.md`;
	const tmpFilePath = path.join(os.tmpdir(), fileName);

	// Create temporary file with placeholder comment
	const placeholder = `<!--Enter your prompt for Claude here. -->\n`;
	fs.writeFileSync(tmpFilePath, placeholder, 'utf8');

	// Open the temporary file
	const document = await vscode.workspace.openTextDocument(tmpFilePath);

	// 下側のエディタグループをアクティブにする
	await vscode.commands.executeCommand('workbench.action.focusBelowGroup');

	await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');
	await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');
	await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');
	await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');
	await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');

	// Show the document in editor and move cursor to line 2
	const editor = await vscode.window.showTextDocument(document, {
		preview: false,
		preserveFocus: false,
	});

	// Move cursor to line 2, column 1 (0-indexed)
	const position = new vscode.Position(1, 0);
	editor.selection = new vscode.Selection(position, position);

	// Track this document as temporary (after showing to avoid timing issues)
	tempDocumentUris.add(document.uri.toString());
	tempFilePaths.set(document.uri.toString(), tmpFilePath);
	tempDocumentOpenCount++;
}

/**
 * Check if a document is one of our temporary documents
 */
function isTemporaryDocument(document: vscode.TextDocument): boolean {
	return tempDocumentUris.has(document.uri.toString());
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
	];

	for (const terminal of terminals) {
		const name = terminal.name.toLowerCase();

		// Check if terminal name matches any Claude-related pattern
		if (claudePatterns.some(pattern => pattern.test(name))) {
			return terminal;
		}
	}

	return undefined;
}

// This method is called when your extension is deactivated
export function deactivate() {
	tempDocumentUris.clear();
	tempFilePaths.clear();
}
