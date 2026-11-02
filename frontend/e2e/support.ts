import { APIRequestContext, BrowserContext, expect, Page, test as base } from "@playwright/test";

export const API_URL = process.env.API_URL || "http://localhost:8000";

export const CREDENTIALS = {
	admin: { email: "admin@example.com", password: "FleetFlow1!" },
	manager: { email: "john.manager@logistics.com", password: "FleetFlow1!" },
	worker: { email: "sarah.driver@logistics.com", password: "FleetFlow1!" },
} as const;
export type Role = keyof typeof CREDENTIALS;

/** Sign in through the API; the cookie is shared with the browser context. */
export async function login(context: BrowserContext, role: Role) {
	const response = await context.request.post(`${API_URL}/users/login/`, { data: CREDENTIALS[role] });
	expect(response.ok(), `login as ${role}`).toBeTruthy();
	return (await response.json()).user as { id: number; name: string; email: string; role: string; company_id: number | null };
}

export const uniq = (prefix = "E2E") => `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export async function apiGet<T = any>(request: APIRequestContext, path: string): Promise<T> {
	const response = await request.get(`${API_URL}${path}`);
	expect(response.ok(), `GET ${path}`).toBeTruthy();
	return response.json();
}

/** Newest record of a collection: collections have no ordering parameter, so read every page and take the highest id. */
export async function lastItem<T = any>(request: APIRequestContext, path: string): Promise<T> {
	const separator = path.includes("?") ? "&" : "?";
	const items: any[] = [];
	for (let page = 1; ; page++) {
		const result = await apiGet(request, `${path}${separator}size=100&page=${page}`);
		items.push(...result.items);
		if (items.length >= result.total || result.items.length === 0) break;
	}
	return items.reduce((newest, item) => (item.id > newest.id ? item : newest));
}

/** Open a SearchableDropdown (by its current text) and choose the first option, or the one matching `option`. */
export async function pick(page: Page, current: string | RegExp, option?: string | RegExp) {
	await page.getByRole("button", { name: current }).click();
	const options = page.locator("div.max-h-60 button");
	await options.first().waitFor();
	await (option ? page.locator("div.max-h-60 button", { hasText: option }).first() : options.first()).click();
}

export async function expectToast(page: Page, text: string | RegExp) {
	await expect(page.getByText(text).first()).toBeVisible();
}

/** `test` with a signed-in page for the role given by `use({ role })` (defaults to admin). */
export const test = base.extend<{ role: Role }>({
	role: ["admin", { option: true }],
	request: async ({ context }, use) => {
		await use(context.request);
	},
	page: async ({ page, context, role }, use) => {
		await login(context, role);
		page.on("dialog", (dialog) => dialog.accept());
		await use(page);
	},
});
export { expect };
