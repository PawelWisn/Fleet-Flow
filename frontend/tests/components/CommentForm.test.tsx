import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../helpers")).apiMocks());

import { toast } from "react-hot-toast";
import CommentForm from "@/components/CommentForm";
import * as api from "@/services/api";
import { commentsApi } from "@/services/api";
import { comment } from "../fixtures";
import { pick, stubSearchApis } from "../helpers";
import { loginAs, router, users } from "../state";

describe("CommentForm", () => {
	beforeEach(() => {
		stubSearchApis(api);
		vi.mocked(commentsApi.create).mockResolvedValue(comment());
		vi.mocked(commentsApi.update).mockResolvedValue(comment());
	});

	it("requires text and a vehicle", async () => {
		render(<CommentForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Add Comment" }));

		expect(screen.getByText("Comment cannot be empty")).toBeInTheDocument();
		expect(screen.getByText("Vehicle is required")).toBeInTheDocument();
		expect(commentsApi.create).not.toHaveBeenCalled();
	});

	it("does not accept a comment made of spaces only", async () => {
		const user = userEvent.setup();
		render(<CommentForm />);
		await user.type(screen.getByPlaceholderText("Write your comment..."), "    ");
		await user.click(screen.getByRole("button", { name: "Add Comment" }));
		expect(screen.getByText("Comment cannot be empty")).toBeInTheDocument();
	});

	it("defaults the author to the signed-in user", () => {
		render(<CommentForm />);
		expect(screen.getByRole("button", { name: "Admin Root (admin@example.com)" })).toBeInTheDocument();
	});

	it("creates a comment with the current user as author", async () => {
		const user = userEvent.setup();
		render(<CommentForm />);
		await user.type(screen.getByPlaceholderText("Write your comment..."), "  Needs new tyres  ");
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		await user.click(screen.getByRole("button", { name: "Add Comment" }));

		await waitFor(() => expect(commentsApi.create).toHaveBeenCalledWith({ content: "Needs new tyres", vehicle_id: 1, user_id: users.admin.id }));
		expect(toast.success).toHaveBeenCalledWith("Comment created successfully");
		expect(router.push).toHaveBeenCalledWith("/comments");
	});

	it("lets managers and admins write on behalf of another user", async () => {
		loginAs("manager");
		const user = userEvent.setup();
		render(<CommentForm />);
		await user.type(screen.getByPlaceholderText("Write your comment..."), "Hi");
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		await pick(user, /Manager Alpha/, /Second Worker/);
		await user.click(screen.getByRole("button", { name: "Add Comment" }));

		await waitFor(() => expect(commentsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 4 })));
	});

	it("fixes the author for workers (the backend would reject anyone else)", async () => {
		loginAs("worker");
		const user = userEvent.setup();
		render(<CommentForm />);
		expect(screen.queryByRole("button", { name: /Worker Alpha/ })).not.toBeInTheDocument();
		expect(screen.getByText("Worker Alpha (worker@example.com)").tagName).toBe("P");

		await user.type(screen.getByPlaceholderText("Write your comment..."), "Hello");
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		await user.click(screen.getByRole("button", { name: "Add Comment" }));

		await waitFor(() => expect(commentsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: users.worker.id })));
	});

	it("counts characters", async () => {
		const user = userEvent.setup();
		render(<CommentForm />);
		await user.type(screen.getByPlaceholderText("Write your comment..."), "12345");
		expect(screen.getByText("5/1000")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Write your comment...")).toHaveAttribute("maxlength", "1000");
	});

	it("reports a failed save", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(commentsApi.create).mockRejectedValue({ response: { data: { detail: "Insufficient permissions" } } });
		const user = userEvent.setup();
		render(<CommentForm />);
		await user.type(screen.getByPlaceholderText("Write your comment..."), "Hello");
		await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
		await user.click(screen.getByRole("button", { name: "Add Comment" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Insufficient permissions"));
		expect(router.push).not.toHaveBeenCalled();
	});

	it("preselects the vehicle from the add page", () => {
		render(<CommentForm defaultVehicleId={1} />);
		expect(screen.queryByText("Vehicle is required")).not.toBeInTheDocument();
	});

	describe("editing", () => {
		it("pre-fills the comment, vehicle and author", () => {
			render(<CommentForm comment={comment()} isEdit />);
			expect(screen.getByPlaceholderText("Write your comment...")).toHaveValue("Tyres need checking");
			expect(screen.getByRole("button", { name: "AAA-111 - Ford Transit" })).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Worker Alpha (worker@example.com)" })).toBeInTheDocument();
		});

		it("sends the original date back so the backend does not reset it", async () => {
			const user = userEvent.setup();
			render(<CommentForm comment={comment({ date: "2026-05-05T12:00:00" })} isEdit />);
			await user.type(screen.getByPlaceholderText("Write your comment..."), " today");
			await user.click(screen.getByRole("button", { name: "Update Comment" }));

			await waitFor(() =>
				expect(commentsApi.update).toHaveBeenCalledWith(11, { content: "Tyres need checking today", date: "2026-05-05T12:00:00", vehicle_id: 1, user_id: 3 }),
			);
			expect(commentsApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Comment updated successfully");
		});
	});

	it("cancels back to the list", async () => {
		render(<CommentForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/comments");
	});
});
