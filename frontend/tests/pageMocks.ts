import { vi } from "vitest";
import { comment, company, document, event, insurance, page, refuel, reservation, user, vehicle } from "./fixtures";

/** Flip to make every mocked API call reject, to check that pages survive a broken backend. */
export const behavior = { fail: false };

const respond = <T,>(value: T) =>
	vi.fn(async (..._args: unknown[]) => {
		if (behavior.fail) throw Object.assign(new Error("Request failed"), { response: { status: 500, data: { detail: "Server exploded" } } });
		return value;
	});

function crud(item: unknown) {
	return {
		getAll: respond(page([item])),
		getById: respond(item),
		create: respond(item),
		update: respond(item),
		delete: respond(undefined),
	};
}

/** Realistic default responses for every function of services/api.ts, one fresh set per call. */
export function pageApiMocks() {
	return {
		usersApi: { ...crud(user()), getCurrentUser: respond(user({ id: 1, role: "admin", name: "Admin Root", email: "admin@example.com" })) },
		vehiclesApi: { ...crud(vehicle()), getAvailable: respond(page([vehicle()])), getFuelReport: respond(new Blob(["pdf"])) },
		companiesApi: crud(company()),
		reservationsApi: { ...crud(reservation()), getUpcoming: respond(page([reservation()])) },
		refuelsApi: crud(refuel()),
		eventsApi: crud(event()),
		insuranceApi: { ...crud(insurance()), getFinishing: respond(page([insurance()])) },
		documentsApi: { ...crud(document()), download: respond(new Blob(["file"])) },
		commentsApi: crud(comment()),
		reportsApi: {
			getFuelStats: respond([
				{ month_year: "10/26", total_fuel: 120.5 },
				{ month_year: "09/26", total_fuel: 80 },
			]),
			getVehicleFuelReport: respond(new Blob(["pdf"])),
		},
	};
}

/** Put every mocked API function back to its default response (tests override some of them). */
export function resetApiMocks(apis: Record<string, Record<string, unknown>>) {
	for (const group of Object.values(apis)) {
		for (const fn of Object.values(group)) (fn as ReturnType<typeof vi.fn>).mockReset();
	}
}
