import { apiGet, expect, lastItem, pick, test, uniq } from "./support";

for (const role of ["admin", "manager", "worker"] as const) {
	test.describe(`comments as ${role}`, () => {
		test.use({ role });

		test("create, edit (keeping the date), view and delete", async ({ page, request }) => {
			const text = uniq("comment");

			await page.goto("/comments/add");
			await page.getByPlaceholder("Write your comment...").fill(text);
			await pick(page, "Select a vehicle");
			await page.getByRole("button", { name: "Add Comment" }).click();
			await expect(page).toHaveURL(/\/comments$/);

			const comment = await lastItem(request, "/comments/");
			expect(comment.content).toBe(text);

			await page.goto(`/comments/${comment.id}/edit`);
			await page.getByPlaceholder("Write your comment...").fill(`${text} edited`);
			await page.getByRole("button", { name: "Update Comment" }).click();
			await expect(page).toHaveURL(/\/comments$/);
			const after = await apiGet(request, `/comments/${comment.id}/`);
			expect(after.content).toBe(`${text} edited`);
			expect(after.date).toBe(comment.date);

			await page.goto(`/comments/${comment.id}`);
			await expect(page.getByText(`${text} edited`)).toBeVisible();

			await page.getByRole("button", { name: "Delete" }).click();
			await expect(page).toHaveURL(/\/comments$/);
			expect((await request.get(`${process.env.API_URL || "http://localhost:8000"}/comments/${comment.id}/`)).status()).toBe(404);
		});
	});
}
