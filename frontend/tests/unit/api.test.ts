import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => {
	const api = { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() };
	return { api, default: api };
});

import { api } from "@/lib/api";
import {
	commentsApi,
	companiesApi,
	documentsApi,
	eventsApi,
	insuranceApi,
	refuelsApi,
	reportsApi,
	reservationsApi,
	usersApi,
	vehiclesApi,
} from "@/services/api";

const http = vi.mocked(api);
const payload = { some: "data" } as any;

beforeEach(() => {
	for (const fn of Object.values(http)) fn.mockReset().mockResolvedValue({ data: "response-body" });
});

// [name, call, method, url, expected arguments after the url]
const cases: [string, () => Promise<unknown>, "get" | "post" | "put" | "delete", string, unknown[]][] = [
	["users.getAll", () => usersApi.getAll({ page: 2, role: "worker" }), "get", "/users/", [{ params: { page: 2, role: "worker" } }]],
	["users.getById", () => usersApi.getById(5), "get", "/users/5/", []],
	["users.getCurrentUser", () => usersApi.getCurrentUser(), "get", "/users/me/", []],
	["users.create", () => usersApi.create(payload), "post", "/users/", [payload]],
	["users.update", () => usersApi.update(5, payload), "put", "/users/5/", [payload]],
	["users.delete", () => usersApi.delete(5), "delete", "/users/5/", []],

	["vehicles.getAll", () => vehiclesApi.getAll({ search: "ford", status: "in use" }), "get", "/vehicles/", [{ params: { search: "ford", status: "in use" } }]],
	["vehicles.getById", () => vehiclesApi.getById(7), "get", "/vehicles/7/", []],
	["vehicles.create", () => vehiclesApi.create(payload), "post", "/vehicles/", [payload]],
	["vehicles.update", () => vehiclesApi.update(7, payload), "put", "/vehicles/7/", [payload]],
	["vehicles.delete", () => vehiclesApi.delete(7), "delete", "/vehicles/7/", []],
	["vehicles.getAvailable", () => vehiclesApi.getAvailable(), "get", "/vehicles/", [{ params: { status: "available" } }]],
	["vehicles.getFuelReport", () => vehiclesApi.getFuelReport(7), "get", "/vehicles/7/reports/fuel/", [{ responseType: "blob" }]],

	["companies.getAll", () => companiesApi.getAll({ search: "alpha" }), "get", "/companies/", [{ params: { search: "alpha" } }]],
	["companies.getById", () => companiesApi.getById(3), "get", "/companies/3/", []],
	["companies.create", () => companiesApi.create(payload), "post", "/companies/", [payload]],
	["companies.update", () => companiesApi.update(3, payload), "put", "/companies/3/", [payload]],
	["companies.delete", () => companiesApi.delete(3), "delete", "/companies/3/", []],

	["reservations.getAll", () => reservationsApi.getAll({ vehicle_id: 1, user_id: 2 }), "get", "/reservations/", [{ params: { vehicle_id: 1, user_id: 2 } }]],
	["reservations.getUpcoming", () => reservationsApi.getUpcoming({ size: 1 }), "get", "/reservations/upcoming/", [{ params: { size: 1 } }]],
	["reservations.getById", () => reservationsApi.getById(4), "get", "/reservations/4/", []],
	["reservations.create", () => reservationsApi.create(payload), "post", "/reservations/", [payload]],
	["reservations.update", () => reservationsApi.update(4, payload), "put", "/reservations/4/", [payload]],
	["reservations.delete", () => reservationsApi.delete(4), "delete", "/reservations/4/", []],

	["refuels.getAll", () => refuelsApi.getAll({ search: "ann" }), "get", "/refuels/", [{ params: { search: "ann" } }]],
	["refuels.getById", () => refuelsApi.getById(8), "get", "/refuels/8/", []],
	["refuels.create", () => refuelsApi.create(payload), "post", "/refuels/", [payload]],
	["refuels.update", () => refuelsApi.update(8, payload), "put", "/refuels/8/", [payload]],
	["refuels.delete", () => refuelsApi.delete(8), "delete", "/refuels/8/", []],

	["events.getAll", () => eventsApi.getAll({ vehicle_id: 1, document_id: 2, company_id: 3 }), "get", "/events/", [{ params: { vehicle_id: 1, document_id: 2, company_id: 3 } }]],
	["events.getById", () => eventsApi.getById(9), "get", "/events/9/", []],
	["events.create", () => eventsApi.create(payload), "post", "/events/", [payload]],
	["events.update", () => eventsApi.update(9, payload), "put", "/events/9/", [payload]],
	["events.delete", () => eventsApi.delete(9), "delete", "/events/9/", []],

	// The backend router is spelled "insurrances"
	["insurance.getAll", () => insuranceApi.getAll({ vehicle_id: 1 }), "get", "/insurrances/", [{ params: { vehicle_id: 1 } }]],
	["insurance.getFinishing", () => insuranceApi.getFinishing({ size: 1 }), "get", "/insurrances/finishing/", [{ params: { size: 1 } }]],
	["insurance.getById", () => insuranceApi.getById(6), "get", "/insurrances/6/", []],
	["insurance.create", () => insuranceApi.create(payload), "post", "/insurrances/", [payload]],
	["insurance.update", () => insuranceApi.update(6, payload), "put", "/insurrances/6/", [payload]],
	["insurance.delete", () => insuranceApi.delete(6), "delete", "/insurrances/6/", []],

	["comments.getAll", () => commentsApi.getAll({ vehicle_id: 1, user_id: 2 }), "get", "/comments/", [{ params: { vehicle_id: 1, user_id: 2 } }]],
	["comments.getById", () => commentsApi.getById(11), "get", "/comments/11/", []],
	["comments.create", () => commentsApi.create(payload), "post", "/comments/", [payload]],
	["comments.update", () => commentsApi.update(11, payload), "put", "/comments/11/", [payload]],
	["comments.delete", () => commentsApi.delete(11), "delete", "/comments/11/", []],

	["documents.getAll", () => documentsApi.getAll({ search: "x", document_type: "manual" }), "get", "/documents/", [{ params: { search: "x", document_type: "manual" } }]],
	["documents.getById", () => documentsApi.getById(12), "get", "/documents/12/", []],
	["documents.delete", () => documentsApi.delete(12), "delete", "/documents/12/", []],
	["documents.download", () => documentsApi.download(12), "get", "/documents/12/download", [{ responseType: "blob" }]],

	["reports.getFuelStats", () => reportsApi.getFuelStats(), "get", "/refuels/stats/", []],
	["reports.getVehicleFuelReport", () => reportsApi.getVehicleFuelReport(7), "get", "/vehicles/7/reports/fuel/", [{ responseType: "blob", headers: { Accept: "application/pdf" } }]],
];

describe("API client", () => {
	it.each(cases)("%s", async (_name, call, method, url, rest) => {
		const result = await call();

		expect(http[method]).toHaveBeenCalledTimes(1);
		expect(http[method]).toHaveBeenCalledWith(url, ...rest);
		expect(result).toBe("response-body");
	});

	it("propagates failures to the caller", async () => {
		http.get.mockRejectedValue(new Error("network down"));
		await expect(vehiclesApi.getById(1)).rejects.toThrow("network down");
	});
});

describe("documents (multipart)", () => {
	const lastForm = (method: "post" | "put") => http[method].mock.calls[0][1] as FormData;

	it("creates with every field and the file", async () => {
		const file = new File(["hello"], "doc.pdf", { type: "application/pdf" });
		await documentsApi.create({ title: "T", description: "D", file_type: "manual", vehicle_id: 3, user_id: 4, file });

		expect(http.post).toHaveBeenCalledWith("/documents/", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } });
		const form = lastForm("post");
		expect(Object.fromEntries(form.entries())).toMatchObject({ title: "T", description: "D", file_type: "manual", vehicle_id: "3", user_id: "4" });
		expect((form.get("file") as File).name).toBe("doc.pdf");
	});

	it("creates without a file", async () => {
		await documentsApi.create({ title: "T", description: "", file_type: "other", vehicle_id: 1, user_id: 1 });
		expect(lastForm("post").has("file")).toBe(false);
	});

	it("updates only the fields that were provided", async () => {
		await documentsApi.update(12, { title: "New" });
		const form = lastForm("put");
		expect([...form.keys()]).toEqual(["title"]);
		expect(http.put.mock.calls[0][0]).toBe("/documents/12/");
	});

	it("sends an empty description (clearing it is a valid update)", async () => {
		await documentsApi.update(12, { description: "" });
		expect(lastForm("put").get("description")).toBe("");
	});

	it("updates ids and the replacement file", async () => {
		const file = new File(["x"], "n.txt");
		await documentsApi.update(12, { vehicle_id: 9, user_id: 8, file_type: "manual", file });
		const form = lastForm("put");
		expect(form.get("vehicle_id")).toBe("9");
		expect(form.get("user_id")).toBe("8");
		expect(form.get("file_type")).toBe("manual");
		expect(form.has("file")).toBe(true);
	});
});
