import { apiGet, API_URL, expect, test, uniq } from "./support";

test.describe("vehicles", () => {
	test("create, edit, search, open the fuel report and delete", async ({ page, request }) => {
		const plate = uniq("V").slice(0, 14);

		await page.goto("/vehicles/add");
		await page.locator("#registration_number").fill(plate);
		await page.locator("#brand").fill("Testbrand");
		await page.locator("#model").fill("Probe");
		await page.locator("#vin").fill(`VIN${plate}`.padEnd(17, "0").slice(0, 17));
		await page.locator("#id_number").fill(`ID-${plate}`);
		await page.locator("#production_year").fill("2021");
		await page.locator("#weight").fill("1800");
		await page.locator("#kilometrage").fill("1234");
		await page.locator("#company_id").selectOption({ index: 1 });
		await page.getByRole("button", { name: "Create Vehicle" }).click();
		await expect(page).toHaveURL(/\/vehicles$/);

		const vehicle = (await apiGet(request, `/vehicles/?search=${plate}`)).items[0];
		expect(vehicle).toMatchObject({ brand: "Testbrand", kilometrage: 1234 });

		// edit
		await page.goto(`/vehicles/${vehicle.id}/edit`);
		await expect(page.locator("#kilometrage")).toHaveValue("1234");
		await page.locator("#kilometrage").fill("5555");
		await page.locator("#availability").selectOption("service");
		await page.getByRole("button", { name: "Update Vehicle" }).click();
		await expect(page).toHaveURL(/\/vehicles$/);
		expect(await apiGet(request, `/vehicles/${vehicle.id}/`)).toMatchObject({ kilometrage: 5555, availability: "service" });

		// search and status filter in the list
		await page.goto("/vehicles");
		await page.getByPlaceholder("Search by registration or model").fill(plate);
		await expect(page.getByText(plate)).toBeVisible();
		await page.getByLabel("Filter by status").selectOption("available");
		await expect(page.getByText(plate)).toHaveCount(0);

		// detail with related records, fuel report is a PDF
		await page.goto(`/vehicles/${vehicle.id}`);
		await expect(page.getByText("Related Records")).toBeVisible();
		const report = await request.get(`${API_URL}/vehicles/${vehicle.id}/reports/fuel/`);
		expect(report.headers()["content-type"]).toBe("application/pdf");

		// delete
		await page.getByRole("button", { name: /Delete/ }).click();
		await expect(page).toHaveURL(/\/vehicles$/);
		expect((await request.get(`${API_URL}/vehicles/${vehicle.id}/`)).status()).toBe(404);
	});

	test("the VIN must have 17 characters", async ({ page }) => {
		await page.goto("/vehicles/add");
		await page.locator("#registration_number").fill("X1");
		await page.locator("#brand").fill("B");
		await page.locator("#model").fill("M");
		await page.locator("#vin").fill("SHORT");
		await page.locator("#id_number").fill("1");
		await page.locator("#weight").fill("1");
		await page.locator("#kilometrage").fill("1");
		await page.locator("#company_id").selectOption({ index: 1 });
		let created = false;
		page.on("request", (req) => {
			if (req.method() === "POST" && req.url().endsWith("/vehicles/")) created = true;
		});
		await page.getByRole("button", { name: "Create Vehicle" }).click();
		// the browser's own minLength validation stops the submit before it reaches the API
		expect(await page.locator("#vin").evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true);
		await expect(page).toHaveURL(/\/vehicles\/add$/);
		expect(created).toBe(false);
	});
});
