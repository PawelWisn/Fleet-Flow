import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
	vehiclesApi: { getAll: vi.fn() },
	usersApi: { getAll: vi.fn() },
	documentsApi: { getAll: vi.fn() },
	companiesApi: { getAll: vi.fn() },
}));

import { companiesApi, documentsApi, usersApi, vehiclesApi } from "@/services/api";
import {
	formatCurrency,
	formatDate,
	formatDateTime,
	searchCompanies,
	searchDocuments,
	searchUsers,
	searchVehicles,
	toDateTimeInput,
	userLabel,
	vehicleLabel,
} from "@/components/relationSearch";

const page = (items: unknown[], pageNo = 1, pages = 1) => ({ items, total: items.length, page: pageNo, size: 20, pages });

describe.each([
	["vehicles", searchVehicles, vehiclesApi],
	["users", searchUsers, usersApi],
	["documents", searchDocuments, documentsApi],
	["companies", searchCompanies, companiesApi],
])("search %s", (_name, search, api) => {
	beforeEach(() => {
		vi.mocked(api.getAll).mockReset();
	});

	it("requests a 20 item page and omits an empty search term", async () => {
		vi.mocked(api.getAll).mockResolvedValue(page([{ id: 1 }]) as any);
		await search("", 1);
		expect(api.getAll).toHaveBeenCalledWith({ page: 1, size: 20 });
	});

	it("forwards the search term and page", async () => {
		vi.mocked(api.getAll).mockResolvedValue(page([], 3, 5) as any);
		await search("ford", 3);
		expect(api.getAll).toHaveBeenCalledWith({ page: 3, size: 20, search: "ford" });
	});

	it("reports whether more pages exist", async () => {
		vi.mocked(api.getAll).mockResolvedValueOnce(page([{ id: 1 }], 1, 2) as any);
		expect((await search("", 1)).hasMore).toBe(true);
		vi.mocked(api.getAll).mockResolvedValueOnce(page([{ id: 1 }], 2, 2) as any);
		expect((await search("", 2)).hasMore).toBe(false);
	});

	it("tolerates a response without items", async () => {
		vi.mocked(api.getAll).mockResolvedValue({ page: 1, pages: 1 } as any);
		expect((await search("", 1)).items).toEqual([]);
	});
});

describe("labels and formatters", () => {
	it("labels vehicles and users", () => {
		expect(vehicleLabel({ registration_number: "AB 123", brand: "Ford", model: "Transit" })).toBe("AB 123 - Ford Transit");
		expect(userLabel({ name: "Ann", email: "ann@example.com" })).toBe("Ann (ann@example.com)");
	});

	it("formats dates and falls back to a dash for empty values", () => {
		expect(formatDate("2026-03-05T10:00:00")).toBe("Mar 5, 2026");
		expect(formatDate(null)).toBe("-");
		expect(formatDate(undefined)).toBe("-");
		expect(formatDateTime("2026-03-05T14:30:00")).toMatch(/Mar 5, 2026.*2:30/);
		expect(formatDateTime("")).toBe("-");
	});

	it("formats currency, keeping zero but not missing values", () => {
		expect(formatCurrency(1234.5)).toBe("$1,234.50");
		expect(formatCurrency(0)).toBe("$0.00");
		expect(formatCurrency(null)).toBe("-");
		expect(formatCurrency(undefined)).toBe("-");
	});

	it("trims API datetimes for <input type=datetime-local>", () => {
		expect(toDateTimeInput("2026-10-16T13:38:43.618483")).toBe("2026-10-16T13:38");
		expect(toDateTimeInput(null)).toBe("");
		expect(toDateTimeInput(undefined)).toBe("");
	});
});
