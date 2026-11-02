import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../helpers")).apiMocks());

import { toast } from "react-hot-toast";
import DocumentForm from "@/components/DocumentForm";
import * as api from "@/services/api";
import { documentsApi } from "@/services/api";
import { document as makeDocument } from "../fixtures";
import { pick, stubSearchApis } from "../helpers";
import { loginAs, router, users } from "../state";

type U = ReturnType<typeof userEvent.setup>;
const submit = () => fireEvent.submit(document.querySelector("form")!);
const fileInput = () => document.querySelector("input[type=file]") as HTMLInputElement;

async function fillValid(user: U) {
	await user.type(screen.getByPlaceholderText("Document title"), "Lease");
	await user.selectOptions(screen.getByRole("combobox"), "manual");
	await user.type(screen.getByPlaceholderText("Document description..."), "Signed copy");
	await pick(user, "Select a vehicle", "AAA-111 - Ford Transit");
}

describe("DocumentForm", () => {
	beforeEach(() => {
		stubSearchApis(api);
		vi.mocked(documentsApi.create).mockResolvedValue(makeDocument());
		vi.mocked(documentsApi.update).mockResolvedValue(makeDocument());
		vi.mocked(documentsApi.getById).mockResolvedValue(makeDocument());
	});

	it("offers the document types", () => {
		render(<DocumentForm />);
		const select = screen.getByRole("combobox") as HTMLSelectElement;
		expect([...select.options].map((o) => o.value)).toEqual(["", "registration", "insurance", "maintenance", "inspection", "manual", "other"]);
	});

	it("asks for the missing fields", () => {
		render(<DocumentForm />);
		submit();
		expect(toast.error).toHaveBeenCalledWith("Please fill in all required fields");
		expect(documentsApi.create).not.toHaveBeenCalled();
	});

	it("creates a document without a file", async () => {
		const user = userEvent.setup();
		render(<DocumentForm />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: /Create Document/ }));

		await waitFor(() => expect(documentsApi.create).toHaveBeenCalledTimes(1));
		expect(documentsApi.create).toHaveBeenCalledWith({ title: "Lease", description: "Signed copy", file_type: "manual", vehicle_id: 1, user_id: users.admin.id });
		expect(toast.success).toHaveBeenCalledWith("Document created successfully!");
		expect(router.push).toHaveBeenCalledWith("/documents");
	});

	it("sends the selected file along", async () => {
		const user = userEvent.setup();
		render(<DocumentForm />);
		await fillValid(user);
		const file = new File(["data"], "lease.pdf", { type: "application/pdf" });
		await user.upload(fileInput(), file);
		expect(screen.getByText("Selected: lease.pdf")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: /Create Document/ }));

		await waitFor(() => expect(documentsApi.create).toHaveBeenCalled());
		expect(vi.mocked(documentsApi.create).mock.calls[0][0]).toMatchObject({ file });
	});

	it("keeps workers as the owner of their documents", async () => {
		loginAs("worker");
		const user = userEvent.setup();
		render(<DocumentForm />);
		expect(screen.queryByRole("button", { name: /Worker Alpha/ })).not.toBeInTheDocument();
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: /Create Document/ }));
		await waitFor(() => expect(documentsApi.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: users.worker.id })));
	});

	it.each([
		[400, "Invalid document data. Please check your inputs."],
		[403, "You don't have permission to perform this action"],
		[500, "Failed to create document"],
	])("explains a %i response", async (status, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(documentsApi.create).mockRejectedValue({ response: { status } });
		const user = userEvent.setup();
		render(<DocumentForm />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: /Create Document/ }));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
		expect(router.push).not.toHaveBeenCalled();
	});

	describe("editing", () => {
		it("loads the document by id and pre-fills the form", async () => {
			render(<DocumentForm documentId="5" isEdit />);
			expect(await screen.findByDisplayValue("Registration card")).toBeInTheDocument();
			expect(documentsApi.getById).toHaveBeenCalledWith(5);
			expect(screen.getByPlaceholderText("Document description...")).toHaveValue("Official paper");
			expect(screen.getByRole("combobox")).toHaveValue("registration");
			expect(screen.getByRole("button", { name: "AAA-111 - Ford Transit" })).toBeInTheDocument();
		});

		it("accepts the document directly", () => {
			render(<DocumentForm document={makeDocument({ title: "Passed in" })} isEdit />);
			expect(screen.getByDisplayValue("Passed in")).toBeInTheDocument();
		});

		it("updates without touching the file unless one is chosen", async () => {
			const user = userEvent.setup();
			render(<DocumentForm documentId="5" isEdit />);
			const title = await screen.findByDisplayValue("Registration card");
			await user.clear(title);
			await user.type(title, "Renamed");
			await user.click(screen.getByRole("button", { name: /Update Document/ }));

			await waitFor(() => expect(documentsApi.update).toHaveBeenCalledTimes(1));
			expect(documentsApi.update).toHaveBeenCalledWith(5, { title: "Renamed", description: "Official paper", file_type: "registration", vehicle_id: 1, user_id: 3 });
			expect(documentsApi.create).not.toHaveBeenCalled();
			expect(toast.success).toHaveBeenCalledWith("Document updated successfully!");
		});

		it("sends a replacement file", async () => {
			const user = userEvent.setup();
			render(<DocumentForm documentId="5" isEdit />);
			await screen.findByDisplayValue("Registration card");
			const file = new File(["new"], "new.pdf");
			await user.upload(fileInput(), file);
			await user.click(screen.getByRole("button", { name: /Update Document/ }));
			await waitFor(() => expect(documentsApi.update).toHaveBeenCalled());
			expect(vi.mocked(documentsApi.update).mock.calls[0][1]).toMatchObject({ file });
		});

		it("reports a document that cannot be loaded", async () => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			vi.mocked(documentsApi.getById).mockRejectedValue(new Error("404"));
			render(<DocumentForm documentId="5" isEdit />);
			await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load form data"));
		});
	});

	it("cancels back to the list", async () => {
		render(<DocumentForm />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Cancel" }));
		expect(router.push).toHaveBeenCalledWith("/documents");
	});
});
