import { apiGet, API_URL, expect, lastItem, pick, test } from "./support";

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

for (const role of ["admin", "manager", "worker"] as const) {
	test.describe(`reservations as ${role}`, () => {
		test.use({ role });

		test("book, edit and cancel", async ({ page, request }) => {
			await page.goto("/reservations/add");
			await pick(page, "Select a vehicle");
			const dates = page.locator("input[type=date]");
			await dates.nth(0).fill(day(60));
			await dates.nth(1).fill(day(62));
			await page.getByRole("button", { name: "Create Reservation" }).click();
			await expect(page).toHaveURL(/\/reservations$/);

			const reservation = await lastItem(request, "/reservations/");
			expect(reservation.date_from.startsWith(day(60))).toBeTruthy();

			await page.goto(`/reservations/${reservation.id}/edit`);
			await page.locator("input[type=date]").nth(1).fill(day(65));
			await page.getByRole("button", { name: "Update Reservation" }).click();
			await expect(page).toHaveURL(/\/reservations$/);
			expect((await apiGet(request, `/reservations/${reservation.id}/`)).date_to.startsWith(day(65))).toBeTruthy();

			await page.goto(`/reservations/${reservation.id}`);
			await page.getByRole("button", { name: /Delete/ }).click();
			await expect(page).toHaveURL(/\/reservations$/);
			expect((await request.get(`${API_URL}/reservations/${reservation.id}/`)).status()).toBe(404);
		});
	});
}

test.describe("reservation lists", () => {
	test("the Upcoming tab matches the API", async ({ page, request }) => {
		const upcoming = await apiGet(request, "/reservations/upcoming/?size=1");
		await page.goto("/reservations");
		await page.getByRole("button", { name: "Upcoming" }).click();
		if (upcoming.total === 0) await expect(page.getByText(/No reservations/i)).toBeVisible();
		else await expect(page.getByRole("button", { name: /^View$/ }).first()).toBeVisible();
	});
});
