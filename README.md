# OD ちょっと便利

WordPress をちょっと便利にするためのプラグインです。

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
