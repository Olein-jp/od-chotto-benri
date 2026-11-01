# 手書き風ボーダー 実装・検証レポート

検証日：2026年11月1日。仕様書 Final Specification v1.0 に基づく既存プラグインへの追加実装。

## 追加内容と組み込み

既存の機能レジストリに `hand-drawn-border` を登録した。
「設定 → OD Chotto Benri」に「手書き風ボーダー」の ON/OFF が自動追加される。
既存方針に従い機能全体は初期 ON、各ブロックの装飾は初期 OFF とする。
対応するグループ、カラム、個別カラムのインスペクターで以下を設定できる。

- 5 パターンの名前と SVG プレビュー。
- 色（テーマプリセット・カスタム色・継承）。カスタム色の許可はテーマ設定を参照する。
- 線幅（継承、または 1〜8px、0.5px 刻み）。
- 揺らぎ 0.5・1・1.5、再生成。

設定の保存先・管理画面・権限・nonce は既存の Settings API 実装を再利用する。
機能 OFF 中は UI、描画フック、専用スクリプト、CSS を登録しない。
属性定義だけは維持し、OFF 中の投稿再保存でも設定が失われないようにした。
独立ブロック・プラグイン・テーブルは作成していない。最低要件・バージョン・作者情報も維持した。

## 変更ファイル

- `od-chotto-benri.php`: 新クラスの読み込み、コアのブロック登録より早い `init:0` への起動変更。
- `includes/class-od-chotto-benri-plugin.php`: 機能登録と無効中の属性定義保持。
- `includes/features/hand-drawn-border/class-od-chotto-benri-hand-drawn-border-feature.php`: サーバー統合・検証・共通スキーマ・アセット管理。
- `src/hand-drawn-border/engine.js`: 実寸のパス生成、乱数、パターン。
- `src/hand-drawn-border/settings.js`: 色・線幅の検証と優先順位解決。
- `src/hand-drawn-border/renderer.js`: 共通描画、寸法監視、更新と破棄。
- `src/hand-drawn-border/editor.js`: インスペクターと編集プレビュー。
- `src/hand-drawn-border/view.js`: 公開側の初期化と切断要素の監視解除。
- `assets/js/hand-drawn-border-register.js`: `wp-blocks` より前のクライアント属性フィルター登録。
- `assets/css/hand-drawn-border.css`: 装飾、フォールバック、設定 UI。
- `build/hand-drawn-border-{editor,view}.{js,asset.php}`: 配布するビルド済みファイル。
- `webpack.config.js`: 既存エントリーに新しい 2 エントリーを追加。
- `package.json` / `package-lock.json`: hooks と Playwright の明示的な開発依存、E2E コマンド。
- `phpcs.xml.dist`: 仕様で指定された `od_hdb` プレフィックスの許可。
- `.distignore`: ビルド設定ファイルを配布物から除外。
- `languages/od-chotto-benri.pot`、`od-chotto-benri-ja.po`、`od-chotto-benri-ja.mo`、新機能の日本語 JSON: 日本語表示。
- `tests/js/hand-drawn-border.test.js`: エンジン・設定解決・50 要素のライフサイクル。
- `tests/php/hand-drawn-border.php`: WP-CLI から実行する統合検証。
- `tests/e2e/hand-drawn-border.cjs`: 3 エンジンでの保存・再編集・描画・設定切り替え。
- `tests/e2e/baselines/*.png`: 固定シード、5 パターン × 7 寸法の基準画像 35 枚。
- `README.md`、本レポート、`hand-drawn-border-browser-results.json`: 操作方法・制約・測定記録。

## WordPress API と登録順序

[公式 Block Filters](https://developer.wordpress.org/block-editor/reference-guides/filters/block-filters/) に従い、
`register_block_type_args`、`blocks.registerBlockType`、`editor.BlockEdit`、`editor.BlockListBlock`、
`render_block` を使用した。PHP で定義した属性スキーマと対応一覧を JavaScript に共有する。
クライアントの登録フィルターは専用スクリプトを `wp-blocks` の依存に追加して先に実行する。

公開時は [WP_HTML_Tag_Processor](https://developer.wordpress.org/reference/classes/wp_html_tag_processor/) を使い、
先頭の対応コンテナー要素に識別クラス・検証済み設定を付加する。保存 HTML 自体は変更しない。
SVG ソースや生成パスは投稿に保存しない。

標準 UI コンポーネント、`useSettings`、スクリプト翻訳、Options/Settings API を使用する。

## SVG エンジン

幅・高さを取得し、各辺を長さに応じて区切る。法線方向へ変位させた制御点から Bézier 曲線を生成する。
角の半径と振幅を短辺に合わせて制限し、線がボックス内に収まる余白を確保する。
固定 SVG の伸縮による描画は行わない。線には CSS 変数と non-scaling-stroke を利用する。

シード付き乱数で同条件の形状を固定する。シードは有効化・再生成操作時だけ更新する。
Natural、Rough、Rounded、Wavy はパラメーターと波形を変更し、Sketch は派生した補助線を加える。
1 辺の区切り数には上限を設けている。

編集・公開で同じエンジンと描画モジュールを使う。ResizeObserver で対象だけを監視し、
requestAnimationFrame で更新をまとめる。寸法・パターン・シード・揺らぎが同じならパスを再利用する。
色と線幅は CSS 変数のみを更新する。無効化・DOM からの除去・画面離脱で監視を解除する。
編集側は React のクラス更新に合わせて描画成功状態を保持する。

標準ボーダーの属性は削除しない。専用指定 → 標準属性（四辺個別では上辺）→ 最新の計算済み CSS →
文字色・2px の順に解決する。SVG 挿入成功時だけ標準の線を透明化し、元のボーダー寸法を維持する。
JavaScript 無効・エラー・極小サイズでは標準ボーダーまたは outline のフォールバックを維持する。

## 公開フック

`od_hdb_supported_blocks` の既定値は `core/group`、`core/columns`、`core/column`。
ブロック名形式を検証し、重複・不正値を除外する。空配列・非配列は全ブロック非対応とする。
未登録名でも致命的エラーを起こさない。

プラグイン読み込み時または `init` より前にフィルターを登録する。最初のブロック登録時に一覧を確定し、
属性登録・UI・プレビュー・公開レンダリングで共有する。通常のラッパーに対応しない独自ブロック用の
未検証 API は追加していない。描画先解決は `resolveTarget` に分離した。

## 実施済みの検証

- `npm run build`: 成功。既存の `build/index.js` と依存定義に差分なし。
- `npm run lint:js`: 成功。新しい登録用スクリプトも別途 lint 済み。
- `composer lint`: 全 8 PHP ファイルで成功。
- `npm run test:unit -- --runInBand`: 51 件成功。既存 RichText テスト 6 件を含む。
- WordPress 統合検証: 33 件成功。対応一覧の標準・追加・除外・重複・不正・空・未登録、実際のコア登録時点の属性、
  保存と復元、公開設定、安全な正規化、対象外への非干渉、設定値の ON/OFF 保存を確認。
- Chromium / Firefox / WebKit: 編集画面、下書き保存、ページ再読み込み後の属性とプレビュー、
  ブロック検証エラーなし、標準ボーダー抑制とブロック OFF による復帰、公開描画、リサイズ更新を確認。
- Chromium: JavaScript 無効時の標準ボーダー、オプション画面での OFF と専用出力・アセット停止、
  OFF 中の投稿再保存後の設定保持、ON への復帰を確認。
- 全 3 エンジンで 1・10・30・50 要素の SVG 数と ResizeObserver 数が対象数と一致。
  ページ離脱・再初期化を繰り返しても監視数が累積しないことを確認。
- 各エンジンの未処理 JavaScript エラーは 0 件。
- 固定シードの基準画像 35 枚を作成。主要な横長・縦長の画像と、5 パターンの比較画像を目視確認。

計測値は隣の JSON を参照。描画時間は 2 フレーム待機を含む確認用の経過時間であり、純粋なパス生成時間や
厳密なベンチマークではない。Chromium の JS ヒープ値はページ全体の参考値であり、新機能だけのメモリ量ではない。
Firefox / WebKit のヒープ値は取得していない。

## 制約・未実施事項と改善候補

- 検証環境は WordPress 7.1.4 / PHP 8.3.36。最低要件の WordPress 6.5 / PHP 7.4 での実機検証は未実施。
- Chrome/Safari 製品版そのものではなく Playwright の Chromium/Firefox/WebKit を使用した。
- 画像は基準資料として保存している。画像差分による自動合否判定は未導入。
- 複製、コピー、同期パターン、テンプレートに使用する属性と保存形式は共通だが、それぞれの UI 操作を通した網羅検証は未実施。
- サードパーティー製ブロックの登録一覧と属性処理は統合検証したが、実在する全ブロックの DOM 互換性は保証しない。
  複数ルート、特殊な編集ラッパー、クリッピング、DOM 再生成には追加確認が必要。
- 四辺別の色・太さ・線種を完全再現しない。専用設定または上辺の代表値を使う。
- 16px 未満は SVG を省略する。線は内側の領域に描くため、本文が端に接する場合はブロック標準の余白を加える。
- 独自 CSS の outline や、サーバー属性・テーマ設定から判定できない標準枠線ではフォールバックの重複があり得る。
- ネスト・背景画像・影などの全組み合わせについて、実サイトのテーマでの網羅的な見た目の確認は未実施。
- 公開後に新しく追加された DOM の自動初期化は未対応。取り除かれた対象の監視は解除する。
- プラグインそのものの無効化は投稿を改変しないが、無効中の再保存で未知の属性が保持される保証はない。
- 将来は画像差分の継続テスト、対応最小バージョンの CI、四辺個別設定、特殊ラッパーの描画先指定、
  公開 DOM の追加対応を検討できる。
