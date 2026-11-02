import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../helpers")).apiMocks());

import { toast } from "react-hot-toast";
import RefuelForm from "@/components/RefuelForm";
import * as api from "@/services/api";
import { refuelsApi } from "@/services/api";
import { refuel } from "../fixtures";
import { pick, stubSearchApis } from "../helpers";
import { loginAs, router, users } from "../state";

const field = (placeholder: string, index = 0) => screen.getAllByPlaceholderText(placeholder)[index];
const submit = () => fireEvent.submit(document.querySelector("form")!);

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
	await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
	await pick(user, "Select a document", "Registration card");
	await user.type(field("0.00", 0), "45.5");
	await user.type(field("0.00", 1), "280.75");
	await user.type(field("0"), "15500");
	await user.type(screen.getByPlaceholderText(/gas station/i), "Shell");
}

describe("RefuelForm", () => {
	beforeEach(() => {
		stubSearchApis(api);
		vi.mocked(refuelsApi.create).mockResolvedValue(refuel());
		vi.mocked(refuelsApi.update).mockResolvedValue(refuel());
	});

	it("reports every missing field", () => {
		render(<RefuelForm />);
		submit();

		for (const message of [
			"Fuel amount must be greater than 0",
			"Price must be greater than 0",
			"Kilometrage must be greater than 0",
			"Gas station is required",
			"Vehicle is required",
			"Document is required",
		]) {
			expect(screen.getByText(message)).toBeInTheDocument();
		}
		expect(refuelsApi.create).not.toHaveBeenCalled();
	});

	it("starts with today's date and the signed-in driver", () => {
		render(<RefuelForm />);
		expect((document.querySelector("input[type=date]") as HTMLInputElement).value).toBe(new Date().toISOString().split("T")[0]);
		expect(screen.getByRole("button", { name: "Admin Root (admin@example.com)" })).toBeInTheDocument();
	});

	it("creates a refuel with numeric values", async () => {
		const user = userEvent.setup();
		render(<RefuelForm />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Add Refuel" }));

		await waitFor(() => expect(refuelsApi.create).toHaveBeenCalledTimes(1));
		expect(refuelsApi.create).toHaveBeenCalledWith({
			date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
			fuel_amount: 45.5,
			price: 280.75,
			kilometrage_during_refuel: 15500,
			gas_station: "Shell",
			vehicle_id: 1,
			document_id: 5,
			user_id: users.admin.id,
		});
		expect(toast.success).toHaveBeenCalledWith("Refuel record created successfully");
		expect(router.push).toHaveBeenCalledWith("/refuels");
	});

	it("requires a document because the backend does", async () => {
		const user = userEvent.setup();
		render(<RefuelForm />);
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		await user.type(field("0.00", 0), "10");
		await user.type(field("0.00", 1), "10");
		await user.type(field("0"), "10");
		await user.type(screen.getByPlaceholderText(/gas station/i), "Shell");
		submit();
		expect(screen.getByText("Document is required")).toBeInTheDocument();
		expect(refuelsApi.create).not.toHaveBeenCalled();
	});

	it("lets managers choose the driver", async () => {
		loginAs("manager");
		const user = userEvent.setup();
		render(<RefuelForm />);
		await fillValid(user);
		await pick(user, /Manager Alpha/, /Second Worker/);
		await user.click(screen.getByRole("button", { name: "Add Refuel" }));
		await waitFor(() => expect(refuelsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 4 })));
	});

	it("keeps workers as the driver of their own refuels", async () => {
		loginAs("worker");
		const user = userEvent.setup();
		render(<RefuelForm />);
		expect(screen.queryByRole("button", { name: /Worker Alpha/ })).not.toBeInTheDocument();
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Add Refuel" }));
		await waitFor(() => expect(refuelsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: users.worker.id })));
	});

	it("shows the backend's reason when saving fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(refuelsApi.create).mockRejectedValue({ response: { data: { detail: [{ loc: ["body"], msg: "The specified vehicle does not exist." }] } } });
		const user = userEvent.setup();
		render(<RefuelForm />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Add Refuel" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("The specified vehicle does not exist."));
		expect(router.push).not.toHaveBeenCalled();
	});

	describe("editing", () => {
		it("pre-fills the record", () => {
			render(<RefuelForm refuel={refuel()} isEdit />);
			expect(field("0.00", 0)).toHaveValue(40);
			expect(field("0.00", 1)).toHaveValue(260);
			expect(field("0")).toHaveValue(12345);
			expect(screen.getByPlaceholderText(/gas station/i)).toHaveValue("Orlen");
			expect(screen.getByRole("button", { name: "AAA-111 - Ford Transit" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Registration card" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Update Refuel" })).toBeInTheDocument();
		});

		it("updates the record", async () => {
			const user = userEvent.setup();
			render(<RefuelForm refuel={refuel()} isEdit />);
			await user.clear(screen.getByPlaceholderText(/gas station/i));
			await user.type(screen.getByPlaceholderText(/gas station/i), "BP");
			await user.click(screen.getByRole("button", { name: "Update Refuel" }));

			await waitFor(() => expect(refuelsApi.update).toHaveBeenCalledWith(8, expect.objectContaining({ gas_station: "BP", vehicle_id: 1, document_id: 5, user_id: 3 })));
			expect(refuelsApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Refuel record updated successfully");
		});
	});

	it("cancels back to the list", async () => {
		render(<RefuelForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/refuels");
	});
});
