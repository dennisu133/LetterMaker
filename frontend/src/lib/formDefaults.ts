import { todayLocalDate } from "@/lib/date";
import type { FormValues } from "@/lib/formSchema";
import { createDocFromText } from "@/lib/prosemirror";

export function createEmptyFormValues(): FormValues {
	return {
		mode: "manual",
		date: todayLocalDate(),
		subject: "",
		salutation: "",
		salutationComma: true,
		content: JSON.stringify(createDocFromText("")),
		closing: "",
		signature: "",
		senderName: "",
		senderAddress: "",
		recipientName: "",
		recipientAddress: ""
	};
}
