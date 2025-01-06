import * as dotenv from "dotenv";
import { SlashCommandBuilder, heading, unorderedList, hyperlink, inlineCode } from "discord.js";
import Sender from "../sender.js";
import packageJson from "../package.json" assert { type: "json" };

dotenv.config();

export const AboutCommand = {
	data: new SlashCommandBuilder().setName("about").setDescription("このbotについての情報を表示します。"),
	execute:
		async function (interaction) {
			const VERSION = packageJson.version;
			const SENDER = new Sender({ plain: heading("音MAD周辺配信通知bot バージョン" + VERSION, 1) + "\nMinegumo OtoSchedule Version " + VERSION + "\n© 2025 Bymnet1845 (Minegumo Productions)\n" + heading("リンク", 2) + "\n" + unorderedList([hyperlink("ウェブサイト", "https://otoschedule.otomad.net/"), hyperlink("ヘルプサイト", "https://otoschedule.otomad.net/help/"), hyperlink("GitHubリポジトリー", "https://github.com/Bymnet1845/otoschedule")]) + "\n本家スプレッドシート「音MAD周辺配信表」へのリンクは専用コマンド（" + inlineCode("/spreadsheets") + "）で表示出来ます。\n" + heading("クレジット", 2) + "\n" + unorderedList(["企画／美術：1時", "開発／運用：Bymnet1845（イケダ）", "情報更新：1時、ジーテ、fumiya、新垣 結衣、イケダ、びえええ"]) }, []);
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction);
		},
};