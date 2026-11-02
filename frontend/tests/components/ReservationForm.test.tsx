import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../helpers")).apiMocks());

import { toast } from "react-hot-toast";
import ReservationForm from "@/components/ReservationForm";
import * as api from "@/services/api";
import { reservationsApi } from "@/services/api";
import { reservation } from "../fixtures";
import { pick, stubSearchApis } from "../helpers";
import { loginAs, router, users } from "../state";

const dates = () => document.querySelectorAll<HTMLInputElement>("input[type=date]");
const setDates = (from: string, to: string) => {
	fireEvent.change(dates()[0], { target: { value: from } });
	fireEvent.change(dates()[1], { target: { value: to } });
};
const submit = () => fireEvent.submit(document.querySelector("form")!);

describe("ReservationForm", () => {
	beforeEach(() => {
		stubSearchApis(api);
		vi.mocked(reservationsApi.create).mockResolvedValue(reservation());
		vi.mocked(reservationsApi.update).mockResolvedValue(reservation());
	});

	it("asks for the missing fields", async () => {
		render(<ReservationForm />);
		submit();
		expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
		expect(reservationsApi.create).not.toHaveBeenCalled();
	});

	it("requires the end to be after the start", async () => {
		const user = userEvent.setup();
		render(<ReservationForm />);
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		setDates("2026-12-10", "2026-12-10");
		submit();

		expect(toast.error).toHaveBeenCalledWith("End date must be after start date");
		expect(reservationsApi.create).not.toHaveBeenCalled();
	});

	it("only allows end dates from the chosen start onwards", () => {
		render(<ReservationForm />);
		setDates("2026-12-10", "");
		expect(dates()[1]).toHaveAttribute("min", "2026-12-10");
	});

	it("books for the signed-in user by default, sending ISO dates", async () => {
		const user = userEvent.setup();
		render(<ReservationForm />);
		expect(screen.getByRole("button", { name: "Admin Root (admin@example.com)" })).toBeInTheDocument();
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		setDates("2026-12-10", "2026-12-12");
		await user.click(screen.getByRole("button", { name: "Create Reservation" }));

		await waitFor(() => expect(reservationsApi.create).toHaveBeenCalledTimes(1));
		expect(reservationsApi.create).toHaveBeenCalledWith({
			date_from: new Date("2026-12-10").toISOString(),
			date_to: new Date("2026-12-12").toISOString(),
			vehicle_id: 1,
			user_id: users.admin.id,
		});
		expect(toast.success).toHaveBeenCalledWith("Reservation created successfully!");
		expect(router.push).toHaveBeenCalledWith("/reservations");
	});

	it("lets managers pick another user", async () => {
		loginAs("manager");
		const user = userEvent.setup();
		render(<ReservationForm />);
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		await pick(user, /Manager Alpha/, /Second Worker/);
		setDates("2026-12-10", "2026-12-12");
		await user.click(screen.getByRole("button", { name: "Create Reservation" }));
		await waitFor(() => expect(reservationsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 4 })));
	});

	it("does not let workers book for anyone but themselves", async () => {
		loginAs("worker");
		const user = userEvent.setup();
		render(<ReservationForm />);
		expect(screen.queryByRole("button", { name: /Worker Alpha/ })).not.toBeInTheDocument();
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		setDates("2026-12-10", "2026-12-12");
		await user.click(screen.getByRole("button", { name: "Create Reservation" }));
		await waitFor(() => expect(reservationsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: users.worker.id })));
	});

	it.each([
		[400, "Invalid reservation data. Please check your inputs."],
		[409, "Vehicle is not available for the selected dates"],
	])("explains a %i response", async (status, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(reservationsApi.create).mockRejectedValue({ response: { status } });
		const user = userEvent.setup();
		render(<ReservationForm />);
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		setDates("2026-12-10", "2026-12-12");
		await user.click(screen.getByRole("button", { name: "Create Reservation" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
		expect(router.push).not.toHaveBeenCalled();
	});

	it("shows the backend's reason for other failures", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(reservationsApi.create).mockRejectedValue({ response: { status: 403, data: { detail: [{ loc: ["body"], msg: "Insufficient permissions" }] } } });
		const user = userEvent.setup();
		render(<ReservationForm />);
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		setDates("2026-12-10", "2026-12-12");
		await user.click(screen.getByRole("button", { name: "Create Reservation" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Insufficient permissions"));
	});

	describe("editing", () => {
		it("pre-fills dates, vehicle and user", () => {
			render(<ReservationForm reservation={reservation()} isEdit />);
			expect(dates()[0].value).toBe("2026-11-01");
			expect(dates()[1].value).toBe("2026-11-03");
			expect(screen.getByRole("button", { name: "AAA-111 - Ford Transit" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Worker Alpha (worker@example.com)" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Update Reservation" })).toBeInTheDocument();
		});

		it("can still edit a reservation that has already started", async () => {
			const user = userEvent.setup();
			render(<ReservationForm reservation={reservation({ date_from: "2020-01-01T00:00:00", date_to: "2020-01-03T00:00:00" })} isEdit />);
			fireEvent.change(dates()[1], { target: { value: "2020-01-05" } });
			await user.click(screen.getByRole("button", { name: "Update Reservation" }));
			await waitFor(() => expect(reservationsApi.update).toHaveBeenCalled());
		});

		it("updates the reservation", async () => {
			const user = userEvent.setup();
			// The date inputs have a native `min` of today, so use a reservation that starts in the future
			render(<ReservationForm reservation={reservation({ date_from: "2027-01-10T00:00:00", date_to: "2027-01-12T00:00:00" })} isEdit />);
			fireEvent.change(dates()[1], { target: { value: "2027-01-15" } });
			await user.click(screen.getByRole("button", { name: "Update Reservation" }));

			await waitFor(() => expect(reservationsApi.update).toHaveBeenCalledWith(4, expect.objectContaining({ vehicle_id: 1, user_id: 3, date_to: new Date("2027-01-15").toISOString() })));
			expect(reservationsApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Reservation updated successfully!");
		});
	});

	it("cancels back to the list", async () => {
		render(<ReservationForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/reservations");
	});
});
