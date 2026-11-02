import { apiGet, API_URL, expect, test, uniq } from "./support";

test.describe("companies", () => {
	test("create, edit (keeping hidden fields), search and delete", async ({ page, request }) => {
		const name = uniq("Company");

		await page.goto("/companies/add");
		await page.locator("#name").fill(name);
		await page.locator("#nip").fill("1234567890");
		await page.locator("#address1").fill("Test St 1");
		await page.locator("#city").fill("Warsaw");
		await page.locator("#post_code").fill("00-001");
		await page.locator("#country").fill("Poland");
		await page.getByRole("button", { name: "Create Company" }).click();
		await expect(page).toHaveURL(/\/companies$/);

		const company = (await apiGet(request, `/companies/?search=${name}`)).items[0];
		// give it a description/phone through the API: the form cannot edit them but must not wipe them
		await request.put(`${API_URL}/companies/${company.id}/`, { data: { ...company, description: "Keep me", phone: "555" } });

		await page.goto(`/companies/${company.id}/edit`);
		await page.locator("#city").fill("Krakow");
		await page.getByRole("button", { name: "Update Company" }).click();
		await expect(page).toHaveURL(/\/companies$/);
		expect(await apiGet(request, `/companies/${company.id}/`)).toMatchObject({ city: "Krakow", description: "Keep me", phone: "555" });

		await page.goto("/companies");
		await page.getByPlaceholder(/Search companies/).fill(name);
		await expect(page.getByText(name)).toBeVisible();

		await page.goto(`/companies/${company.id}`);
		await page.getByRole("button", { name: /Delete/ }).click();
		await expect(page).toHaveURL(/\/companies$/);
		expect((await request.get(`${API_URL}/companies/${company.id}/`)).status()).toBe(404);
	});

	test("the NIP field only takes digits", async ({ page }) => {
		await page.goto("/companies/add");
		await page.locator("#nip").fill("12ab34-56");
		await expect(page.locator("#nip")).toHaveValue("123456");
	});
});
