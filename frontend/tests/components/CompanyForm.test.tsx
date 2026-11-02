import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { toast } from "react-hot-toast";
import CompanyForm from "@/components/CompanyForm";
import { company } from "../fixtures";
import { router } from "../state";

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
	await user.type(input("name"), "New Co");
	await user.type(input("nip"), "1234567890");
	await user.type(input("address1"), "Long Street 5");
	await user.type(input("city"), "Gdansk");
	await user.type(input("post_code"), "80-001");
	await user.type(input("country"), "Poland");
}

describe("CompanyForm", () => {
	it("lists every missing field", async () => {
		const onSubmit = vi.fn();
		render(<CompanyForm onSubmit={onSubmit} />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Create Company" }));

		for (const message of [
			"Company name is required",
			"Post code is required",
			"Address line 1 is required",
			"City is required",
			"Country is required",
			"NIP (Tax ID) is required",
		]) {
			expect(screen.getByText(message)).toBeInTheDocument();
		}
		expect(toast.error).toHaveBeenCalledWith("Please fix the errors in the form");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("keeps only digits in the NIP and caps it at ten", async () => {
		render(<CompanyForm onSubmit={vi.fn()} />);
		fireEvent.change(input("nip"), { target: { value: "12-34 5678901234" } });
		expect(input("nip").value).toBe("1234567890");
	});

	it("requires the NIP to be ten digits", async () => {
		const onSubmit = vi.fn();
		const user = userEvent.setup();
		render(<CompanyForm onSubmit={onSubmit} />);
		await fillValid(user);
		await user.clear(input("nip"));
		await user.type(input("nip"), "123");
		await user.click(screen.getByRole("button", { name: "Create Company" }));
		expect(screen.getByText("NIP must be exactly 10 characters")).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("limits the lengths the API enforces", () => {
		render(<CompanyForm onSubmit={vi.fn()} />);
		expect(input("post_code")).toHaveAttribute("maxlength", "8");
		expect(input("nip")).toHaveAttribute("maxlength", "10");
		expect(input("address1")).toHaveAttribute("maxlength", "128");
	});

	it("submits the entered data", async () => {
		const onSubmit = vi.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();
		render(<CompanyForm onSubmit={onSubmit} />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create Company" }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "New Co", nip: "1234567890", address1: "Long Street 5", address2: "", city: "Gdansk", post_code: "80-001", country: "Poland" }));
	});

	it("clears an error once the field is edited", async () => {
		const user = userEvent.setup();
		render(<CompanyForm onSubmit={vi.fn()} />);
		await user.click(screen.getByRole("button", { name: "Create Company" }));
		expect(screen.getByText("City is required")).toBeInTheDocument();
		await user.type(input("city"), "W");
		expect(screen.queryByText("City is required")).not.toBeInTheDocument();
	});

	it("reports an exception thrown by the parent's submit handler", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const onSubmit = vi.fn().mockRejectedValue(new Error("boom"));
		const user = userEvent.setup();
		render(<CompanyForm onSubmit={onSubmit} />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create Company" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to save company"));
	});

	it("disables the buttons and says so while saving", () => {
		render(<CompanyForm onSubmit={vi.fn()} isLoading />);
		expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
	});

	describe("editing", () => {
		it("pre-fills the company", () => {
			render(<CompanyForm company={company()} onSubmit={vi.fn()} />);
			expect(input("name").value).toBe("Alpha Logistics");
			expect(input("nip").value).toBe("1111111111");
			expect(input("city").value).toBe("Warsaw");
			expect(screen.getByRole("button", { name: "Update Company" })).toBeInTheDocument();
		});

		it("sends description, phone and is_internal back unchanged (the API resets omitted fields)", async () => {
			const onSubmit = vi.fn().mockResolvedValue(undefined);
			const user = userEvent.setup();
			render(<CompanyForm company={company({ description: "Freight", phone: "555", is_internal: false })} onSubmit={onSubmit} />);
			await user.clear(input("city"));
			await user.type(input("city"), "Krakow");
			await user.click(screen.getByRole("button", { name: "Update Company" }));

			await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ city: "Krakow", description: "Freight", phone: "555", is_internal: false })));
		});
	});

	it("goes back when cancelled", async () => {
		render(<CompanyForm onSubmit={vi.fn()} />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.back).toHaveBeenCalled();
	});
});
