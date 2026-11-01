# OD ちょっと便利

WordPress に、自分で使うための「ちょっと便利」な機能を追加していくプラグインです。
小さな機能をひとつのプラグインにまとめ、必要な機能だけを管理画面から有効にできます。

## 基本方針

- 各機能は独立させ、追加・変更する場所が分かりやすい構成にします。
- プラグイン専用の設定ページを WordPress 管理画面に用意します。
- 各機能の有効・無効は、設定ページのチェックボックスで管理します。
- 初回利用時は、すべての機能を有効にします。

## 設定画面

設定画面は WordPress 管理画面の「設定」内に「OD ちょっと便利」として追加します。
利用できる機能を一覧表示し、機能ごとのチェックボックスでオン・オフを切り替えられるようにします。

新しい機能を追加した場合も同じ設定画面に項目を追加し、初期状態はオンとします。

## 利用できる機能

### 条件付き更新日

ブロックエディターのインサーターに、グループブロックのバリエーション
「条件付き更新日」を追加します。このバリエーションには「更新：」ラベルと更新日が入り、
投稿日と更新日が同じ日付の場合はフロントエンドに出力されません。

個別投稿テンプレートなど、更新日を表示したい場所へ「条件付き更新日」を配置してください。
通常のグループブロックには影響しません。

### RichTextインライン属性

見出し、段落、リスト項目、ボタンなどのRichTextで文字列を選択し、ブロックツールバーの
「インライン属性」から、選択範囲を `<span>` で囲んで次の属性を設定できます。

- CSSクラス（複数指定可）
- `aria-hidden="true"`
- `aria-label`
- `lang`

既存の設定は同じ画面で編集・解除できます。すべての属性を空にして適用した場合は、
不要な `<span>` も削除されます。フロントエンド用のJavaScriptやCSSは読み込みません。

WordPressのFormat APIでは、下線などのコアフォーマットと区別するためにクラスが必要です。
そのため、属性を設定した `<span>` には識別用の `od-inline-attributes` クラスが付きます。
このクラスはエディター内で既存値を再編集するためだけに使用し、装飾CSSは定義しません。

`aria-hidden` と `aria-label` は同時に出力されません。装飾目的など、支援技術で読み上げる
必要がない文字に限って `aria-hidden` を使用してください。表示文字とは異なる読み上げ名が
必要な場合は `aria-label` を使用します。

利用例として、見出しの `01` を選択してCSSクラスに `heading-number` を指定し、
「支援技術から非表示」を有効にすると、次のHTMLが保存されます。

```html
<span class="od-inline-attributes heading-number" aria-hidden="true">01</span>
```

## ソースコードの構成

```text
od-chotto-benri.php                         プラグインの起動処理
includes/class-od-chotto-benri-plugin.php           共通サービスと機能の登録
includes/class-od-chotto-benri-feature-registry.php 機能の一覧管理と起動
includes/class-od-chotto-benri-settings.php         共通の設定画面と有効・無効判定
includes/features/<feature>/               機能ごとの PHP 実装
assets/js/<feature>.js                     機能ごとのエディター用スクリプト
src/                                      RichTextインライン属性のソースコード
build/                                    wp-scriptsで生成したエディター用ファイル
languages/                                 PHP・JavaScript用の翻訳ファイル
```

新しい機能は他の機能へ直接依存させず、機能別ディレクトリ内に実装します。
`OD_Chotto_Benri_Plugin::boot()` でメタデータと起動コールバックをレジストリへ登録すると、
共通設定画面へ自動的に項目が追加されます。

## 翻訳

コード内の翻訳対象文字列は英語を原文とし、日本語訳は `languages/` に保存します。
プラグイン名はロケールにかかわらず `OD Chotto Benri` と表示します。

- `od-chotto-benri.pot`: 翻訳テンプレート
- `od-chotto-benri-ja.po` / `.mo`: PHPで使用する日本語訳
- `od-chotto-benri-ja-<script-handle>.json`: JavaScriptで使用する日本語訳

`.po` を変更した場合は、次のコマンドで `.mo` を更新します。

```sh
msgfmt --check languages/od-chotto-benri-ja.po \
  -o languages/od-chotto-benri-ja.mo
```

## データの保存場所

プラグインの設定値は WordPress の Options API を使い、`wp_options` テーブルの
`od_chotto_benri_settings` オプションにまとめて保存します。独自のデータベーステーブルは作成しません。

オプションの値は、機能を識別するキーとオン・オフの状態を持つ連想配列とします。

```php
array(
	'feature_name' => true,
)
```

設定がまだ保存されていない場合や、新しい機能の設定値が存在しない場合は、その機能をオンとして扱います。
これにより、保存先と初期値の扱いを一箇所に集約します。

## 必要なもの

- Docker
- Node.js 18.12 以上
- npm 8.19.2 以上
- Composer 2
- PHP 7.4 以上

## セットアップ

```sh
npm install
composer install
npm run env:start
```

WordPress は <http://localhost:8888>、管理画面は
<http://localhost:8888/wp-admin> で開けます。wp-env の初期ログイン情報は
ユーザー名 `admin`、パスワード `password` です。

## コマンド

```sh
npm run env:start
npm run env:stop
npm run env:status
npm run env:logs
npm run env:cli -- plugin list
npm run start
npm run build
npm run lint:js
npm run test:unit
npm run lint:php
npm run format
composer format
```

RichTextインライン属性を開発するときは `npm run start` を実行し、配布用ファイルは
`npm run build` で `build/` に生成します。`npm run format` はJavaScriptを変更するため、
実行後に差分を確認してください。

`composer format` は PHP ファイルを書き換えるため、変更内容を確認してから実行してください。

## プラグインの更新

プラグインの更新には
[inc2734/wp-github-plugin-updater](https://github.com/inc2734/wp-github-plugin-updater)
を使用します。WordPress は `Olein-jp/od-chotto-benri` の最新 GitHub Release を確認し、
新しいバージョンがある場合は管理画面の「プラグイン」から更新できます。

### リリース方法

1. `od-chotto-benri.php` の `Version` と `OD_CHOTTO_BENRI_VERSION` を更新します。
2. 変更をコミットします。
3. バージョンと同じタグ（例: `0.2.0`）を作成して GitHub へプッシュします。

タグがプッシュされると GitHub Actions が本番用の Composer 依存をインストールし、
`vendor` ディレクトリを含む `od-chotto-benri.zip` を作成して GitHub Release に添付します。
管理画面からの更新には、この Release の ZIP が使用されます。

Release は `*.*.*` 形式のタグを対象とします。先頭に `v` を付けることもできます。
タグのバージョン、プラグインヘッダーの `Version`、`OD_CHOTTO_BENRI_VERSION` が
一致しない場合は、誤ったパッケージを公開しないように処理を停止します。

配布 ZIP にはプラグイン本体、README、実行に必要なファイル、本番用の `vendor` を含めます。
開発環境、GitHub Actions の設定、Node.js 関連ファイル、Composer の定義ファイルなどは
`.distignore` に従って除外します。

ローカルで動作確認する場合は、あらかじめ `composer install` を実行してください。

## 手書き風ボーダー

「設定 → OD Chotto Benri」の「手書き風ボーダー」で、機能全体を ON/OFF にできます。
既存の共通設定に登録しており、追加直後は ON です。各ブロックの装飾は初期状態では OFF です。
機能を OFF にすると専用 UI・JavaScript・CSS は読み込まれません。保存済みの属性や本文、
標準ボーダー設定は削除せず、再度 ON にすると復元できます。

グループ・カラム・個別カラム・unitone のデコレーターを選び、設定サイドバーの「手書き風ボーダー」を開いて有効にします。
ナチュラル・ラフ・ラウンド・スケッチ・ウェーブから選択でき、色、線幅（1〜8px、0.5px 刻み）、
揺らぎ（弱い・標準・強い）、再生成を設定できます。色のクリアと線幅の継承にも対応します。
テーマのパレットとカスタムカラー許可設定を利用し、プリセット色はスラッグとして保存します。

色・太さは「専用の明示値 → 標準ボーダー属性 → 計算済みのテーマ CSS → 文字色・2px」の順です。
四辺で異なる指定は上辺を代表値にします。専用設定以外の単位はブラウザーが計算した値へフォールバックします。
SVG は装飾レイヤーで、線はボックス内側の最大 10px の領域に描きます。内容が枠に近い場合は
ブロック標準の余白設定でパディングを加えてください。

SVG が生成された場合だけ通常のボーダーを透明化し、元の太さとレイアウトを維持します。
JavaScript が無効・失敗した場合は標準ボーダーを残し、ボーダー未設定時は outline を補います。
outline は専用のフォールバックです。独自 CSS の枠線・outline・強いクリッピングとの併用は個別確認が必要です。

### 対応ブロックを拡張する

既定の対象は `core/group`、`core/columns`、`core/column`、`unitone/decorator` です。
unitone が有効でない場合にも、プラグイン側で unitone を要求したり読み込んだりはしません。

`od_hdb_supported_blocks` はブロック名の配列を受け取り、同じ配列を PHP とエディターで共有します。
重複・不正名を除外し、空配列や配列以外の戻り値は全ブロック非対応として処理します。
未登録名でもエラーにはなりません。最初のブロック登録時に一覧を確定するため、
フィルターはプラグイン読み込み時、または `init` より前（テーマの `functions.php` など）に登録してください。

```php
add_filter( 'od_hdb_supported_blocks', function ( $blocks ) {
    $blocks[] = 'my-plugin/custom-card';
    return array_values( array_diff( $blocks, array( 'core/columns' ) ) );
} );
```

完全に置き換える場合は任意の配列を返してください。
複数ルート、独自のエディター DOM、再生成する DOM、特殊な要素を持つブロックは個別検証が必要です。
公開側は WordPress HTML API で先頭のコンテナー要素に識別情報を追加します。
独自 SVG ソースの入力や保存 HTML の変更は行いません。

### 実装と検証

- `includes/features/hand-drawn-border/`: 機能登録、共通属性定義、対応一覧、公開レンダリング。
- `src/hand-drawn-border/`: 共通エンジン、設定解決、監視、エディターと公開画面の入口。
- `assets/css/hand-drawn-border.css`: 装飾とフォールバック。
- `build/hand-drawn-border-*`: 既存の wp-scripts による配布ファイル。
- `tests/js/hand-drawn-border.test.js`: 5 パターン × 7 寸法、決定論、不正入力、色・太さ、50 要素と破棄。
- `tests/php/hand-drawn-border.php`: WordPress 上の登録・拡張フック・保存属性・設定 ON/OFF の検証。

```sh
npm run build
npm run test:unit -- --runInBand
npm run lint:js
composer lint
npm run env:cli -- eval-file wp-content/plugins/od-chotto-benri/tests/php/hand-drawn-border.php
```

描画は各辺を実寸に応じて区切り、法線方向へ変位した Bézier 曲線で生成します。
シードは有効化・再生成操作時だけ変更します。スケッチでは同じ乱数列から補助線を生成します。
ResizeObserver と requestAnimationFrame で更新をまとめ、色・太さだけの更新ではパスを再生成しません。
16px 未満の寸法は SVG を省略し、フォールバックを維持します。

使用 API は `register_block_type_args`、`blocks.registerBlockType`、`editor.BlockEdit`、
`editor.BlockListBlock`、`render_block`、`WP_HTML_Tag_Processor`、既存の Settings API です。
コアのブロック登録前に属性フィルターを設定するため、プラグインの起動優先度を `init:0` にしています。

今後の改善候補は、四辺個別設定、特殊なサードパーティーブロック向けの描画先指定、
動的に追加された公開 DOM への対応、ブラウザー別の継続的な画像差分検証です。

ブラウザー検証は、検証専用サイトを起動してから次のように実行します（下書きを作成し、機能設定を一時的に変更します）。

```sh
npx playwright install
OD_HDB_URL=http://localhost:8888 npm run test:e2e:hdb
```

`OD_HDB_OUTPUT` で結果画像の保存先を変更でき、`OD_HDB_WRITE_BASELINES=1` を指定すると
`tests/e2e/baselines/` の固定シード基準画像 35 枚を更新します。
画像差分の自動判定は未導入です。実装内容と実施済み・未実施の検証は
[検証レポート](docs/testing/hand-drawn-border.md) を参照してください。

機能全体を OFF にしたまま再編集・保存しても設定を保持するため、属性定義の登録だけは継続します。
専用 UI と描画用アセットは読み込みません。プラグインそのものを無効にしている間の再保存については、
WordPress が未知のブロック属性を保持することまでは保証できません。無効化だけで既存の本文を書き換える処理はありません。
