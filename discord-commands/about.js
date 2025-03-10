import { SlashCommandBuilder } from "discord.js";
import Sender from "../sender.js";
import packageJson from "../package.json" assert { type: "json" };

export const AboutCommand = {
	data: new SlashCommandBuilder().setName("about").setDescription("このbotについての情報を表示します。"),
	execute:
		async function (interaction) {
			const VERSION = packageJson.version;
			const SENDER = new Sender({ discord: "# 音MAD周辺配信通知bot バージョン" + VERSION + "\nMinegumo OtoSchedule, Version " + VERSION + "\n© 2024–2025 Bymnet1845 (Minegumo Productions)\n## リンク\n- [ウェブサイト](<https://otoschedule.otomad.net/>)\n- [ヘルプページ](<https://otoschedule.otomad.net/discord/help/>)\n- [利用規約](<https://otoschedule.otomad.net/discord/terms/>)\n- [私事保護方針](<https://otoschedule.otomad.net/discord/privacy-policy/>)\n- [GitHubリポジトリー](<https://github.com/Bymnet1845/otoschedule>)\n- [問い合わせ（要望／不具合報告）](<https://docs.google.com/forms/d/e/1FAIpQLSf81MP0DI14u2GZdlNSk_jbO_ndevim43Me2XGk96WSjetmxA/viewform>)\n本家スプレッドシート「音MAD周辺配信表」へのリンクは`/spreadsheets`コマンドで表示出来ます。\n## クレジット\n- 企画／美術：1時\n- 開発／運用：Bymnet1845（イケダ）\n- 情報更新：ジーテ、fumiya、新垣 結衣、イケダ、びえええ" }, []);
			SENDER.setDiscordOption();
			SENDER.replyToDiscord(interaction);
		},
};