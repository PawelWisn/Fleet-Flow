import { apiGet, expect, test } from "./support";

test("dashboard numbers match the API", async ({ page, request }) => {
	const [vehicles, upcoming, finishing, available] = await Promise.all([
		apiGet(request, "/vehicles/?size=1"),
		apiGet(request, "/reservations/upcoming/?size=1"),
		apiGet(request, "/insurrances/finishing/?size=1"),
		apiGet(request, "/vehicles/?size=1&status=available"),
	]);

	await page.goto("/dashboard");
	const number = (label: string) => page.getByText(label, { exact: true }).locator("xpath=following-sibling::p");
	await expect(number("Total Vehicles")).toHaveText(String(vehicles.total));
	await expect(number("Available")).toHaveText(String(available.total));
	await expect(number("Upcoming Reservations")).toHaveText(String(upcoming.total));
	await expect(number("Insurances Ending Soon")).toHaveText(String(finishing.total));
});
