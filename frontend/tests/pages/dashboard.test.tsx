import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({
	vehiclesApi: { getAll: vi.fn() },
	reservationsApi: { getUpcoming: vi.fn() },
	insuranceApi: { getFinishing: vi.fn() },
}));
vi.mock("@/lib/api", () => ({ api: { post: vi.fn() }, default: { post: vi.fn() } }));

import { toast } from "react-hot-toast";
import DashboardPage from "@/app/dashboard/page";
import { insuranceApi, reservationsApi, vehiclesApi } from "@/services/api";
import { page, vehicle } from "../fixtures";

const card = (label: string) => screen.getByText(label).closest("div.ml-4") as HTMLElement;
const value = (label: string) => within(card(label)).getByText(/^\d+$/).textContent;

describe("dashboard", () => {
	beforeEach(() => {
		vi.mocked(vehiclesApi.getAll).mockImplementation(async (params: any = {}) => {
			const totals: Record<string, number> = { available: 27, service: 4, "in use": 9 };
			if (params.status) return page([vehicle()], { total: totals[params.status] }) as any;
			return page([vehicle({ company: undefined }), vehicle({ id: 2, registration_number: "BBB-222", kilometrage: 1234 })], { total: 112 }) as any;
		});
		vi.mocked(reservationsApi.getUpcoming).mockResolvedValue(page([], { total: 8 }) as any);
		vi.mocked(insuranceApi.getFinishing).mockResolvedValue(page([], { total: 3 }) as any);
	});

	it("shows real totals from the API, not the size of the first page", async () => {
		render(<DashboardPage />);
		await waitFor(() => expect(value("Total Vehicles")).toBe("112"));
		expect(value("Available")).toBe("27");
		expect(value("In Service")).toBe("4");
		expect(value("In Use")).toBe("9");
		expect(value("Upcoming Reservations")).toBe("8");
		expect(value("Insurances Ending Soon")).toBe("3");
	});

	it("asks only for what it needs", async () => {
		render(<DashboardPage />);
		await waitFor(() => expect(value("Total Vehicles")).toBe("112"));
		expect(vehiclesApi.getAll).toHaveBeenCalledWith({ size: 1, status: "available" });
		expect(vehiclesApi.getAll).toHaveBeenCalledWith({ size: 1, status: "service" });
		expect(vehiclesApi.getAll).toHaveBeenCalledWith({ size: 1, status: "in use" });
		expect(reservationsApi.getUpcoming).toHaveBeenCalledWith({ size: 1 });
		expect(insuranceApi.getFinishing).toHaveBeenCalledWith({ size: 1 });
	});

	it("lists the first vehicles with their company name", async () => {
		render(<DashboardPage />);
		const table = await screen.findByRole("table");
		expect(within(table).getByText("AAA-111")).toBeInTheDocument();
		expect(within(table).getByText("BBB-222")).toBeInTheDocument();
		expect(within(table).getAllByText("Alpha Logistics").length).toBeGreaterThan(0);
		expect(within(table).getByText("1,234 km")).toBeInTheDocument();
	});

	it("shows at most five vehicles", async () => {
		vi.mocked(vehiclesApi.getAll).mockResolvedValue(page(Array.from({ length: 8 }, (_, i) => vehicle({ id: i + 1, registration_number: `REG-${i + 1}` })), { total: 8 }) as any);
		render(<DashboardPage />);
		const table = await screen.findByRole("table");
		expect(within(table).getAllByRole("row")).toHaveLength(6); // header + 5
	});

	it("reports a failed load", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(vehiclesApi.getAll).mockRejectedValue({ response: { status: 500 } });
		render(<DashboardPage />);
		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to load dashboard data"));
	});

	it("has quick actions that navigate", async () => {
		const { router } = await import("../state");
		render(<DashboardPage />);
		await userEvent.setup().click(await screen.findByText("Manage Vehicles"));
		expect(router.push).toHaveBeenCalledWith("/vehicles");
	});
});
