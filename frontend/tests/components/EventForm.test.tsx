import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../helpers")).apiMocks());

import { toast } from "react-hot-toast";
import EventForm from "@/components/EventForm";
import { eventsApi, vehiclesApi } from "@/services/api";
import { company, event, vehicle } from "../fixtures";
import { pick, stubSearchApis } from "../helpers";
import { router } from "../state";
import * as api from "@/services/api";

const typeText = async (user: ReturnType<typeof userEvent.setup>, placeholder: string | RegExp, text: string) => user.type(screen.getByPlaceholderText(placeholder), text);

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
	await typeText(user, /maintenance, repair/, "inspection");
	await typeText(user, "What happened?", "Brakes checked");
	await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
	await pick(user, "Select a supporting document", "Registration card");
}

describe("EventForm", () => {
	beforeEach(() => {
		stubSearchApis(api);
		vi.mocked(vehiclesApi.getById).mockResolvedValue(vehicle({ company_id: 1, company: company() }));
		vi.mocked(eventsApi.create).mockResolvedValue(event());
		vi.mocked(eventsApi.update).mockResolvedValue(event());
	});

	it("blocks an empty submit and lists what is missing", async () => {
		render(<EventForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Add Event" }));

		for (const message of ["Event type is required", "Description is required", "Vehicle is required", "Document is required", "Company is required"]) {
			expect(screen.getByText(message)).toBeInTheDocument();
		}
		expect(eventsApi.create).not.toHaveBeenCalled();
	});

	it("starts with the current date and time", () => {
		render(<EventForm />);
		const input = document.querySelector("input[type=datetime-local]") as HTMLInputElement;
		expect(input.value.slice(0, 10)).toBe(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10));
	});

	it("pre-fills the company from the chosen vehicle", async () => {
		const user = userEvent.setup();
		render(<EventForm />);
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");

		expect(await screen.findByRole("button", { name: "Alpha Logistics" })).toBeInTheDocument();
		expect(vehiclesApi.getById).toHaveBeenCalledWith(1);
	});

	it("creates an event with the expected payload and returns to the list", async () => {
		const user = userEvent.setup();
		render(<EventForm />);
		await fillValid(user);
		await typeText(user, "0.00", "150.5");
		await screen.findByRole("button", { name: "Alpha Logistics" });

		await user.click(screen.getByRole("button", { name: "Add Event" }));

		await waitFor(() => expect(eventsApi.create).toHaveBeenCalledTimes(1));
		expect(eventsApi.create).toHaveBeenCalledWith({
			event_type: "inspection",
			date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
			description: "Brakes checked",
			price: 150.5,
			vehicle_id: 1,
			document_id: 5,
			company_id: 1,
		});
		expect(toast.success).toHaveBeenCalledWith("Event created successfully");
		expect(router.push).toHaveBeenCalledWith("/events");
	});

	it("sends a null price when none is given", async () => {
		const user = userEvent.setup();
		render(<EventForm />);
		await fillValid(user);
		await screen.findByRole("button", { name: "Alpha Logistics" });
		await user.click(screen.getByRole("button", { name: "Add Event" }));

		await waitFor(() => expect(eventsApi.create).toHaveBeenCalled());
		expect(vi.mocked(eventsApi.create).mock.calls[0][0].price).toBeNull();
	});

	it("does not submit a negative price (native min constraint)", async () => {
		const user = userEvent.setup();
		render(<EventForm />);
		await fillValid(user);
		await screen.findByRole("button", { name: "Alpha Logistics" });
		fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "-5" } });
		await user.click(screen.getByRole("button", { name: "Add Event" }));

		expect(eventsApi.create).not.toHaveBeenCalled();
	});

	it("clears a field's error as soon as it is edited", async () => {
		const user = userEvent.setup();
		render(<EventForm />);
		await user.click(screen.getByRole("button", { name: "Add Event" }));
		expect(screen.getByText("Event type is required")).toBeInTheDocument();

		await typeText(user, /maintenance, repair/, "x");

		expect(screen.queryByText("Event type is required")).not.toBeInTheDocument();
	});

	it("shows the backend's message and stays on the form when saving fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(eventsApi.create).mockRejectedValue({ response: { data: { detail: [{ loc: ["body"], msg: "The specified document does not exist." }] } } });
		const user = userEvent.setup();
		render(<EventForm />);
		await fillValid(user);
		await screen.findByRole("button", { name: "Alpha Logistics" });
		await user.click(screen.getByRole("button", { name: "Add Event" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("The specified document does not exist."));
		expect(router.push).not.toHaveBeenCalled();
		expect(screen.getByRole("button", { name: "Add Event" })).toBeEnabled();
	});

	it("falls back to a generic message", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(eventsApi.create).mockRejectedValue(new Error("network"));
		const user = userEvent.setup();
		render(<EventForm />);
		await fillValid(user);
		await screen.findByRole("button", { name: "Alpha Logistics" });
		await user.click(screen.getByRole("button", { name: "Add Event" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to create event"));
	});

	it("uses the vehicle given by the add page", async () => {
		const user = userEvent.setup();
		render(<EventForm defaultVehicleId={1} />);
		await typeText(user, /maintenance, repair/, "x");
		await typeText(user, "What happened?", "y");
		await user.click(screen.getByRole("button", { name: "Add Event" }));
		// vehicle is preset, so only document and company remain missing
		expect(screen.queryByText("Vehicle is required")).not.toBeInTheDocument();
		expect(screen.getByText("Document is required")).toBeInTheDocument();
	});

	describe("editing", () => {
		it("pre-fills every field and shows the related labels without searching", () => {
			render(<EventForm event={event({ price: 150 })} isEdit />);

			expect(screen.getByPlaceholderText(/maintenance, repair/)).toHaveValue("maintenance");
			expect(screen.getByPlaceholderText("What happened?")).toHaveValue("Oil change");
			expect(screen.getByPlaceholderText("0.00")).toHaveValue(150);
			expect((document.querySelector("input[type=datetime-local]") as HTMLInputElement).value).toBe("2026-04-01T09:30");
			expect(screen.getByRole("button", { name: "AAA-111 - Ford Transit" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Registration card" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Alpha Logistics" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Update Event" })).toBeInTheDocument();
		});

		it("updates the record instead of creating one", async () => {
			const user = userEvent.setup();
			render(<EventForm event={event()} isEdit />);
			await user.clear(screen.getByPlaceholderText("What happened?"));
			await user.type(screen.getByPlaceholderText("What happened?"), "Edited");
			await user.click(screen.getByRole("button", { name: "Update Event" }));

			await waitFor(() => expect(eventsApi.update).toHaveBeenCalledWith(9, expect.objectContaining({ description: "Edited", vehicle_id: 1, document_id: 5, company_id: 1 })));
			expect(eventsApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Event updated successfully");
			expect(router.push).toHaveBeenCalledWith("/events");
		});

		it("can remove the price", async () => {
			const user = userEvent.setup();
			render(<EventForm event={event({ price: 150 })} isEdit />);
			await user.clear(screen.getByPlaceholderText("0.00"));
			await user.click(screen.getByRole("button", { name: "Update Event" }));
			await waitFor(() => expect(eventsApi.update).toHaveBeenCalled());
			expect(vi.mocked(eventsApi.update).mock.calls[0][1].price).toBeNull();
		});
	});

	it("cancels back to the list", async () => {
		render(<EventForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/events");
	});
});
