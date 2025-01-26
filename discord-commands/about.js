import { SlashCommandBuilder, heading, unorderedList, hyperlink, inlineCode } from "discord.js";
import Sender from "../sender.js";
import packageJson from "../package.json" assert { type: "json" };

export const AboutCommand = {
	data: new SlashCommandBuilder().setName("about").setDescription("このbotについての情報を表示します。"),
	execute:
		async function (interaction) {
			const VERSION = packageJson.version;
			const SENDER = new Sender({ discord: heading("音MAD周辺配信通知bot バージョン" + VERSION, 1) + "\nMinegumo OtoSchedule, Version " + VERSION + "\n© 2024–2025 Bymnet1845 (Minegumo Productions)\n" + heading("リンク", 2) + "\n" + unorderedList([hyperlink("ウェブサイト", "https://otoschedule.otomad.net/"), hyperlink("ヘルプページ", "https://otoschedule.otomad.net/discord/help/"), hyperlink("利用規約", "https://otoschedule.otomad.net/discord/terms/"), hyperlink("私事保護方針", "https://otoschedule.otomad.net/discord/privacy-policy/"), hyperlink("GitHubリポジトリー", "https://github.com/Bymnet1845/otoschedule"), hyperlink("問い合わせ（要望／不具合報告）", "https://docs.google.com/forms/d/e/1FAIpQLSf81MP0DI14u2GZdlNSk_jbO_ndevim43Me2XGk96WSjetmxA/viewform")]) + "\n本家スプレッドシート「音MAD周辺配信表」へのリンクは" + inlineCode("/spreadsheets") + "コマンドで表示出来ます。\n" + heading("クレジット", 2) + "\n" + unorderedList(["企画／美術：1時", "開発／運用：Bymnet1845（イケダ）", "情報更新：1時、ジーテ、fumiya、新垣 結衣、イケダ、びえええ"]) }, []);
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction);
		},
};