import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../helpers")).apiMocks());

import { toast } from "react-hot-toast";
import InsuranceForm from "@/components/InsuranceForm";
import * as api from "@/services/api";
import { insuranceApi, vehiclesApi } from "@/services/api";
import { company, insurance, vehicle } from "../fixtures";
import { pick, stubSearchApis } from "../helpers";
import { router } from "../state";

type U = ReturnType<typeof userEvent.setup>;
const dates = () => document.querySelectorAll<HTMLInputElement>("input[type=datetime-local]");

async function fillValid(user: U, { from = "2026-01-01T00:00", to = "2027-01-01T00:00" } = {}) {
	await user.type(screen.getByPlaceholderText("Insurance company"), "Allianz");
	await user.type(screen.getByPlaceholderText("POL-0000"), "ALZ-1");
	await user.type(screen.getByPlaceholderText("0.00"), "899.99");
	await user.type(screen.getByPlaceholderText("Coverage details"), "Third party");
	fireEvent.change(dates()[0], { target: { value: from } });
	fireEvent.change(dates()[1], { target: { value: to } });
	await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
	await pick(user, "Select the policy document", "Registration card");
	await screen.findByRole("button", { name: "Alpha Logistics" });
}

describe("InsuranceForm", () => {
	beforeEach(() => {
		stubSearchApis(api);
		vi.mocked(vehiclesApi.getById).mockResolvedValue(vehicle({ company: company() }));
		vi.mocked(insuranceApi.create).mockResolvedValue(insurance());
		vi.mocked(insuranceApi.update).mockResolvedValue(insurance());
	});

	it("blocks an empty submit and lists what is missing", async () => {
		render(<InsuranceForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Add Insurance" }));

		for (const message of [
			"Insurer is required",
			"Policy number is required",
			"Start date is required",
			"End date is required",
			"Description is required",
			"Price must be a positive number",
			"Vehicle is required",
			"Document is required",
			"Company is required",
		]) {
			expect(screen.getByText(message)).toBeInTheDocument();
		}
		expect(insuranceApi.create).not.toHaveBeenCalled();
	});

	it("defaults to OC and offers all three policy types", () => {
		render(<InsuranceForm />);
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect(select.value).toBe("OC");
		expect([...select.options].map((o) => o.value)).toEqual(["OC", "AC", "OC/AC"]);
	});

	it("creates a policy with the expected payload", async () => {
		const user = userEvent.setup();
		render(<InsuranceForm />);
		await fillValid(user);
		await user.selectOptions(screen.getByRole("combobox"), "OC/AC");

		await user.click(screen.getByRole("button", { name: "Add Insurance" }));

		await waitFor(() => expect(insuranceApi.create).toHaveBeenCalledTimes(1));
		expect(insuranceApi.create).toHaveBeenCalledWith({
			insurer: "Allianz",
			policy_number: "ALZ-1",
			date_from: "2026-01-01T00:00",
			date_to: "2027-01-01T00:00",
			description: "Third party",
			price: 899.99,
			insurrance_type: "OC/AC",
			vehicle_id: 1,
			document_id: 5,
			company_id: 1,
		});
		expect(toast.success).toHaveBeenCalledWith("Insurance created successfully");
		expect(router.push).toHaveBeenCalledWith("/insurances");
	});

	it.each([
		["ends before it starts", "2026-06-01T00:00", "2026-01-01T00:00"],
		["ends exactly when it starts", "2026-06-01T00:00", "2026-06-01T00:00"],
	])("rejects a policy that %s", async (_label, from, to) => {
		const user = userEvent.setup();
		render(<InsuranceForm />);
		await fillValid(user, { from, to });
		await user.click(screen.getByRole("button", { name: "Add Insurance" }));

		expect(screen.getByText("End date must be after the start date")).toBeInTheDocument();
		expect(insuranceApi.create).not.toHaveBeenCalled();
	});

	it("accepts a price of zero", async () => {
		const user = userEvent.setup();
		render(<InsuranceForm />);
		await fillValid(user);
		await user.clear(screen.getByPlaceholderText("0.00"));
		await user.type(screen.getByPlaceholderText("0.00"), "0");
		await user.click(screen.getByRole("button", { name: "Add Insurance" }));
		await waitFor(() => expect(insuranceApi.create).toHaveBeenCalled());
		expect(vi.mocked(insuranceApi.create).mock.calls[0][0].price).toBe(0);
	});

	it("shows the backend error and stays on the form", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(insuranceApi.create).mockRejectedValue({ response: { data: { detail: [{ loc: ["body", "price"], msg: "Input should be a valid number" }] } } });
		const user = userEvent.setup();
		render(<InsuranceForm />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Add Insurance" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("price: Input should be a valid number"));
		expect(router.push).not.toHaveBeenCalled();
	});

	it("preselects the vehicle from the add page", () => {
		render(<InsuranceForm defaultVehicleId={1} />);
		expect(screen.queryByText("Vehicle is required")).not.toBeInTheDocument();
	});

	describe("editing", () => {
		it("pre-fills every field", () => {
			render(<InsuranceForm insurance={insurance()} isEdit />);

			expect(screen.getByPlaceholderText("Insurance company")).toHaveValue("PZU");
			expect(screen.getByPlaceholderText("POL-0000")).toHaveValue("POL-1");
			expect(screen.getByPlaceholderText("0.00")).toHaveValue(1200);
			expect(screen.getByRole("combobox")).toHaveValue("OC/AC");
			expect(dates()[0].value).toBe("2026-01-01T00:00");
			expect(dates()[1].value).toBe("2027-01-01T00:00");
			expect(screen.getByRole("button", { name: "AAA-111 - Ford Transit" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Update Insurance" })).toBeInTheDocument();
		});

		it("updates the record", async () => {
			const user = userEvent.setup();
			render(<InsuranceForm insurance={insurance()} isEdit />);
			await user.selectOptions(screen.getByRole("combobox"), "AC");
			await user.click(screen.getByRole("button", { name: "Update Insurance" }));

			await waitFor(() => expect(insuranceApi.update).toHaveBeenCalledWith(6, expect.objectContaining({ insurrance_type: "AC", insurer: "PZU" })));
			expect(insuranceApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Insurance updated successfully");
		});
	});

	it("cancels back to the list", async () => {
		render(<InsuranceForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/insurances");
	});
});
