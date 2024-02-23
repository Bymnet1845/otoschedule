# 音スケジュール

「音MAD周辺配信表」の情報を基に、1日1回、音MAD周辺の生放送のスケジュールを複数のソーシャル・ネットワーキング・サービスに投稿するボット。

JavaScriptで書かれています。TypeScriptではありません。

## 対応サービス

- Bluesky
- Misskey
- ~~Twitter~~（対応予定？認証機構が面倒臭い。）

## 使用方法

1. Node.js（fetchが利用出来るバージョン。v20以上推奨？）を導入。
2. `npm install`等で必要なパッケージをインストール。
3. 「[example.env](example.env)」に必要事項を記入し、「.env」として保存。
4. 「[schedule_example.json](schedule_example.json)」を「schedule.json」として保存し、そのファイルにスケジュール情報を記入。
4. 投稿時刻にNode.jsで「[index.js](index.js)」を実行。

## 注意事項

Blueskyでは、拙作のカスタムフィード「音MAD」が動作しており、投稿に「音MAD」等の文字列が入るとフィードに拾われてしまう為、注意して下さい。

## 課題

- Twitter対応
- 例外処理
	- メンテナンス、例外処理等に依ってあるサービスのAPIでエラーが発生した場合、道連れで他のサービスへの投稿がされずに成ってしまうので、どうにかする。

## ライセンス

[LICENSE](LICENSE)を参照（MITライセンス）。

## リンク

- [Blueskyアカウント（@otoschedule.bsky.social）](https://bsky.app/profile/otoschedule.bsky.social)
- [Misskeyアカウント（@otoschedule@zadankai.club）](https://zadankai.club/@otoschedule)