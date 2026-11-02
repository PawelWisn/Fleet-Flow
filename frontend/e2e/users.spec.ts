import { apiGet, API_URL, expect, test, uniq } from "./support";

test.describe("users as admin", () => {
	test("create, view, edit and delete a user", async ({ page, request }) => {
		const tag = uniq("user").toLowerCase();

		await page.goto("/users/add");
		await page.getByPlaceholder("Enter full name").fill(`E2E ${tag}`);
		await page.getByPlaceholder("user@example.com").fill(`${tag}@example.com`);
		await page.getByPlaceholder("Enter password").fill("FleetFlow1!");
		await page.getByPlaceholder("Confirm password").fill("FleetFlow1!");
		await page.getByRole("combobox").nth(1).selectOption({ index: 1 });
		await page.getByRole("button", { name: "Create User" }).click();
		await expect(page).toHaveURL(/\/users$/);

		const created = (await apiGet(request, `/users/?search=${tag}`)).items[0];
		expect(created.email).toBe(`${tag}@example.com`);

		// the detail endpoint exists and the page renders it
		await page.goto(`/users/${created.id}`);
		await expect(page.getByRole("heading", { name: `E2E ${tag}` })).toBeVisible();

		// edit without touching the password
		await page.goto(`/users/${created.id}/edit`);
		await expect(page.getByPlaceholder("Enter full name")).toHaveValue(`E2E ${tag}`);
		await page.getByPlaceholder("Enter full name").fill(`Edited ${tag}`);
		await page.getByPlaceholder("New password (optional)").fill("FleetFlow1!");
		await page.getByPlaceholder("Confirm new password").fill("FleetFlow1!");
		await page.getByRole("button", { name: "Update User" }).click();
		await expect(page).toHaveURL(/\/users$/);
		expect((await apiGet(request, `/users/${created.id}/`)).name).toBe(`Edited ${tag}`);

		// delete
		await page.goto(`/users/${created.id}`);
		await page.getByRole("button", { name: /Delete/ }).click();
		await expect(page).toHaveURL(/\/users$/);
		expect((await request.get(`${API_URL}/users/${created.id}/`)).status()).toBe(404);
	});

	test("the backend's password rules are reported", async ({ page }) => {
		await page.goto("/users/add");
		await page.getByPlaceholder("Enter full name").fill("Weak Password");
		await page.getByPlaceholder("user@example.com").fill(`${uniq("weak").toLowerCase()}@example.com`);
		await page.getByPlaceholder("Enter password").fill("alllowercase1");
		await page.getByPlaceholder("Confirm password").fill("alllowercase1");
		await page.getByRole("button", { name: "Create User" }).click();
		await expect(page.getByText(/uppercase/i)).toBeVisible();
		await expect(page).toHaveURL(/\/users\/add$/);
	});

	test("search and role filter narrow the list", async ({ page }) => {
		await page.goto("/users");
		await page.getByPlaceholder("Search users...").fill("sarah");
		await expect(page.getByText("sarah.driver@logistics.com")).toBeVisible();
		await page.getByPlaceholder("Search users...").fill("");
		await page.getByRole("combobox").first().selectOption("manager");
		await expect(page.getByText("john.manager@logistics.com")).toBeVisible();
		await expect(page.getByText("sarah.driver@logistics.com")).toHaveCount(0);
	});
});

test.describe("users as manager", () => {
	test.use({ role: "manager" });

	test("can see colleagues but not edit or delete them", async ({ page, request }) => {
		await page.goto("/users");
		await expect(page.getByText("sarah.driver@logistics.com")).toBeVisible();
		await expect(page.locator("button", { hasText: "Edit" })).toHaveCount(1); // only their own card

		const worker = (await apiGet(request, "/users/?search=sarah")).items[0];
		await page.goto(`/users/${worker.id}`);
		await expect(page.getByRole("heading", { name: worker.name })).toBeVisible();
		await expect(page.getByRole("button", { name: /Delete/ })).toHaveCount(0);
		expect((await request.delete(`${API_URL}/users/${worker.id}/`)).status()).toBe(403);
	});
});
