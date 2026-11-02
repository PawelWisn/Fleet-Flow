import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../pageMocks")).pageApiMocks());

import { toast } from "react-hot-toast";
import CompaniesPage from "@/app/companies/page";
import DocumentsPage from "@/app/documents/page";
import RefuelsPage from "@/app/refuels/page";
import ReservationsPage from "@/app/reservations/page";
import UsersPage from "@/app/users/page";
import VehiclesPage from "@/app/vehicles/page";
import * as allApis from "@/services/api";
import { companiesApi, documentsApi, refuelsApi, reservationsApi, usersApi, vehiclesApi } from "@/services/api";
import { resetApiMocks } from "../pageMocks";
import { company, document as makeDocument, page, refuel, reservation, user, vehicle } from "../fixtures";
import { loginAs, router } from "../state";

beforeEach(() => {
	resetApiMocks(allApis as any);
});

const last = (fn: unknown) => vi.mocked(fn as any).mock.calls.at(-1)?.[0];

describe("vehicles list", () => {
	it("loads page one and shows the vehicles", async () => {
		render(<VehiclesPage />);
		expect(await screen.findByText("AAA-111")).toBeInTheDocument();
		expect(last(vehiclesApi.getAll)).toEqual({ page: 1, size: 15, search: undefined, status: undefined });
	});

	it("searches after a pause, using the backend search", async () => {
		const user = userEvent.setup();
		render(<VehiclesPage />);
		await screen.findByText("AAA-111");
		await user.type(screen.getByPlaceholderText("Search by registration or model"), "volvo");

		await waitFor(() => expect(last(vehiclesApi.getAll)).toMatchObject({ search: "volvo", page: 1 }), { timeout: 2000 });
	});

	it("filters by status", async () => {
		const user = userEvent.setup();
		render(<VehiclesPage />);
		await screen.findByText("AAA-111");
		await user.selectOptions(screen.getByRole("combobox"), "in use");
		await waitFor(() => expect(last(vehiclesApi.getAll)).toMatchObject({ status: "in use", page: 1 }));
	});

	it("goes back to page one when the filter changes", async () => {
		vi.mocked(vehiclesApi.getAll).mockResolvedValue(page([vehicle()], { total: 40, pages: 3 }) as any);
		const user = userEvent.setup();
		render(<VehiclesPage />);
		await screen.findByText("AAA-111");
		await user.click(screen.getByRole("button", { name: "2" }));
		await waitFor(() => expect(last(vehiclesApi.getAll)).toMatchObject({ page: 2 }));
		await user.selectOptions(screen.getByDisplayValue("All statuses"), "service");
		await waitFor(() => expect(last(vehiclesApi.getAll)).toMatchObject({ page: 1, status: "service" }));
	});

	it("navigates to details, edit and add", async () => {
		const user = userEvent.setup();
		render(<VehiclesPage />);
		await screen.findByText("AAA-111");
		await user.click(screen.getByRole("button", { name: /Add Vehicle/ }));
		expect(router.push).toHaveBeenLastCalledWith("/vehicles/add");
		await user.click(screen.getByRole("button", { name: /View Details/i }));
		expect(router.push).toHaveBeenLastCalledWith("/vehicles/1");
	});

	it("shows an error state when loading fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(vehiclesApi.getAll).mockRejectedValue(new Error("down"));
		render(<VehiclesPage />);
		expect(await screen.findByText(/Failed to load vehicles/)).toBeInTheDocument();
		expect(toast.error).toHaveBeenCalledWith("Failed to load vehicles");
	});
});

describe("users list", () => {
	beforeEach(() => {
		vi.mocked(usersApi.getAll).mockResolvedValue(page([user({ id: 1, name: "Admin Root", role: "admin", email: "admin@example.com" }), user({ id: 3, name: "Worker Alpha" }), user({ id: 4, name: "Other Worker", email: "other@example.com" })]) as any);
	});

	it("is not available to workers", () => {
		loginAs("worker");
		render(<UsersPage />);
		expect(screen.queryByText("Other Worker")).not.toBeInTheDocument();
		expect(router.push).toHaveBeenCalledWith("/dashboard");
	});

	it("lets admins edit and delete anyone", async () => {
		render(<UsersPage />);
		await screen.findByText("Other Worker");
		expect(screen.getAllByRole("button", { name: /Edit/ })).toHaveLength(3);
	});

	it("only lets a manager edit and delete themselves (the backend forbids the rest)", async () => {
		loginAs("manager"); // id 2, not in the list below -> no edit buttons
		render(<UsersPage />);
		await screen.findByText("Other Worker");
		expect(screen.queryAllByRole("button", { name: /Edit/ })).toHaveLength(0);
		expect(screen.getAllByRole("button", { name: /View/ })).toHaveLength(3);
	});

	it("shows a manager the edit buttons of their own card", async () => {
		loginAs("manager");
		vi.mocked(usersApi.getAll).mockResolvedValue(page([user({ id: 2, name: "Manager Alpha", role: "manager" }), user({ id: 4, name: "Other Worker" })]) as any);
		render(<UsersPage />);
		await screen.findByText("Other Worker");
		expect(screen.getAllByRole("button", { name: /Edit/ })).toHaveLength(1);
	});

	it("filters by role and searches", async () => {
		const u = userEvent.setup();
		render(<UsersPage />);
		await screen.findByText("Other Worker");
		await u.selectOptions(screen.getByDisplayValue("All Roles"), "worker");
		await waitFor(() => expect(last(usersApi.getAll)).toMatchObject({ role: "worker", page: 1 }));
		await u.type(screen.getByPlaceholderText("Search users..."), "alpha");
		await waitFor(() => expect(last(usersApi.getAll)).toMatchObject({ search: "alpha" }), { timeout: 2000 });
	});

	it("deletes after confirmation", async () => {
		const u = userEvent.setup();
		render(<UsersPage />);
		await screen.findByText("Other Worker");
		const card = screen.getByText("Other Worker").closest("div.bg-white, div.card") as HTMLElement;
		const trash = within(card.parentElement!.parentElement!).getAllByRole("button").find((b) => b.className.includes("bg-red-600"))!;
		await u.click(trash);
		await waitFor(() => expect(usersApi.delete).toHaveBeenCalled());
		expect(toast.success).toHaveBeenCalledWith("User deleted successfully!");
	});

	it("does not delete when the confirmation is declined", async () => {
		vi.mocked(window.confirm).mockReturnValue(false);
		const u = userEvent.setup();
		render(<UsersPage />);
		await screen.findByText("Other Worker");
		await u.click(document.querySelector("button.bg-red-600")!);
		expect(usersApi.delete).not.toHaveBeenCalled();
	});
});

describe("reservations list", () => {
	it("lists all reservations first, then only the upcoming ones", async () => {
		const u = userEvent.setup();
		render(<ReservationsPage />);
		await screen.findByText(/AAA-111/);
		expect(reservationsApi.getAll).toHaveBeenCalledWith({ page: 1, size: 15 });
		expect(reservationsApi.getUpcoming).not.toHaveBeenCalled();

		await u.click(screen.getByRole("button", { name: "Upcoming" }));

		await waitFor(() => expect(reservationsApi.getUpcoming).toHaveBeenCalledWith({ page: 1, size: 15 }));
	});

	it("goes back to the first page when switching tabs", async () => {
		vi.mocked(reservationsApi.getAll).mockResolvedValue(page([reservation()], { total: 40, pages: 3 }) as any);
		const u = userEvent.setup();
		render(<ReservationsPage />);
		await screen.findByText(/AAA-111/);
		await u.click(screen.getByRole("button", { name: "2" }));
		await waitFor(() => expect(last(reservationsApi.getAll)).toMatchObject({ page: 2 }));
		await u.click(screen.getByRole("button", { name: "Upcoming" }));
		await waitFor(() => expect(last(reservationsApi.getUpcoming)).toMatchObject({ page: 1 }));
	});

	it("filters the loaded page by vehicle or user text", async () => {
		vi.mocked(reservationsApi.getAll).mockResolvedValue(
			page([reservation(), reservation({ id: 5, vehicle: vehicle({ registration_number: "ZZZ-999", brand: "Scania", model: "R450" }), user: user({ name: "Zed Driver" }) })]) as any,
		);
		const u = userEvent.setup();
		render(<ReservationsPage />);
		await screen.findByText(/ZZZ-999/);
		await u.type(screen.getByPlaceholderText("Search by vehicle or user..."), "zed");
		expect(screen.queryByText(/AAA-111/)).not.toBeInTheDocument();
		expect(screen.getByText(/ZZZ-999/)).toBeInTheDocument();
	});

	it("offers to create a reservation", async () => {
		const u = userEvent.setup();
		render(<ReservationsPage />);
		await screen.findByText(/AAA-111/);
		await u.click(screen.getByRole("button", { name: /New Reservation/ }));
		expect(router.push).toHaveBeenCalledWith("/reservations/add");
	});

	it("shows an error with a retry when loading fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(reservationsApi.getAll).mockRejectedValue({ response: { status: 500 } });
		render(<ReservationsPage />);
		expect(await screen.findByText("Error Loading Reservations")).toBeInTheDocument();
	});

	it("sends an expired session back to the login page", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(reservationsApi.getAll).mockRejectedValue({ response: { status: 401 } });
		render(<ReservationsPage />);
		await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
	});
});

describe("refuels list", () => {
	it("shows records and searches on the server", async () => {
		const u = userEvent.setup();
		render(<RefuelsPage />);
		expect(await screen.findByText("Orlen")).toBeInTheDocument();
		await u.type(screen.getByPlaceholderText(/Search by vehicle brand/), "ford");
		await waitFor(() => expect(last(refuelsApi.getAll)).toMatchObject({ search: "ford", page: 1 }), { timeout: 2000 });
	});

	it("deletes after confirmation and reloads", async () => {
		const u = userEvent.setup();
		render(<RefuelsPage />);
		await screen.findByText("Orlen");
		await u.click(screen.getByTitle("Delete"));
		await waitFor(() => expect(refuelsApi.delete).toHaveBeenCalledWith(8));
		expect(toast.success).toHaveBeenCalledWith("Refuel record deleted successfully");
	});

	it("shows the empty state", async () => {
		vi.mocked(refuelsApi.getAll).mockResolvedValue(page([]) as any);
		render(<RefuelsPage />);
		expect(await screen.findByText("No refuel records")).toBeInTheDocument();
	});

	it("formats the values", async () => {
		render(<RefuelsPage />);
		await screen.findByText("Orlen");
		expect(screen.getByText("40L")).toBeInTheDocument();
		expect(screen.getByText("$260.00")).toBeInTheDocument();
		expect(screen.getByText("12,345 km")).toBeInTheDocument();
	});
});

describe("documents list", () => {
	beforeEach(() => {
		window.URL.createObjectURL = vi.fn(() => "blob:fake");
		window.URL.revokeObjectURL = vi.fn();
	});

	it("shows documents and searches on the server", async () => {
		const u = userEvent.setup();
		render(<DocumentsPage />);
		expect(await screen.findByText("Registration card")).toBeInTheDocument();
		await u.type(screen.getByPlaceholderText(/Search by title/), "lease");
		await waitFor(() => expect(last(documentsApi.getAll)).toMatchObject({ search: "lease", page: 1 }), { timeout: 2000 });
	});

	it("downloads a document's file under its title", async () => {
		const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
		const u = userEvent.setup();
		render(<DocumentsPage />);
		await screen.findByText("Registration card");
		await u.click(screen.getByTitle("Download file"));

		await waitFor(() => expect(documentsApi.download).toHaveBeenCalledWith(5));
		expect(click).toHaveBeenCalled();
		expect(toast.success).toHaveBeenCalledWith("File downloaded successfully!");
		expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
	});

	it("reports a failed download", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(documentsApi.download).mockRejectedValue(new Error("404"));
		const u = userEvent.setup();
		render(<DocumentsPage />);
		await screen.findByText("Registration card");
		await u.click(screen.getByTitle("Download file"));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to download file"));
	});

	it("does not offer a download for a document without a file", async () => {
		vi.mocked(documentsApi.getAll).mockResolvedValue(page([makeDocument({ file_path: undefined, file_size: undefined })]) as any);
		render(<DocumentsPage />);
		await screen.findByText("Registration card");
		expect(screen.queryByTitle("Download file")).not.toBeInTheDocument();
	});

	it("deletes after confirmation and reloads the current page", async () => {
		const u = userEvent.setup();
		render(<DocumentsPage />);
		await screen.findByText("Registration card");
		vi.mocked(documentsApi.getAll).mockClear();
		await u.click(screen.getByTitle("Delete document"));
		await waitFor(() => expect(documentsApi.delete).toHaveBeenCalledWith(5));
		await waitFor(() => expect(documentsApi.getAll).toHaveBeenCalledTimes(1));
		expect(toast.success).toHaveBeenCalledWith("Document deleted successfully!");
	});
});

describe("companies list", () => {
	it("shows companies with their address", async () => {
		render(<CompaniesPage />);
		expect(await screen.findByText("Alpha Logistics")).toBeInTheDocument();
		expect(screen.getByText(/Main St 1, Warsaw, 00-001, Poland/)).toBeInTheDocument();
	});

	it("searches on the server", async () => {
		const u = userEvent.setup();
		render(<CompaniesPage />);
		await screen.findByText("Alpha Logistics");
		await u.type(screen.getByPlaceholderText(/Search companies/), "beta");
		await waitFor(() => expect(last(companiesApi.getAll)).toMatchObject({ search: "beta", page: 1 }), { timeout: 2000 });
	});

	it("only promises searching by what the API supports", async () => {
		render(<CompaniesPage />);
		await screen.findByText("Alpha Logistics");
		expect(screen.getByPlaceholderText(/Search companies/).getAttribute("placeholder")).toBe("Search companies by name or NIP...");
	});

	it("shows an error state when loading fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(companiesApi.getAll).mockRejectedValue(new Error("down"));
		render(<CompaniesPage />);
		expect(await screen.findByText("Error Loading Companies")).toBeInTheDocument();
	});
});
