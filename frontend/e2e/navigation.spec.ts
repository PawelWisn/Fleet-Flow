import { expect, test } from "./support";

const ALL = ["Vehicles", "Reservations", "Refuels", "Events", "Insurances", "Comments", "Users", "Companies", "Documents", "Analytics", "Settings"];

const expectations = {
	admin: ALL,
	manager: ALL.filter((name) => name !== "Settings"),
	worker: ["Vehicles", "Reservations", "Refuels", "Events", "Insurances", "Comments", "Documents"],
} as const;

for (const role of ["admin", "manager", "worker"] as const) {
	test.describe(`as ${role}`, () => {
		test.use({ role });

		test("sees the right navigation", async ({ page }) => {
			await page.goto("/dashboard");
			const links = page.locator("div.lg\\:fixed nav a");
			await expect(links).toHaveText(expectations[role] as unknown as string[]);
		});

		test("every visible page opens without an error", async ({ page }) => {
			const problems: string[] = [];
			page.on("pageerror", (error) => problems.push(error.message));
			for (const name of expectations[role]) {
				await page.goto("/dashboard");
				await page.locator("div.lg\\:fixed nav a", { hasText: new RegExp(`^${name}$`) }).click();
				await page.waitForLoadState("networkidle");
				await expect(page.getByText(/Application error|Something went wrong/i)).toHaveCount(0);
			}
			expect(problems).toEqual([]);
		});
	});
}

test.describe("role guards", () => {
	test.use({ role: "worker" });

	for (const path of ["/users", "/companies", "/reports", "/settings"]) {
		test(`a worker is turned away from ${path}`, async ({ page }) => {
			await page.goto(path);
			await expect(page).toHaveURL(/\/dashboard$/);
		});
	}
});
