import { apiGet, expect, lastItem, pick, test, uniq } from "./support";

test.describe("events", () => {
	test("create, view, edit, filter and delete", async ({ page, request }) => {
		const type = uniq("event");

		// create
		await page.goto("/events/add");
		await page.getByPlaceholder(/maintenance, repair/).fill(type);
		await page.getByPlaceholder("What happened?").fill("E2E created event");
		await page.getByPlaceholder("0.00").fill("99.5");
		await pick(page, "Select a vehicle");
		await expect(page.getByRole("button", { name: "Select a company" })).toHaveCount(0); // auto-filled from the vehicle
		await pick(page, "Select a supporting document");
		await page.getByRole("button", { name: "Add Event" }).click();
		await expect(page).toHaveURL(/\/events$/);

		const event = await lastItem(request, "/events/");
		expect(event).toMatchObject({ event_type: type, price: 99.5, description: "E2E created event" });

		// view
		await page.goto(`/events/${event.id}`);
		await expect(page.getByText("E2E created event")).toBeVisible();
		await expect(page.getByText(type)).toBeVisible();

		// edit
		await page.goto(`/events/${event.id}/edit`);
		await expect(page.getByPlaceholder("What happened?")).toHaveValue("E2E created event");
		await page.getByPlaceholder("What happened?").fill("E2E edited event");
		await page.getByPlaceholder("0.00").fill("");
		await page.getByRole("button", { name: "Update Event" }).click();
		await expect(page).toHaveURL(/\/events$/);
		expect(await apiGet(request, `/events/${event.id}/`)).toMatchObject({ description: "E2E edited event", price: null });

		// list filter by vehicle
		await page.goto(`/events?vehicle_id=${event.vehicle_id}`);
		await expect(page.getByText(type)).toBeVisible();

		// delete
		await page.goto(`/events/${event.id}`);
		await page.getByRole("button", { name: "Delete" }).click();
		await expect(page).toHaveURL(/\/events$/);
		expect((await request.get(`${process.env.API_URL || "http://localhost:8000"}/events/${event.id}/`)).status()).toBe(404);
	});

	test("validation messages appear and nothing is saved", async ({ page }) => {
		await page.goto("/events/add");
		await page.getByRole("button", { name: "Add Event" }).click();
		for (const message of ["Event type is required", "Description is required", "Vehicle is required", "Document is required"]) {
			await expect(page.getByText(message)).toBeVisible();
		}
		await expect(page).toHaveURL(/\/events\/add$/);
	});

	test("the vehicle page links to its events and starts new ones", async ({ page, request }) => {
		const vehicle = (await apiGet(request, "/vehicles/?size=1")).items[0];
		await page.goto(`/vehicles/${vehicle.id}`);
		await page.getByRole("button", { name: "Add event" }).click();
		await expect(page).toHaveURL(new RegExp(`/events/add\\?vehicle_id=${vehicle.id}$`));
		await expect(page.getByRole("button", { name: new RegExp(`${vehicle.registration_number}|Select a vehicle`) })).toBeVisible();
	});
});
