import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ api: { post: vi.fn() }, default: { post: vi.fn() } }));

import { toast } from "react-hot-toast";
import LoginPage from "@/app/page";
import { api } from "@/lib/api";
import { router } from "../state";

const email = () => screen.getByPlaceholderText("Enter your email");
const password = () => screen.getByPlaceholderText("Enter your password");
const submit = () => screen.getByRole("button", { name: /sign in/i });

describe("login page", () => {
	beforeEach(() => {
		vi.mocked(api.post).mockReset().mockResolvedValue({ data: { user: { id: 1, name: "Admin", role: "admin" } } });
	});

	it("signs in, remembers the user and goes to the dashboard", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);
		await user.type(email(), "admin@example.com");
		await user.type(password(), "Secret1!");
		await user.click(submit());

		await waitFor(() => expect(api.post).toHaveBeenCalledWith("/users/login/", { email: "admin@example.com", password: "Secret1!" }));
		expect(JSON.parse(localStorage.getItem("userData")!)).toMatchObject({ id: 1, role: "admin" });
		expect(toast.success).toHaveBeenCalledWith("Login successful!");
		expect(router.push).toHaveBeenCalledWith("/dashboard");
	});

	it("does not call the API with empty fields", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);
		// HTML `required` would block the click, so submit the form directly
		const form = email().closest("form")!;
		form.requestSubmit?.call(form);
		await user.click(submit());
		expect(api.post).not.toHaveBeenCalled();
	});

	it.each([
		[401, "Invalid email or password"],
		[422, "Please check your email and password format"],
		[500, "Login failed. Please try again."],
	])("explains a %i response and stays on the page", async (status, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(api.post).mockRejectedValue({ response: { status } });
		const user = userEvent.setup();
		render(<LoginPage />);
		await user.type(email(), "a@b.co");
		await user.type(password(), "wrong");
		await user.click(submit());

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
		expect(router.push).not.toHaveBeenCalled();
		expect(localStorage.getItem("userData")).toBeNull();
	});

	it("explains a network failure", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(api.post).mockRejectedValue(new Error("Network Error"));
		const user = userEvent.setup();
		render(<LoginPage />);
		await user.type(email(), "a@b.co");
		await user.type(password(), "x");
		await user.click(submit());
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Login failed. Please try again."));
	});

	it("can reveal the password", async () => {
		const user = userEvent.setup();
		render(<LoginPage />);
		expect(password()).toHaveAttribute("type", "password");
		await user.click(password().parentElement!.querySelector("button")!);
		expect(password()).toHaveAttribute("type", "text");
	});
});
