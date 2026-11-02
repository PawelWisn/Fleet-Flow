/** Turns an axios error from the backend into a readable message (detail may be a string or a list of validation errors). */
export function getErrorMessage(error: any, fallback: string): string {
	const detail = error?.response?.data?.detail;
	if (typeof detail === "string") return detail;
	if (Array.isArray(detail) && detail.length > 0) {
		return detail
			.map((item: any) => {
				const field = Array.isArray(item.loc) ? item.loc.filter((part: any) => part !== "body").join(".") : "";
				return field ? `${field}: ${item.msg}` : item.msg;
			})
			.join("; ");
	}
	return fallback;
}
