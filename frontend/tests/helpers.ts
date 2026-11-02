import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";
import { vi } from "vitest";
import { company, document, page, user, vehicle } from "./fixtures";

/** Choose an option in a SearchableDropdown: open it by its current text, then click the option. */
export async function pick(user: UserEvent, current: string | RegExp, option: string | RegExp) {
	await user.click(screen.getByRole("button", { name: current }));
	await user.click(await screen.findByRole("button", { name: option }));
}

/** Search endpoints used by the dropdowns; call after `vi.mock("@/services/api")` has run. */
export function stubSearchApis(apis: { vehiclesApi?: any; usersApi?: any; documentsApi?: any; companiesApi?: any }) {
	apis.vehiclesApi?.getAll?.mockResolvedValue(page([vehicle(), vehicle({ id: 2, registration_number: "BBB-222", brand: "Volvo", model: "FH16" })]));
	apis.usersApi?.getAll?.mockResolvedValue(page([user(), user({ id: 4, name: "Second Worker", email: "second@example.com" })]));
	apis.documentsApi?.getAll?.mockResolvedValue(page([document(), document({ id: 6, title: "Insurance policy" })]));
	apis.companiesApi?.getAll?.mockResolvedValue(page([company(), company({ id: 2, name: "Beta Transport" })]));
}

export const apiMocks = () => ({
	vehiclesApi: { getAll: vi.fn(), getById: vi.fn() },
	usersApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
	documentsApi: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn() },
	companiesApi: { getAll: vi.fn() },
	eventsApi: { create: vi.fn(), update: vi.fn() },
	insuranceApi: { create: vi.fn(), update: vi.fn() },
	commentsApi: { create: vi.fn(), update: vi.fn() },
	reservationsApi: { create: vi.fn(), update: vi.fn() },
	refuelsApi: { create: vi.fn(), update: vi.fn() },
});
