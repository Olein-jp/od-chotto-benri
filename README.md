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

## ソースコードの構成

```text
od-chotto-benri.php                         プラグインの起動処理
includes/class-od-chotto-benri-plugin.php           共通サービスと機能の登録
includes/class-od-chotto-benri-feature-registry.php 機能の一覧管理と起動
includes/class-od-chotto-benri-settings.php         共通の設定画面と有効・無効判定
includes/features/<feature>/               機能ごとの PHP 実装
assets/js/<feature>.js                     機能ごとのエディター用スクリプト
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
npm run lint:php
composer format
```

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
