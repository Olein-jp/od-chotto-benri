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
