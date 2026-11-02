import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
	vehiclesApi: { getAll: vi.fn(), getById: vi.fn() },
	usersApi: { getAll: vi.fn() },
	documentsApi: { getAll: vi.fn() },
	companiesApi: { getAll: vi.fn() },
}));

import { toast } from "react-hot-toast";
import AddPage from "@/components/AddPage";
import EditLoader from "@/components/EditLoader";
import ResourceDetail, { DetailCard, DetailField } from "@/components/ResourceDetail";
import ResourceList from "@/components/ResourceList";
import { vehiclesApi } from "@/services/api";
import { page, vehicle } from "../fixtures";
import { router, setRoute } from "../state";

type Row = { id: number; name: string };
const rows = (...names: string[]): Row[] => names.map((name, i) => ({ id: i + 1, name }));

describe("ResourceList", () => {
	let fetchPage: ReturnType<typeof vi.fn>;
	let deleteItem: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		fetchPage = vi.fn().mockResolvedValue(page(rows("Alpha", "Beta")));
		deleteItem = vi.fn().mockResolvedValue(undefined);
		vi.mocked(vehiclesApi.getAll).mockResolvedValue(page([vehicle()]) as any);
		vi.mocked(vehiclesApi.getById).mockResolvedValue(vehicle({ id: 3, registration_number: "ZZ 333" }));
	});

	const renderList = (props: Partial<React.ComponentProps<typeof ResourceList<Row>>> = {}) =>
		render(
			<ResourceList<Row>
				title="Widgets"
				subtitle="All widgets"
				basePath="/widgets"
				singularName="widget"
				pluralName="widgets"
				fetchPage={fetchPage as any}
				deleteItem={deleteItem as any}
				renderCard={(row) => <p>{row.name}</p>}
				{...props}
			/>,
		);

	it("loads the first page and renders a card per item", async () => {
		renderList();
		expect(await screen.findByText("Alpha")).toBeInTheDocument();
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(fetchPage).toHaveBeenCalledWith({ page: 1, size: 15, vehicleId: undefined, mode: "" });
		expect(screen.getByText("Widgets")).toBeInTheDocument();
	});

	it("shows an empty state", async () => {
		fetchPage.mockResolvedValue(page([]));
		renderList();
		expect(await screen.findByText("No widgets found")).toBeInTheDocument();
	});

	it("reports a failed fetch", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		fetchPage.mockRejectedValue({ response: { data: { detail: "Database is down" } } });
		renderList();
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Database is down"));
	});

	it("shows pagination only for several pages and refetches when the page changes", async () => {
		fetchPage.mockResolvedValue(page(rows("Alpha"), { total: 40, pages: 3, size: 15 }));
		renderList();
		await screen.findByText("Alpha");

		await userEvent.setup().click(screen.getByRole("button", { name: "2" }));

		await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
	});

	it("applies the vehicle filter from the URL and shows its label", async () => {
		setRoute({ search: "vehicle_id=3" });
		renderList();

		await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(expect.objectContaining({ vehicleId: 3 })));
		expect(await screen.findByRole("button", { name: "ZZ 333 - Ford Transit" })).toBeInTheDocument();
		expect(vehiclesApi.getById).toHaveBeenCalledWith(3);
	});

	it("falls back to the vehicle id when its label cannot be loaded", async () => {
		setRoute({ search: "vehicle_id=3" });
		vi.mocked(vehiclesApi.getById).mockRejectedValue(new Error("404"));
		renderList();
		expect(await screen.findByRole("button", { name: "Vehicle #3" })).toBeInTheDocument();
	});

	it("clears the vehicle filter", async () => {
		setRoute({ search: "vehicle_id=3" });
		renderList();
		await screen.findByRole("button", { name: "ZZ 333 - Ford Transit" });

		await userEvent.setup().click(screen.getByRole("button", { name: /Clear filter/ }));

		expect(router.replace).toHaveBeenCalledWith("/widgets");
		await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ vehicleId: undefined })));
		expect(screen.queryByRole("button", { name: /Clear filter/ })).not.toBeInTheDocument();
	});

	it("filters by a vehicle picked from the dropdown", async () => {
		renderList();
		await screen.findByText("Alpha");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "Filter by vehicle" }));
		await user.click(await screen.findByRole("button", { name: "AAA-111 - Ford Transit" }));

		await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ vehicleId: 1 })));
	});

	it("switches between modes, starting from the first", async () => {
		renderList({ modes: [{ value: "all", label: "All" }, { value: "soon", label: "Ending soon" }] });
		await screen.findByText("Alpha");
		expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "all" }));

		await userEvent.setup().click(screen.getByRole("button", { name: "Ending soon" }));

		await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "soon", page: 1 })));
	});

	it("does not render a switch for a single mode", async () => {
		renderList({ modes: [{ value: "all", label: "All" }] });
		await screen.findByText("Alpha");
		expect(screen.queryByRole("button", { name: "All" })).not.toBeInTheDocument();
	});

	it("navigates to the add form, carrying the vehicle filter", async () => {
		setRoute({ search: "vehicle_id=3" });
		renderList();
		await screen.findByText("Alpha");
		await userEvent.setup().click(screen.getByRole("button", { name: /Add Widget/ }));
		expect(router.push).toHaveBeenCalledWith("/widgets/add?vehicle_id=3");
	});

	it("navigates to the add form without a filter", async () => {
		renderList();
		await screen.findByText("Alpha");
		await userEvent.setup().click(screen.getByRole("button", { name: /Add Widget/ }));
		expect(router.push).toHaveBeenCalledWith("/widgets/add");
	});

	it("opens details and the edit form for a card", async () => {
		renderList();
		const card = (await screen.findByText("Alpha")).closest(".card") as HTMLElement;
		const user = userEvent.setup();
		await user.click(within(card).getByTitle("View details"));
		expect(router.push).toHaveBeenLastCalledWith("/widgets/1");
		await user.click(within(card).getByTitle("Edit"));
		expect(router.push).toHaveBeenLastCalledWith("/widgets/1/edit");
	});

	it("deletes after confirmation and reloads", async () => {
		renderList();
		const card = (await screen.findByText("Alpha")).closest(".card") as HTMLElement;
		fetchPage.mockClear();

		await userEvent.setup().click(within(card).getByTitle("Delete"));

		expect(window.confirm).toHaveBeenCalledWith("Are you sure you want to delete this widget?");
		await waitFor(() => expect(deleteItem).toHaveBeenCalledWith(1));
		expect(toast.success).toHaveBeenCalledWith("Widget deleted successfully");
		await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(1));
	});

	it("does nothing when the confirmation is declined", async () => {
		vi.mocked(window.confirm).mockReturnValue(false);
		renderList();
		const card = (await screen.findByText("Alpha")).closest(".card") as HTMLElement;
		await userEvent.setup().click(within(card).getByTitle("Delete"));
		expect(deleteItem).not.toHaveBeenCalled();
	});

	it("reports a failed delete and keeps the list", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		deleteItem.mockRejectedValue({ response: { data: { detail: "Not allowed" } } });
		renderList();
		const card = (await screen.findByText("Alpha")).closest(".card") as HTMLElement;
		await userEvent.setup().click(within(card).getByTitle("Delete"));
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Not allowed"));
		expect(toast.success).not.toHaveBeenCalled();
	});

	it("steps back a page after deleting the last item of a later page", async () => {
		fetchPage.mockResolvedValue(page(rows("Only"), { total: 16, pages: 2, page: 2 }));
		renderList();
		await screen.findByText("Only");
		const user = userEvent.setup();
		await user.click(screen.getByRole("button", { name: "2" }));
		await waitFor(() => expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
		fetchPage.mockClear();

		await user.click(screen.getByTitle("Delete"));

		await waitFor(() => expect(fetchPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));
	});

	it("hides edit and delete where canEdit says so", async () => {
		renderList({ canEdit: (row) => row.id === 1 });
		await screen.findByText("Alpha");
		expect(screen.getAllByTitle("Edit")).toHaveLength(1);
		expect(screen.getAllByTitle("Delete")).toHaveLength(1);
		expect(screen.getAllByTitle("View details")).toHaveLength(2);
	});
});

describe("ResourceDetail", () => {
	let fetchItem: ReturnType<typeof vi.fn>;
	let deleteItem: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		setRoute({ params: { id: "7" } });
		fetchItem = vi.fn().mockResolvedValue({ id: 7, name: "Seven" });
		deleteItem = vi.fn().mockResolvedValue(undefined);
	});

	const renderDetail = (props: Partial<React.ComponentProps<typeof ResourceDetail<Row>>> = {}) =>
		render(
			<ResourceDetail<Row>
				title="Widget Details"
				subtitle="About a widget"
				basePath="/widgets"
				singularName="widget"
				pluralName="Widgets"
				fetchItem={fetchItem as any}
				deleteItem={deleteItem as any}
				{...props}
			>
				{(item) => (
					<DetailCard title="Info">
						<DetailField label="Name">{item.name}</DetailField>
						<DetailField label="Empty">{""}</DetailField>
					</DetailCard>
				)}
			</ResourceDetail>,
		);

	it("loads the record named by the route and renders it", async () => {
		renderDetail();
		expect(await screen.findByText("Seven")).toBeInTheDocument();
		expect(fetchItem).toHaveBeenCalledWith(7);
		expect(screen.getByText("Info")).toBeInTheDocument();
	});

	it("shows a dash for empty fields", async () => {
		renderDetail();
		await screen.findByText("Seven");
		expect(screen.getByText("Empty").nextElementSibling).toHaveTextContent("-");
	});

	it("shows a not-found page with a way back when the record does not exist", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		fetchItem.mockRejectedValue({ response: { status: 404 } });
		renderDetail();

		expect(await screen.findByText("Widget not found")).toBeInTheDocument();
		expect(toast.error).not.toHaveBeenCalled();
		await userEvent.setup().click(screen.getByRole("button", { name: /Back to Widgets/ }));
		expect(router.push).toHaveBeenCalledWith("/widgets");
	});

	it("toasts other load failures", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		fetchItem.mockRejectedValue({ response: { status: 500 } });
		renderDetail();
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load widget"));
	});

	it("goes to the edit form", async () => {
		renderDetail();
		await screen.findByText("Seven");
		await userEvent.setup().click(screen.getByRole("button", { name: "Edit" }));
		expect(router.push).toHaveBeenCalledWith("/widgets/7/edit");
	});

	it("deletes after confirmation and returns to the list", async () => {
		renderDetail();
		await screen.findByText("Seven");
		await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() => expect(deleteItem).toHaveBeenCalledWith(7));
		expect(router.push).toHaveBeenCalledWith("/widgets");
		expect(toast.success).toHaveBeenCalledWith("Widget deleted successfully");
	});

	it("stays put when the confirmation is declined", async () => {
		vi.mocked(window.confirm).mockReturnValue(false);
		renderDetail();
		await screen.findByText("Seven");
		await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));
		expect(deleteItem).not.toHaveBeenCalled();
		expect(router.push).not.toHaveBeenCalled();
	});

	it("reports a failed delete and re-enables the button", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		deleteItem.mockRejectedValue({ response: { data: { detail: "Referenced elsewhere" } } });
		renderDetail();
		await screen.findByText("Seven");
		await userEvent.setup().click(screen.getByRole("button", { name: "Delete" }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Referenced elsewhere"));
		expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
		expect(router.push).not.toHaveBeenCalled();
	});

	it("hides edit and delete when canEdit is false", async () => {
		renderDetail({ canEdit: () => false });
		await screen.findByText("Seven");
		expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Back to Widgets/ })).toBeInTheDocument();
	});
});

describe("EditLoader", () => {
	beforeEach(() => setRoute({ params: { id: "4" } }));

	const renderLoader = (fetchItem: (id: number) => Promise<Row>) =>
		render(
			<EditLoader<Row> title="Edit widget" subtitle="Change it" resourceName="Widget" fetchItem={fetchItem}>
				{(item) => <p>editing {item.name}</p>}
			</EditLoader>,
		);

	it("loads the record and hands it to the form", async () => {
		const fetchItem = vi.fn().mockResolvedValue({ id: 4, name: "Four" });
		renderLoader(fetchItem);
		expect(await screen.findByText("editing Four")).toBeInTheDocument();
		expect(fetchItem).toHaveBeenCalledWith(4);
		expect(screen.getByText("Edit widget")).toBeInTheDocument();
	});

	it.each([
		[404, "Widget not found"],
		[403, "You don't have permission to edit this widget"],
		[500, "Failed to load widget"],
	])("explains a %i", async (status, message) => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		renderLoader(vi.fn().mockRejectedValue({ response: { status } }));
		expect(await screen.findByText(message)).toBeInTheDocument();
		expect(toast.error).toHaveBeenCalled();
	});
});

describe("AddPage", () => {
	it("passes no default vehicle without a query parameter", () => {
		const renderForm = vi.fn(() => <p>form</p>);
		render(<AddPage title="Add" subtitle="Add one" render={renderForm} />);
		expect(screen.getByText("form")).toBeInTheDocument();
		expect(renderForm).toHaveBeenCalledWith(undefined);
	});

	it("passes the ?vehicle_id= parameter as a number", () => {
		setRoute({ search: "vehicle_id=12" });
		const renderForm = vi.fn(() => <p>form</p>);
		render(<AddPage title="Add" subtitle="Add one" render={renderForm} />);
		expect(renderForm).toHaveBeenCalledWith(12);
	});
});
