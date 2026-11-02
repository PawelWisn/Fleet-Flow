/// <reference types="vite/client" />
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../pageMocks")).pageApiMocks());
vi.mock("@/lib/api", () => {
	const reply = async () => {
		const { behavior } = await import("../pageMocks");
		if (behavior.fail) throw Object.assign(new Error("Request failed"), { response: { status: 500 } });
		return { data: {} };
	};
	const api = { get: vi.fn(reply), post: vi.fn(reply), put: vi.fn(reply), delete: vi.fn(reply) };
	return { api, default: api };
});

import { behavior } from "../pageMocks";
import { loginAs, setRoute } from "../state";

const modules = import.meta.glob("../../app/**/page.tsx");
// A stray, unrouted draft that is not part of the app
const routes = Object.entries(modules).filter(([file]) => !file.endsWith("page_new.tsx"));

const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 60)));

describe("every page renders", () => {
	it("has found the pages", () => {
		// 9 resources x4 (list/add/detail/edit) minus the ones that have no edit/detail + dashboard, login, profile, reports, settings
		expect(routes.length).toBeGreaterThanOrEqual(36);
	});

	beforeEach(() => {
		behavior.fail = false;
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});
	afterEach(() => {
		behavior.fail = false;
	});

	describe.each(["admin", "manager", "worker"] as const)("as %s", (role) => {
		describe.each([
			["with data", false],
			["when the API fails", true],
		])("%s", (_label, fail) => {
			it.each(routes)("%s", async (file, load) => {
				loginAs(role);
				behavior.fail = fail;
				setRoute({ params: { id: "1" } });
				const Page = ((await (load as () => Promise<unknown>)()) as { default: React.ComponentType }).default;

				const { container, unmount } = render(<Page />);
				await settle();

				expect(container.innerHTML.length).toBeGreaterThan(0);
				// leaked placeholders usually mean a field was read from the wrong place
				expect(container.textContent).not.toMatch(/NaN|undefined|\[object Object\]|Invalid Date/);
				unmount();
				expect(file).toMatch(/page\.tsx$/);
			});
		});
	});
});
