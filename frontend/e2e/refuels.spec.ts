import { apiGet, API_URL, expect, lastItem, pick, test, uniq } from "./support";

for (const role of ["admin", "manager", "worker"] as const) {
	test.describe(`refuels as ${role}`, () => {
		test.use({ role });

		test("create, view (price per liter), edit and delete", async ({ page, request }) => {
			const station = uniq("Stn").slice(0, 20);

			await page.goto("/refuels/add");
			await pick(page, "Select a vehicle");
			await pick(page, "Select a document");
			await page.getByPlaceholder("0.00").nth(0).fill("40");
			await page.getByPlaceholder("0.00").nth(1).fill("260");
			await page.getByPlaceholder("0", { exact: true }).fill("12345");
			await page.getByPlaceholder(/gas station/i).fill(station);
			await page.getByRole("button", { name: "Add Refuel" }).click();
			await expect(page).toHaveURL(/\/refuels$/);

			const refuel = await lastItem(request, "/refuels/");
			expect(refuel.gas_station).toBe(station);

			await page.goto(`/refuels/${refuel.id}`);
			await expect(page.getByText(station)).toBeVisible();
			await expect(page.getByText("$6.50/L")).toBeVisible();

			await page.goto(`/refuels/${refuel.id}/edit`);
			await page.getByPlaceholder(/gas station/i).fill(`${station}2`);
			await page.getByRole("button", { name: "Update Refuel" }).click();
			await expect(page).toHaveURL(/\/refuels$/);
			expect((await apiGet(request, `/refuels/${refuel.id}/`)).gas_station).toBe(`${station}2`);

			await page.goto(`/refuels/${refuel.id}`);
			await page.getByRole("button", { name: /Delete/ }).click();
			await expect(page).toHaveURL(/\/refuels$/);
			expect((await request.get(`${API_URL}/refuels/${refuel.id}/`)).status()).toBe(404);
		});
	});
}

test("searching refuels with no match shows the empty state", async ({ page }) => {
	await page.goto("/refuels");
	await page.getByPlaceholder(/Search by vehicle brand/).fill("zzzz-no-match");
	await expect(page.getByText("No refuel records")).toBeVisible();
});
