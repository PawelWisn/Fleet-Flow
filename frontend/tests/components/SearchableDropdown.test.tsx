import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import SearchableDropdown from "@/components/SearchableDropdown";

type Item = { id: number; name: string };
const items = (...names: string[]): Item[] => names.map((name, i) => ({ id: i + 1, name }));

function setup(overrides: Partial<React.ComponentProps<typeof SearchableDropdown<Item>>> = {}) {
	const onChange = vi.fn();
	const onSearch = vi.fn(async (_term: string, _page: number) => ({ items: items("Alpha", "Beta", "Gamma"), hasMore: false }));
	const props = {
		value: "",
		onChange,
		onSearch,
		renderOption: (item: Item) => ({ value: String(item.id), label: item.name }),
		placeholder: "Pick one",
		label: "Thing",
		...overrides,
	};
	const view = render(<SearchableDropdown<Item> {...props} />);
	return { onChange, onSearch: (overrides.onSearch ?? onSearch) as typeof onSearch, user: userEvent.setup(), ...view };
}

describe("SearchableDropdown", () => {
	it("shows the placeholder, the label and a required marker", () => {
		setup({ required: true });
		expect(screen.getByRole("button", { name: "Pick one" })).toBeInTheDocument();
		expect(screen.getByText("Thing")).toBeInTheDocument();
		expect(screen.getByText("*")).toBeInTheDocument();
	});

	it("does not load anything until it is opened", () => {
		const { onSearch } = setup();
		expect(onSearch).not.toHaveBeenCalled();
	});

	it("loads the first page when opened and lists the options", async () => {
		const { user, onSearch } = setup();
		await user.click(screen.getByRole("button", { name: "Pick one" }));

		expect(await screen.findByRole("button", { name: "Beta" })).toBeInTheDocument();
		expect(onSearch).toHaveBeenCalledWith("", 1);
	});

	it("reports both value and label when an option is chosen, then closes", async () => {
		const { user, onChange } = setup();
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		await user.click(await screen.findByRole("button", { name: "Beta" }));

		expect(onChange).toHaveBeenCalledWith("2", "Beta");
		expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
	});

	it("shows the chosen option once the parent feeds the value back", async () => {
		function Controlled() {
			const [value, setValue] = useState("");
			return (
				<SearchableDropdown<Item>
					value={value}
					onChange={setValue}
					onSearch={async () => ({ items: items("Alpha", "Beta"), hasMore: false })}
					renderOption={(item) => ({ value: String(item.id), label: item.name })}
					placeholder="Pick one"
					label="Thing"
				/>
			);
		}
		const user = userEvent.setup();
		render(<Controlled />);
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		await user.click(await screen.findByRole("button", { name: "Beta" }));
		expect(screen.getByRole("button", { name: "Beta" })).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Pick one" })).not.toBeInTheDocument();
	});

	it("searches (debounced) with the typed term", async () => {
		const { user, onSearch } = setup();
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		await screen.findByRole("button", { name: "Alpha" });

		await user.type(screen.getByPlaceholderText("Search..."), "gam");

		await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith("gam", 1));
		// typing three characters must not trigger three requests
		expect(onSearch.mock.calls.filter(([term]) => term !== "" ).length).toBe(1);
	});

	it("explains when nothing matches", async () => {
		const onSearch = vi.fn(async (term: string) => ({ items: term ? [] : items("Alpha"), hasMore: false }));
		const { user } = setup({ onSearch });
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		await screen.findByRole("button", { name: "Alpha" });
		await user.type(screen.getByPlaceholderText("Search..."), "zzz");

		expect(await screen.findByText("No results found")).toBeInTheDocument();
	});

	it("says so when there is nothing to choose from", async () => {
		const { user } = setup({ onSearch: vi.fn(async () => ({ items: [], hasMore: false })) });
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		expect(await screen.findByText("No items available")).toBeInTheDocument();
	});

	it("shows the label supplied for the current value without searching for it", () => {
		const { onSearch } = setup({ value: "42", valueLabel: "Delta (not on the first page)" });
		expect(screen.getByRole("button", { name: "Delta (not on the first page)" })).toBeInTheDocument();
		expect(onSearch).not.toHaveBeenCalled();
	});

	it("follows a changed valueLabel", () => {
		const { rerender, onSearch } = setup({ value: "1", valueLabel: "Old" });
		rerender(
			<SearchableDropdown<Item>
				value="2"
				valueLabel="New"
				onChange={vi.fn()}
				onSearch={onSearch}
				renderOption={(item) => ({ value: String(item.id), label: item.name })}
				placeholder="Pick one"
				label="Thing"
			/>,
		);
		expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
	});

	it("resolves the label of a preset value from the first page when it is there", async () => {
		setup({ value: "2" });
		expect(await screen.findByRole("button", { name: "Beta" })).toBeInTheDocument();
	});

	it("does not keep refetching when a preset value is not on the first page (regression: infinite loop)", async () => {
		const { onSearch } = setup({ value: "99" });
		await waitFor(() => expect(onSearch).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 150));
		expect(onSearch.mock.calls.length).toBe(1);
	});

	it("marks the selected option", async () => {
		const { user } = setup({ value: "2", valueLabel: "Beta" });
		await user.click(screen.getByRole("button", { name: "Beta" }));
		const option = await screen.findAllByRole("button", { name: "Beta" });
		expect(option.some((el) => el.className.includes("bg-blue-50"))).toBe(true);
	});

	it("closes when clicking outside", async () => {
		const { user } = setup();
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		await screen.findByPlaceholderText("Search...");
		await user.click(document.body);
		expect(screen.queryByPlaceholderText("Search...")).not.toBeInTheDocument();
	});

	it("loads further pages when scrolled to the bottom", async () => {
		const onSearch = vi.fn(async (_t: string, page: number) => ({ items: page === 1 ? items("One", "Two") : [{ id: 3, name: "Three" }], hasMore: page === 1 }));
		const { user } = setup({ onSearch });
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		await screen.findByRole("button", { name: "One" });

		const list = screen.getByRole("button", { name: "One" }).parentElement!;
		Object.defineProperty(list, "scrollHeight", { value: 100, configurable: true });
		Object.defineProperty(list, "clientHeight", { value: 100, configurable: true });
		list.scrollTop = 0;
		list.dispatchEvent(new Event("scroll", { bubbles: true }));

		expect(await screen.findByRole("button", { name: "Three" })).toBeInTheDocument();
		expect(onSearch).toHaveBeenCalledWith("", 2);
	});

	it("survives a failing search", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { user } = setup({ onSearch: vi.fn(async () => Promise.reject(new Error("boom"))) });
		await user.click(screen.getByRole("button", { name: "Pick one" }));
		expect(await screen.findByText("No items available")).toBeInTheDocument();
		error.mockRestore();
	});
});
