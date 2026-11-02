import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ api: { post: vi.fn() }, default: { post: vi.fn() } }));

import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import TopBar from "@/components/TopBar";
import { api } from "@/lib/api";
import { auth, loginAs, router } from "../state";

const navLabels = () => within(document.querySelector("nav")!).getAllByRole("link").map((a) => a.textContent);
const ALL = ["Vehicles", "Reservations", "Refuels", "Events", "Insurances", "Comments", "Users", "Companies", "Documents", "Analytics", "Settings"];

describe("DashboardLayout", () => {
	const renderLayout = () =>
		render(
			<DashboardLayout title="My Page" subtitle="Some subtitle">
				<p>page content</p>
			</DashboardLayout>,
		);

	it("renders the page content, title and subtitle", () => {
		renderLayout();
		expect(screen.getByText("page content")).toBeInTheDocument();
		expect(screen.getByText("My Page")).toBeInTheDocument();
		expect(screen.getByText("Some subtitle")).toBeInTheDocument();
	});

	it.each([
		["admin", ALL],
		["manager", ALL.filter((n) => n !== "Settings")],
		["worker", ["Vehicles", "Reservations", "Refuels", "Events", "Insurances", "Comments", "Documents"]],
	] as const)("shows the right navigation for a %s", (role, expected) => {
		loginAs(role);
		renderLayout();
		expect(navLabels()).toEqual(expected);
	});

	it("links every entry to its route, including the new resources", () => {
		renderLayout();
		const hrefs = Object.fromEntries(within(document.querySelector("nav")!).getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]));
		expect(hrefs).toMatchObject({ Events: "/events", Insurances: "/insurances", Comments: "/comments", Analytics: "/reports", Vehicles: "/vehicles" });
	});

	it("shows no navigation without a user", () => {
		loginAs(null);
		renderLayout();
		expect(document.querySelector("nav")?.querySelectorAll("a") ?? []).toHaveLength(0);
	});

	it("shows only a spinner while authentication is loading", () => {
		auth.user = null;
		auth.loading = true;
		const { container } = renderLayout();
		expect(screen.queryByText("page content")).not.toBeInTheDocument();
		expect(container.querySelector(".animate-spin")).toBeInTheDocument();
	});

	it("opens the mobile sidebar", async () => {
		renderLayout();
		const user = userEvent.setup();
		const mobile = document.querySelector("div.fixed.inset-0.z-50")!;
		expect(mobile.className).toContain("hidden");
		await user.click(document.querySelector("button.h-12.w-12")!);
		expect(mobile.className).toContain("block");
	});
});

describe("TopBar", () => {
	beforeEach(() => {
		vi.mocked(api.post).mockReset().mockResolvedValue({});
	});

	it("renders nothing for anonymous visitors", () => {
		loginAs(null);
		const { container } = render(<TopBar />);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the user and a role badge, with a default title", () => {
		loginAs("manager");
		render(<TopBar />);
		expect(screen.getByText("Manager Alpha")).toBeInTheDocument();
		expect(screen.getByText("manager@example.com")).toBeInTheDocument();
		expect(screen.getByText("Manager")).toBeInTheDocument();
		expect(screen.getByText("Fleet Management System")).toBeInTheDocument();
	});

	it.each([["admin", "Administrator"], ["worker", "Worker"]] as const)("labels the %s role", (role, label) => {
		loginAs(role);
		render(<TopBar />);
		expect(screen.getByText(label)).toBeInTheDocument();
	});

	it("opens the menu, goes to the profile and closes", async () => {
		const user = userEvent.setup();
		render(<TopBar />);
		await user.click(screen.getByRole("button"));
		await user.click(screen.getByText("Your Profile"));

		expect(router.push).toHaveBeenCalledWith("/profile");
		expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
	});

	it("offers Settings to admins only", async () => {
		const user = userEvent.setup();
		const { unmount } = render(<TopBar />);
		await user.click(screen.getByRole("button"));
		await user.click(screen.getByText("Settings"));
		expect(router.push).toHaveBeenCalledWith("/settings");
		unmount();

		loginAs("manager");
		render(<TopBar />);
		await user.click(screen.getByRole("button"));
		expect(screen.queryByText("Settings")).not.toBeInTheDocument();
	});

	it("signs out: clears the session, local data and returns to the login page", async () => {
		localStorage.setItem("userData", "{}");
		const user = userEvent.setup();
		render(<TopBar />);
		await user.click(screen.getByRole("button"));
		await user.click(screen.getByText("Sign out"));

		expect(api.post).toHaveBeenCalledWith("/users/logout/");
		expect(localStorage.getItem("userData")).toBeNull();
		expect(router.push).toHaveBeenCalledWith("/");
		expect(toast.success).toHaveBeenCalledWith("Logged out successfully");
	});

	it("keeps the user signed in when sign out fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(api.post).mockRejectedValue(new Error("down"));
		localStorage.setItem("userData", "{}");
		const user = userEvent.setup();
		render(<TopBar />);
		await user.click(screen.getByRole("button"));
		await user.click(screen.getByText("Sign out"));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to logout"));
		expect(localStorage.getItem("userData")).toBe("{}");
		expect(router.push).not.toHaveBeenCalled();
	});
});
