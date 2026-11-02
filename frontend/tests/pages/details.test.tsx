import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../pageMocks")).pageApiMocks());

import { toast } from "react-hot-toast";
import AddCompanyPage from "@/app/companies/add/page";
import EditCompanyPage from "@/app/companies/[id]/edit/page";
import RefuelDetailsPage from "@/app/refuels/[id]/page";
import UserDetailsPage from "@/app/users/[id]/page";
import VehicleDetailsPage from "@/app/vehicles/[id]/page";
import * as allApis from "@/services/api";
import { companiesApi, refuelsApi, usersApi, vehiclesApi } from "@/services/api";
import { company, document as makeDocument, refuel, user, vehicle } from "../fixtures";
import { resetApiMocks } from "../pageMocks";
import { loginAs, router, setRoute } from "../state";

beforeEach(() => {
	resetApiMocks(allApis as any);
	setRoute({ params: { id: "1" } });
});

describe("refuel details", () => {
	it("shows the record's fields (regression: it used to read fields that do not exist)", async () => {
		render(<RefuelDetailsPage />);
		expect(await screen.findByText("Orlen")).toBeInTheDocument();
		expect(screen.getByText("40 Liters")).toBeInTheDocument();
		expect(screen.getByText("$260.00")).toBeInTheDocument();
		expect(screen.getByText("12,345 km")).toBeInTheDocument();
		expect(screen.getByText("Worker Alpha")).toBeInTheDocument();
	});

	it("derives the price per liter", async () => {
		vi.mocked(refuelsApi.getById).mockResolvedValue(refuel({ fuel_amount: 40, price: 260 }));
		render(<RefuelDetailsPage />);
		expect(await screen.findByText("$6.50/L")).toBeInTheDocument();
	});

	it("does not divide by zero", async () => {
		vi.mocked(refuelsApi.getById).mockResolvedValue(refuel({ fuel_amount: 0 }));
		render(<RefuelDetailsPage />);
		await screen.findByText("Orlen");
		expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
	});

	it("links to the receipt document", async () => {
		render(<RefuelDetailsPage />);
		const link = await screen.findByRole("link", { name: "Registration card" });
		expect(link).toHaveAttribute("href", "/documents/5");
	});

	it("copes with a refuel whose document did not come back", async () => {
		vi.mocked(refuelsApi.getById).mockResolvedValue(refuel({ document: undefined }));
		render(<RefuelDetailsPage />);
		await screen.findByText("Orlen");
		expect(screen.queryByRole("link", { name: "Registration card" })).not.toBeInTheDocument();
	});

	it("shows a not-found page", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(refuelsApi.getById).mockRejectedValue({ response: { status: 404 } });
		render(<RefuelDetailsPage />);
		expect(await screen.findByText("Refuel record not found")).toBeInTheDocument();
	});

	it("deletes after confirmation", async () => {
		const u = userEvent.setup();
		render(<RefuelDetailsPage />);
		await screen.findByText("Orlen");
		await u.click(screen.getByRole("button", { name: /Delete/ }));
		await waitFor(() => expect(refuelsApi.delete).toHaveBeenCalledWith(1));
		expect(router.push).toHaveBeenCalledWith("/refuels");
	});
});

describe("user details", () => {
	beforeEach(() => {
		vi.mocked(usersApi.getById).mockResolvedValue(user({ id: 3, name: "Worker Alpha", email: "worker@example.com" }));
		setRoute({ params: { id: "3" } });
	});

	it("is only for managers and admins", async () => {
		loginAs("worker");
		render(<UserDetailsPage />);
		await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
	});

	it("lets an admin edit and delete", async () => {
		render(<UserDetailsPage />);
		await screen.findByRole("heading", { name: "Worker Alpha" });
		expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();
	});

	it("hides edit and delete from a manager looking at someone else", async () => {
		loginAs("manager");
		render(<UserDetailsPage />);
		await screen.findByRole("heading", { name: "Worker Alpha" });
		expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
	});

	it("shows a manager their own edit and delete buttons", async () => {
		loginAs("manager");
		vi.mocked(usersApi.getById).mockResolvedValue(user({ id: 2, name: "Manager Alpha", role: "manager" }));
		setRoute({ params: { id: "2" } });
		render(<UserDetailsPage />);
		await screen.findByRole("heading", { name: "Manager Alpha" });
		expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
	});

	it("deletes and returns to the list", async () => {
		const u = userEvent.setup();
		render(<UserDetailsPage />);
		await screen.findByRole("heading", { name: "Worker Alpha" });
		await u.click(screen.getByRole("button", { name: /Delete/ }));
		await waitFor(() => expect(usersApi.delete).toHaveBeenCalledWith(3));
		expect(router.push).toHaveBeenCalledWith("/users");
	});

	it("goes back to the list when the user cannot be loaded", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(usersApi.getById).mockRejectedValue({ response: { status: 404 } });
		render(<UserDetailsPage />);
		await waitFor(() => expect(router.push).toHaveBeenCalledWith("/users"));
		expect(toast.error).toHaveBeenCalledWith("Failed to load user");
	});
});

describe("vehicle details", () => {
	it("shows the vehicle and its counts of related records, linking to the filtered lists", async () => {
		vi.mocked(vehiclesApi.getById).mockResolvedValue(vehicle({ events: [{}, {}], insurrances: [{}], comments: [{}, {}, {}], documents: [{}], refuels: [], reservations: [{}] }));
		const u = userEvent.setup();
		render(<VehicleDetailsPage />);
		await screen.findAllByText("AAA-111");

		const related = screen.getByText("Related Records").parentElement as HTMLElement;
		const tile = (label: string) => within(related).getByText(label).closest("button") as HTMLElement;
		expect(tile("Events")).toHaveTextContent("2");
		expect(tile("Insurances")).toHaveTextContent("1");
		expect(tile("Comments")).toHaveTextContent("3");
		expect(tile("Refuels")).toHaveTextContent("0");

		await u.click(tile("Events"));
		expect(router.push).toHaveBeenLastCalledWith("/events?vehicle_id=1");
		await u.click(tile("Insurances"));
		expect(router.push).toHaveBeenLastCalledWith("/insurances?vehicle_id=1");
		await u.click(tile("Comments"));
		expect(router.push).toHaveBeenLastCalledWith("/comments?vehicle_id=1");
	});

	it("starts new records for this vehicle", async () => {
		const u = userEvent.setup();
		render(<VehicleDetailsPage />);
		await screen.findAllByText("AAA-111");
		await u.click(screen.getByRole("button", { name: "Add event" }));
		expect(router.push).toHaveBeenLastCalledWith("/events/add?vehicle_id=1");
		await u.click(screen.getByRole("button", { name: "Add insurance" }));
		expect(router.push).toHaveBeenLastCalledWith("/insurances/add?vehicle_id=1");
		await u.click(screen.getByRole("button", { name: "Add comment" }));
		expect(router.push).toHaveBeenLastCalledWith("/comments/add?vehicle_id=1");
	});

	it.each([
		[404, "Vehicle not found"],
		[403, "You don't have permission to view this vehicle"],
		[500, "Failed to load vehicle data"],
	])("explains a %i", async (status, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(vehiclesApi.getById).mockRejectedValue({ response: { status } });
		render(<VehicleDetailsPage />);
		expect(await screen.findByText(message)).toBeInTheDocument();
	});

	it("deletes after confirmation, naming the vehicle", async () => {
		const u = userEvent.setup();
		render(<VehicleDetailsPage />);
		await screen.findAllByText("AAA-111");
		await u.click(screen.getByRole("button", { name: /Delete/ }));
		expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("AAA-111"));
		await waitFor(() => expect(vehiclesApi.delete).toHaveBeenCalledWith(1));
		expect(router.push).toHaveBeenCalledWith("/vehicles");
	});

	it("explains a refused delete", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(vehiclesApi.delete).mockRejectedValue({ response: { status: 403 } });
		const u = userEvent.setup();
		render(<VehicleDetailsPage />);
		await screen.findAllByText("AAA-111");
		await u.click(screen.getByRole("button", { name: /Delete/ }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You don't have permission to delete this vehicle"));
	});
});

describe("company pages", () => {
	const input = (id: string) => document.getElementById(id) as HTMLInputElement;

	it("creates a company and returns to the list, toasting once", async () => {
		const u = userEvent.setup();
		render(<AddCompanyPage />);
		await u.type(input("name"), "New Co");
		await u.type(input("nip"), "1234567890");
		await u.type(input("address1"), "Street 1");
		await u.type(input("city"), "Gdansk");
		await u.type(input("post_code"), "80-001");
		await u.type(input("country"), "Poland");
		await u.click(screen.getByRole("button", { name: "Create Company" }));

		await waitFor(() => expect(companiesApi.create).toHaveBeenCalledWith(expect.objectContaining({ name: "New Co", nip: "1234567890" })));
		expect(toast.success).toHaveBeenCalledWith("Company created successfully");
		expect(router.push).toHaveBeenCalledWith("/companies");
	});

	it("shows a single error toast when creating fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(companiesApi.create).mockRejectedValue(new Error("boom"));
		const u = userEvent.setup();
		render(<AddCompanyPage />);
		await u.type(input("name"), "New Co");
		await u.type(input("nip"), "1234567890");
		await u.type(input("address1"), "Street 1");
		await u.type(input("city"), "Gdansk");
		await u.type(input("post_code"), "80-001");
		await u.type(input("country"), "Poland");
		await u.click(screen.getByRole("button", { name: "Create Company" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to create company"));
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(router.push).not.toHaveBeenCalled();
	});

	it("edits a company without losing its description, phone and internal flag", async () => {
		vi.mocked(companiesApi.getById).mockResolvedValue(company({ description: "Freight", phone: "555", is_internal: false }));
		const u = userEvent.setup();
		render(<EditCompanyPage />);
		await screen.findByDisplayValue("Alpha Logistics");
		await u.clear(input("city"));
		await u.type(input("city"), "Krakow");
		await u.click(screen.getByRole("button", { name: "Update Company" }));

		await waitFor(() => expect(companiesApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ city: "Krakow", description: "Freight", phone: "555", is_internal: false })));
		expect(toast.success).toHaveBeenCalledWith("Company updated successfully");
		expect(router.push).toHaveBeenCalledWith("/companies");
	});

	it("goes back to the list when the company cannot be loaded", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(companiesApi.getById).mockRejectedValue(new Error("404"));
		render(<EditCompanyPage />);
		await waitFor(() => expect(router.push).toHaveBeenCalledWith("/companies"));
		expect(toast.error).toHaveBeenCalledWith("Failed to load company data");
	});
});

// keep the unused fixture import honest
void makeDocument;
