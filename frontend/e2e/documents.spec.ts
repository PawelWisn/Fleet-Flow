import { apiGet, API_URL, expect, pick, test, uniq } from "./support";

test.describe("documents", () => {
	test("upload, download, replace the file, edit and delete", async ({ page, request }) => {
		const title = uniq("Doc");

		await page.goto("/documents/add");
		await page.getByPlaceholder("Document title").fill(title);
		await page.getByRole("combobox").selectOption("manual");
		await page.getByPlaceholder("Document description...").fill("E2E document");
		await pick(page, "Select a vehicle");
		await page.setInputFiles("input[type=file]", { name: "hello.txt", mimeType: "text/plain", buffer: Buffer.from("hello e2e") });
		await page.getByRole("button", { name: /Create Document/ }).click();
		await expect(page).toHaveURL(/\/documents$/);

		const document = (await apiGet(request, `/documents/?search=${title}`)).items[0];
		expect(document.file_size).toBe(9); // the stored file is not empty

		const download = await request.get(`${API_URL}/documents/${document.id}/download`);
		expect(await download.text()).toBe("hello e2e");

		// replace the file
		await page.goto(`/documents/${document.id}/edit`);
		await page.setInputFiles("input[type=file]", { name: "new.txt", mimeType: "text/plain", buffer: Buffer.from("replacement") });
		await page.locator("input[placeholder='Document title']").fill(`${title} edited`);
		await page.getByRole("button", { name: /Update Document/ }).click();
		await expect(page).toHaveURL(/\/documents$/);
		const updated = await apiGet(request, `/documents/${document.id}/`);
		expect(updated.title).toBe(`${title} edited`);
		expect(await (await request.get(`${API_URL}/documents/${document.id}/download`)).text()).toBe("replacement");

		// the list offers a download
		await page.getByPlaceholder(/Search by title/).fill(title);
		const [saved] = await Promise.all([page.waitForEvent("download"), page.getByTitle("Download file").locator("visible=true").first().click()]);
		expect(saved.suggestedFilename()).toBe(`${title} edited.txt`);

		await page.goto(`/documents/${document.id}`);
		await page.getByRole("button", { name: /Delete/ }).click();
		await expect(page).toHaveURL(/\/documents$/);
		expect((await request.get(`${API_URL}/documents/${document.id}/`)).status()).toBe(404);
	});

	test("files with a disallowed extension are refused", async ({ page }) => {
		await page.goto("/documents/add");
		await page.getByPlaceholder("Document title").fill(uniq("Bad"));
		await page.getByRole("combobox").selectOption("other");
		await page.getByPlaceholder("Document description...").fill("bad file");
		await pick(page, "Select a vehicle");
		await page.setInputFiles("input[type=file]", { name: "virus.exe", mimeType: "application/octet-stream", buffer: Buffer.from("x") });
		await page.getByRole("button", { name: /Create Document/ }).click();
		await expect(page.getByText(/Invalid document data/)).toBeVisible();
		await expect(page).toHaveURL(/\/documents\/add$/);
	});
});
