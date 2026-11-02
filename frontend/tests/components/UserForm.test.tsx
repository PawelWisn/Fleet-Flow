import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
	usersApi: { getById: vi.fn(), create: vi.fn(), update: vi.fn() },
	companiesApi: { getAll: vi.fn() },
}));

import { toast } from "react-hot-toast";
import UserForm from "@/components/UserForm";
import { companiesApi, usersApi } from "@/services/api";
import { company, page, user as makeUser } from "../fixtures";
import { loginAs, router } from "../state";

const submit = () => fireEvent.submit(document.querySelector("form")!);
const name = () => screen.getByPlaceholderText("Enter full name");
const email = () => screen.getByPlaceholderText("user@example.com");

async function fillValid(user: ReturnType<typeof userEvent.setup>, password = "Str0ng!pass") {
	await user.type(name(), "New Person");
	await user.type(email(), "new@example.com");
	await user.type(screen.getByPlaceholderText("Enter password"), password);
	await user.type(screen.getByPlaceholderText("Confirm password"), password);
}

describe("UserForm", () => {
	beforeEach(() => {
		vi.mocked(companiesApi.getAll).mockResolvedValue(page([company(), company({ id: 2, name: "Beta Transport" })]) as any);
		vi.mocked(usersApi.create).mockResolvedValue(makeUser());
		vi.mocked(usersApi.update).mockResolvedValue(makeUser());
		vi.mocked(usersApi.getById).mockResolvedValue(makeUser({ id: 3, name: "Loaded User", email: "loaded@example.com", role: "manager", company_id: 2 }));
	});

	const renderForm = async (props: React.ComponentProps<typeof UserForm> = {}) => {
		const view = render(<UserForm {...props} />);
		await screen.findByText(props.isEdit ? "Edit User" : "Create New User");
		return view;
	};

	it("offers every role to admins", async () => {
		await renderForm();
		const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
		expect([...select.options].map((o) => o.value)).toEqual(["worker", "manager", "admin"]);
	});

	it("does not offer the admin role to managers", async () => {
		loginAs("manager");
		await renderForm();
		const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
		expect([...select.options].map((o) => o.value)).toEqual(["worker", "manager"]);
		expect(screen.queryByText("Full system access")).not.toBeInTheDocument();
	});

	it("validates required fields", async () => {
		await renderForm();
		submit();
		expect(screen.getByText("Email is required")).toBeInTheDocument();
		expect(screen.getByText("Name is required")).toBeInTheDocument();
		expect(screen.getByText("Password is required")).toBeInTheDocument();
		expect(toast.error).toHaveBeenCalledWith("Please fix the errors in the form");
		expect(usersApi.create).not.toHaveBeenCalled();
	});

	it.each(["plainaddress", "a@b", "a b@c.de"])("rejects the email %s", async (value) => {
		const user = userEvent.setup();
		await renderForm();
		await user.type(name(), "N");
		fireEvent.change(email(), { target: { value } });
		await user.type(screen.getByPlaceholderText("Enter password"), "Str0ng!pass");
		await user.type(screen.getByPlaceholderText("Confirm password"), "Str0ng!pass");
		submit();
		expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
	});

	it("rejects short passwords and mismatches", async () => {
		const user = userEvent.setup();
		await renderForm();
		await user.type(name(), "N");
		await user.type(email(), "n@example.com");
		await user.type(screen.getByPlaceholderText("Enter password"), "short");
		await user.type(screen.getByPlaceholderText("Confirm password"), "different");
		submit();
		expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
		expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
	});

	it("can reveal and hide the password", async () => {
		const user = userEvent.setup();
		await renderForm();
		const password = screen.getByPlaceholderText("Enter password");
		expect(password).toHaveAttribute("type", "password");
		await user.click(password.parentElement!.querySelector("button")!);
		expect(password).toHaveAttribute("type", "text");
	});

	it("creates a user, treating a missing company as none", async () => {
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create User" }));

		await waitFor(() => expect(usersApi.create).toHaveBeenCalledTimes(1));
		expect(usersApi.create).toHaveBeenCalledWith({ email: "new@example.com", name: "New Person", role: "worker", company_id: undefined, password1: "Str0ng!pass", password2: "Str0ng!pass" });
		expect(toast.success).toHaveBeenCalledWith("User created successfully!");
		expect(router.push).toHaveBeenCalledWith("/users");
	});

	it("sends the chosen role and company as numbers", async () => {
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		const [role, companySelect] = screen.getAllByRole("combobox");
		await user.selectOptions(role, "manager");
		await user.selectOptions(companySelect, "2");
		await user.click(screen.getByRole("button", { name: "Create User" }));
		await waitFor(() => expect(usersApi.create).toHaveBeenCalledWith(expect.objectContaining({ role: "manager", company_id: 2 })));
	});

	it.each([
		[400, { detail: "email taken" }, "Email already exists"],
		[400, { detail: "bad" }, "Invalid user data. Please check your inputs."],
		[403, {}, "You don't have permission to perform this action"],
		[500, {}, "Failed to create user"],
	])("explains a %i response", async (status, data, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(usersApi.create).mockRejectedValue({ response: { status, data } });
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create User" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
		expect(router.push).not.toHaveBeenCalled();
	});

	it("shows the backend's validation message for a 422 (duplicate email, password rules)", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(usersApi.create).mockRejectedValue({ response: { status: 422, data: { detail: [{ loc: ["body"], msg: "This email has already been taken." }] } } });
		const user = userEvent.setup();
		await renderForm();
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "Create User" }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This email has already been taken."));
	});

	describe("editing", () => {
		it("loads the user by id", async () => {
			await renderForm({ userId: "3", isEdit: true });
			expect(usersApi.getById).toHaveBeenCalledWith(3);
			expect(name()).toHaveValue("Loaded User");
			expect(email()).toHaveValue("loaded@example.com");
			expect(screen.getAllByRole("combobox")[0]).toHaveValue("manager");
			expect(screen.getAllByRole("combobox")[1]).toHaveValue("2");
		});

		it("makes the password optional", async () => {
			const user = userEvent.setup();
			await renderForm({ user: makeUser(), isEdit: true });
			await user.click(screen.getByRole("button", { name: "Update User" }));

			await waitFor(() => expect(usersApi.update).toHaveBeenCalledTimes(1));
			expect(usersApi.update).toHaveBeenCalledWith(3, { email: "worker@example.com", name: "Worker Alpha", role: "worker", company_id: 1 });
			expect(toast.success).toHaveBeenCalledWith("User updated successfully!");
			expect(usersApi.create).not.toHaveBeenCalled();
		});

		it("sends the new password when one is typed", async () => {
			const user = userEvent.setup();
			await renderForm({ user: makeUser(), isEdit: true });
			await user.type(screen.getByPlaceholderText("New password (optional)"), "N3w!password");
			await user.type(screen.getByPlaceholderText("Confirm new password"), "N3w!password");
			await user.click(screen.getByRole("button", { name: "Update User" }));
			await waitFor(() => expect(usersApi.update).toHaveBeenCalledWith(3, expect.objectContaining({ password1: "N3w!password", password2: "N3w!password" })));
		});

		it("still validates a password that was started", async () => {
			const user = userEvent.setup();
			await renderForm({ user: makeUser(), isEdit: true });
			await user.type(screen.getByPlaceholderText("New password (optional)"), "N3w!password");
			// the confirmation field becomes natively required, so go through the form's own submit handler
			submit();
			expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
			expect(usersApi.update).not.toHaveBeenCalled();
		});

		it("reports a user that cannot be loaded", async () => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			vi.mocked(usersApi.getById).mockRejectedValue(new Error("404"));
			render(<UserForm userId="3" isEdit />);
			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load form data"));
		});
	});

	it("cancels back to the list", async () => {
		await renderForm();
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/users");
	});
});
