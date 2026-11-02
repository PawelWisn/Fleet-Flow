import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";

const interceptor = () => {
	const handlers = (api.interceptors.response as any).handlers.filter(Boolean);
	return handlers[0] as { fulfilled: (r: unknown) => unknown; rejected: (e: unknown) => Promise<unknown> };
};

const failure = (status: number, url = "/vehicles/") => ({ response: { status }, config: { url } });

function stubLocation(pathname: string) {
	const location = { href: "http://localhost/" + pathname.slice(1), pathname };
	vi.stubGlobal("location", location);
	return location;
}

describe("axios instance", () => {
	it("talks to the configured API with cookies", () => {
		expect(api.defaults.withCredentials).toBe(true);
		expect(api.defaults.headers["Content-Type"]).toBe("application/json");
		expect(api.defaults.baseURL).toBeTruthy();
	});

	it("passes successful responses through untouched", () => {
		const response = { data: 1 };
		expect(interceptor().fulfilled(response)).toBe(response);
	});
});

describe("401 handling", () => {
	beforeEach(() => vi.unstubAllGlobals());

	it("sends an expired session back to the login page, which lives at /", async () => {
		const location = stubLocation("/vehicles");
		await expect(interceptor().rejected(failure(401))).rejects.toBeDefined();
		expect(location.href).toBe("/");
	});

	it("does not redirect when the login request itself fails, so the form can show its error", async () => {
		const location = stubLocation("/");
		const before = location.href;
		await expect(interceptor().rejected(failure(401, "/users/login/"))).rejects.toBeDefined();
		expect(location.href).toBe(before);
	});

	it("does not reload the login page when already on it", async () => {
		const location = stubLocation("/");
		const before = location.href;
		await expect(interceptor().rejected(failure(401, "/users/me/"))).rejects.toBeDefined();
		expect(location.href).toBe(before);
	});

	it.each([400, 403, 404, 422, 500])("leaves %i errors to the caller", async (status) => {
		const location = stubLocation("/vehicles");
		const before = location.href;
		const error = failure(status);
		await expect(interceptor().rejected(error)).rejects.toBe(error);
		expect(location.href).toBe(before);
	});

	it("rethrows network errors that have no response", async () => {
		const error = new Error("Network Error");
		await expect(interceptor().rejected(error)).rejects.toBe(error);
	});
});
