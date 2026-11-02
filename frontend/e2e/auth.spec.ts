import { expect, test } from "@playwright/test";
import { CREDENTIALS } from "./support";

test.describe("authentication", () => {
	test("signs in and lands on the dashboard", async ({ page }) => {
		await page.goto("/");
		await page.getByPlaceholder("Enter your email").fill(CREDENTIALS.admin.email);
		await page.getByPlaceholder("Enter your password").fill(CREDENTIALS.admin.password);
		await page.getByRole("button", { name: /sign in/i }).click();

		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByText("Total Vehicles")).toBeVisible();
	});

	test("a wrong password keeps you on the login form with an error (not on a 404 page)", async ({ page }) => {
		await page.goto("/");
		await page.getByPlaceholder("Enter your email").fill(CREDENTIALS.admin.email);
		await page.getByPlaceholder("Enter your password").fill("definitely-wrong");
		await page.getByRole("button", { name: /sign in/i }).click();

		await expect(page.getByText("Invalid email or password")).toBeVisible();
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByPlaceholder("Enter your email")).toBeVisible();
	});

	test("protected pages send visitors without a session to the login page", async ({ page }) => {
		await page.goto("/vehicles");
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByPlaceholder("Enter your email")).toBeVisible();
	});

	test("signing out ends the session", async ({ page }) => {
		await page.goto("/");
		await page.getByPlaceholder("Enter your email").fill(CREDENTIALS.manager.email);
		await page.getByPlaceholder("Enter your password").fill(CREDENTIALS.manager.password);
		await page.getByRole("button", { name: /sign in/i }).click();
		await expect(page).toHaveURL(/\/dashboard$/);

		await page.locator("button:has(svg.h-8.w-8)").click();
		await page.getByText("Sign out").click();

		await expect(page).toHaveURL(/\/$/);
		await page.goto("/vehicles");
		await expect(page).toHaveURL(/\/$/);
	});
});
