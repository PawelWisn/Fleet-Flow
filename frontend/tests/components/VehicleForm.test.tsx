import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
	vehiclesApi: { create: vi.fn(), update: vi.fn() },
	companiesApi: { getAll: vi.fn() },
}));

import toast from "react-hot-toast";
import VehicleForm from "@/components/VehicleForm";
import { companiesApi, vehiclesApi } from "@/services/api";
import { company, page, vehicle } from "../fixtures";
import { router } from "../state";

const submit = () => fireEvent.submit(document.querySelector("form")!);
const input = (id: string) => document.getElementById(id) as HTMLInputElement;

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
	await user.type(input("registration_number"), "WX 12345");
	await user.type(input("brand"), "Toyota");
	await user.type(input("model"), "Camry");
	await user.type(input("vin"), "WVWZZZ1JZXW000001");
	await user.type(input("id_number"), "REG-1");
	await user.type(input("weight"), "1850.5");
	await user.type(input("kilometrage"), "15000");
	await user.selectOptions(input("company_id"), "1");
}

describe("VehicleForm", () => {
	beforeEach(() => {
		vi.mocked(companiesApi.getAll).mockResolvedValue(page([company(), company({ id: 2, name: "Beta Transport" })]) as any);
		vi.mocked(vehiclesApi.create).mockResolvedValue(vehicle());
		vi.mocked(vehiclesApi.update).mockResolvedValue(vehicle());
	});

	const renderForm = async (props: React.ComponentProps<typeof VehicleForm> = {}) => {
		const view = render(<VehicleForm {...props} />);
		await screen.findByText(props.vehicle ? "Edit Vehicle" : "Add New Vehicle");
		return view;
	};

	it("lists the companies to choose from", async () => {
		await renderForm();
		const options = [...input("company_id").querySelectorAll("option")].map((o) => o.textContent);
		expect(options).toEqual(["Select a company", "Alpha Logistics", "Beta Transport"]);
	});

	it("starts with sensible defaults", async () => {
		await renderForm();
		expect(input("production_year").value).toBe(String(new Date().getFullYear()));
		expect(input("gearbox_type")).toHaveValue("manual");
		expect(input("availability")).toHaveValue("available");
		expect(input("tire_type")).toHaveValue("all-season");
	});

	it("tells the user when the companies cannot be loaded", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(companiesApi.getAll).mockRejectedValue(new Error("down"));
		render(<VehicleForm />);
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load companies"));
	});

	it("requires registration number, brand, model and VIN", async () => {
		await renderForm();
		submit();
		expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
		expect(vehiclesApi.create).not.toHaveBeenCalled();
	});

	it("requires a 17 character VIN", async () => {
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		await user.clear(input("vin"));
		await user.type(input("vin"), "SHORT");
		submit();
		expect(toast.error).toHaveBeenCalledWith("VIN must be exactly 17 characters");
		expect(vehiclesApi.create).not.toHaveBeenCalled();
	});

	it("requires a company", async () => {
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		fireEvent.change(input("company_id"), { target: { value: "" } });
		submit();
		expect(toast.error).toHaveBeenCalledWith("Please select a company");
		expect(vehiclesApi.create).not.toHaveBeenCalled();
	});

	it("creates a vehicle and returns to the list", async () => {
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		await user.selectOptions(input("gearbox_type"), "automatic");
		await user.selectOptions(input("tire_type"), "winter");
		await user.selectOptions(input("availability"), "service");
		await user.click(screen.getByRole("button", { name: "Create Vehicle" }));

		await waitFor(() => expect(vehiclesApi.create).toHaveBeenCalledTimes(1));
		expect(vehiclesApi.create).toHaveBeenCalledWith(
			expect.objectContaining({
				registration_number: "WX 12345",
				brand: "Toyota",
				model: "Camry",
				vin: "WVWZZZ1JZXW000001",
				id_number: "REG-1",
				weight: 1850.5,
				kilometrage: 15000,
				gearbox_type: "automatic",
				tire_type: "winter",
				availability: "service",
				company_id: 1,
			}),
		);
		expect(toast.success).toHaveBeenCalledWith("Vehicle created successfully!");
		expect(router.push).toHaveBeenCalledWith("/vehicles");
	});

	it("calls onSuccess instead of navigating when the parent handles it", async () => {
		const onSuccess = vi.fn();
		const user = userEvent.setup();
		await renderForm({ onSuccess });
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create Vehicle" }));
		await waitFor(() => expect(onSuccess).toHaveBeenCalled());
		expect(router.push).not.toHaveBeenCalled();
	});

	it.each([
		[422, "Please check all field values"],
		[403, "You don't have permission to perform this action"],
		[500, "Failed to create vehicle"],
	])("explains a %i response", async (status, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(vehiclesApi.create).mockRejectedValue({ response: { status } });
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create Vehicle" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
		expect(router.push).not.toHaveBeenCalled();
	});

	describe("editing", () => {
		it("pre-fills the vehicle", async () => {
			await renderForm({ vehicle: vehicle() });
			expect(input("registration_number").value).toBe("AAA-111");
			expect(input("brand").value).toBe("Ford");
			expect(input("vin").value).toBe("WVWZZZ1JZXW000001");
			expect(input("kilometrage").value).toBe("45000");
			expect(input("company_id")).toHaveValue("1");
			expect(screen.getByRole("button", { name: "Update Vehicle" })).toBeInTheDocument();
		});

		it("updates the vehicle", async () => {
			const user = userEvent.setup();
			await renderForm({ vehicle: vehicle() });
			await user.clear(input("kilometrage"));
			await user.type(input("kilometrage"), "50000");
			await user.click(screen.getByRole("button", { name: "Update Vehicle" }));

			await waitFor(() => expect(vehiclesApi.update).toHaveBeenCalledWith(1, expect.objectContaining({ kilometrage: 50000, company_id: 1 })));
			expect(vehiclesApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Vehicle updated successfully!");
		});

		it("explains a failed update", async () => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			vi.mocked(vehiclesApi.update).mockRejectedValue({ response: { status: 500 } });
			const user = userEvent.setup();
			await renderForm({ vehicle: vehicle() });
			await user.click(screen.getByRole("button", { name: "Update Vehicle" }));
			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to update vehicle"));
		});
	});

	it("cancels to the list, or calls onCancel", async () => {
		const user = userEvent.setup();
		const { unmount } = await renderForm();
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/vehicles");
		unmount();

		const onCancel = vi.fn();
		await renderForm({ onCancel });
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalled();
	});
});
