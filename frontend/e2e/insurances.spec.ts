import { apiGet, expect, lastItem, pick, test, uniq } from "./support";

const stamp = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 16);

test.describe("insurances", () => {
	test("create, find under 'ending soon', edit, validate and delete", async ({ page, request }) => {
		const policy = uniq("POL");

		await page.goto("/insurances/add");
		await page.getByPlaceholder("Insurance company").fill("E2E Insurer");
		await page.getByPlaceholder("POL-0000").fill(policy);
		await page.getByPlaceholder("0.00").fill("500");
		await page.getByPlaceholder("Coverage details").fill("E2E policy");
		const dates = page.locator("input[type=datetime-local]");
		await dates.nth(0).fill(stamp(-100));
		await dates.nth(1).fill(stamp(10));
		await pick(page, "Select a vehicle");
		await pick(page, "Select the policy document");
		await page.getByRole("button", { name: "Add Insurance" }).click();
		await expect(page).toHaveURL(/\/insurances$/);

		const insurance = await lastItem(request, "/insurrances/");
		expect(insurance.policy_number).toBe(policy);

		// shows under "Ending soon" because it expires in 10 days
		await page.goto("/insurances");
		await page.getByRole("button", { name: "Ending soon" }).click();
		await expect(page.getByText(policy)).toBeVisible();

		// edit
		await page.goto(`/insurances/${insurance.id}/edit`);
		await page.getByPlaceholder("Coverage details").fill("E2E policy edited");
		await page.getByRole("combobox").selectOption("AC");
		await page.getByRole("button", { name: "Update Insurance" }).click();
		await expect(page).toHaveURL(/\/insurances$/);
		expect(await apiGet(request, `/insurrances/${insurance.id}/`)).toMatchObject({ description: "E2E policy edited", insurrance_type: "AC" });

		// validation: end before start
		await page.goto(`/insurances/${insurance.id}/edit`);
		await page.locator("input[type=datetime-local]").nth(1).fill(stamp(-200));
		await page.getByRole("button", { name: "Update Insurance" }).click();
		await expect(page.getByText("End date must be after the start date")).toBeVisible();

		// delete
		await page.goto(`/insurances/${insurance.id}`);
		await page.getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/insurances$/);
		expect((await request.get(`${process.env.API_URL || "http://localhost:8000"}/insurrances/${insurance.id}/`)).status()).toBe(404);
	});
});
