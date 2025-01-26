import { format } from "date-fns";

export default function outputLog(text, type = "normal") {
	console.log(format(Date.now(), "[yyyy-MM-dd HH:mm:ss.SSS]"));

	switch (type) {
		case "error": console.error(text); break;
		default: console.log(text);
	}
}