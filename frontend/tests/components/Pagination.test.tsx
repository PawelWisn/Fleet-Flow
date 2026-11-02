import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Pagination from "@/components/Pagination";

function setup(props: Partial<React.ComponentProps<typeof Pagination>> = {}) {
	const onPageChange = vi.fn();
	const onPageSizeChange = vi.fn();
	render(<Pagination currentPage={1} totalPages={5} totalItems={72} itemsPerPage={15} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} {...props} />);
	return { onPageChange, onPageSizeChange, user: userEvent.setup() };
}

const numberedButtons = () => screen.getAllByRole("button").filter((b) => /^\d+$/.test(b.textContent || "")).map((b) => b.textContent);

describe("Pagination", () => {
	it("renders nothing for a single page", () => {
		const { container } = render(<Pagination currentPage={1} totalPages={1} totalItems={3} itemsPerPage={15} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the item range", () => {
		setup({ currentPage: 2 });
		expect(screen.getByText("16")).toBeInTheDocument();
		expect(screen.getByText("30")).toBeInTheDocument();
		expect(screen.getByText("72")).toBeInTheDocument();
	});

	it("clamps the range end on the last page", () => {
		setup({ currentPage: 5 });
		expect(screen.getByText("61")).toBeInTheDocument();
		expect(screen.getAllByText("72")).toHaveLength(2); // range end and total
	});

	it("disables Previous on the first page and Next on the last", () => {
		setup({ currentPage: 1 });
		for (const button of screen.getAllByRole("button", { name: "Previous" })) expect(button).toBeDisabled();
		for (const button of screen.getAllByRole("button", { name: "Next" })) expect(button).toBeEnabled();
	});

	it("disables Next on the last page", () => {
		setup({ currentPage: 5 });
		for (const button of screen.getAllByRole("button", { name: "Next" })) expect(button).toBeDisabled();
	});

	it("navigates with the arrows and the page numbers", async () => {
		const { user, onPageChange } = setup({ currentPage: 3 });
		await user.click(screen.getAllByRole("button", { name: "Next" })[1]);
		expect(onPageChange).toHaveBeenLastCalledWith(4);
		await user.click(screen.getAllByRole("button", { name: "Previous" })[1]);
		expect(onPageChange).toHaveBeenLastCalledWith(2);
		await user.click(screen.getByRole("button", { name: "5" }));
		expect(onPageChange).toHaveBeenLastCalledWith(5);
	});

	it("elides pages far from the current one", () => {
		setup({ currentPage: 10, totalPages: 20, totalItems: 300 });
		expect(numberedButtons()).toEqual(["1", "8", "9", "10", "11", "12", "20"]);
		expect(screen.getAllByText("...")).toHaveLength(2);
	});

	it("does not elide on short lists", () => {
		setup({ currentPage: 1, totalPages: 3 });
		expect(numberedButtons()).toEqual(["1", "2", "3"]);
		expect(screen.queryByText("...")).not.toBeInTheDocument();
	});

	it("reports page size changes as numbers", async () => {
		const { user, onPageSizeChange } = setup();
		await user.selectOptions(screen.getByLabelText("Items per page:"), "50");
		expect(onPageSizeChange).toHaveBeenCalledWith(50);
	});
});
