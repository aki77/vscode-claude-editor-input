import * as vscode from 'vscode';

// 画面サイズ情報のキャッシュ
let cachedScreenInfo: { height: number; decreaseCount: number } | null = null;

/**
 * 画面サイズに応じた適切なビューの縮小回数を取得する
 * @returns 縮小回数
 */
export async function getOptimalDecreaseCount(): Promise<number> {
	// キャッシュがある場合はそれを使用（パフォーマンス向上）
	if (cachedScreenInfo) {
		return cachedScreenInfo.decreaseCount;
	}

	return new Promise((resolve) => {
		const panel = vscode.window.createWebviewPanel(
			'screenDetector',
			'Screen Detector',
			{ viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
			{
				enableScripts: true,
				localResourceRoots: []
			}
		);

		// webviewのHTMLコンテンツ
		panel.webview.html = getWebviewContent();

		// webviewからのメッセージを受信
		panel.webview.onDidReceiveMessage(message => {
			if (message.command === 'screenInfo') {
				// 結果をキャッシュ
				cachedScreenInfo = {
					height: message.height,
					decreaseCount: message.decreaseCount
				};

				console.log('Screen size detected:', message);
				panel.dispose();
				resolve(message.decreaseCount);
			}
		});

		// タイムアウト処理（2秒で強制終了）
		setTimeout(() => {
			panel.dispose();
			resolve(5); // フォールバック値
		}, 2000);
	});
}

/**
 * キャッシュされた画面サイズ情報をクリアする
 */
export function clearScreenSizeCache(): void {
	cachedScreenInfo = null;
}

/**
 * webviewのHTMLコンテンツを生成する
 */
function getWebviewContent(): string {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Screen Size Detector</title>
			<style>
				body {
					margin: 0;
					padding: 0;
					display: none; /* 非表示 */
				}
			</style>
		</head>
		<body>
			<script>
				(function() {
					const vscode = acquireVsCodeApi();

					function calculateDecreaseCount() {
						const screenHeight = window.screen.availHeight;
						const pixelRatio = window.devicePixelRatio || 1;
						const effectiveHeight = screenHeight * pixelRatio;

						// 画面高さに基づく計算式
						let count = 3; // 最小値

						if (effectiveHeight >= 1800) {
							count = 5;
						} else if (effectiveHeight >= 1440) {
							count = 4;
						}

						return count;
					}

					// 画面サイズ情報を取得して送信
					const decreaseCount = calculateDecreaseCount();

					vscode.postMessage({
						command: 'screenInfo',
						height: window.screen.availHeight,
						width: window.screen.availWidth,
						pixelRatio: window.devicePixelRatio || 1,
						decreaseCount: decreaseCount,
						userAgent: navigator.userAgent
					});
				})();
			</script>
		</body>
		</html>
	`;
}
