import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", async () => (await import("../pageMocks")).pageApiMocks());

import AddCommentPage from "@/app/comments/add/page";
import EditCommentPage from "@/app/comments/[id]/edit/page";
import CommentDetailsPage from "@/app/comments/[id]/page";
import CommentsPage from "@/app/comments/page";
import AddEventPage from "@/app/events/add/page";
import EditEventPage from "@/app/events/[id]/edit/page";
import EventDetailsPage from "@/app/events/[id]/page";
import EventsPage from "@/app/events/page";
import AddInsurancePage from "@/app/insurances/add/page";
import EditInsurancePage from "@/app/insurances/[id]/edit/page";
import InsuranceDetailsPage from "@/app/insurances/[id]/page";
import InsurancesPage from "@/app/insurances/page";
import * as allApis from "@/services/api";
import { commentsApi, eventsApi, insuranceApi } from "@/services/api";
import { comment, event, insurance, page } from "../fixtures";
import { resetApiMocks } from "../pageMocks";
import { router, setRoute } from "../state";

beforeEach(() => {
	resetApiMocks(allApis as any);
	setRoute({ params: { id: "9" } });
});

describe("events", () => {
	it("lists events, showing vehicle, price, date and linked document", async () => {
		render(<EventsPage />);
		expect(await screen.findByText("maintenance")).toBeInTheDocument();
		expect(screen.getByText("$150.00")).toBeInTheDocument();
		expect(screen.getByText(/Apr 1, 2026/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Registration card" })).toHaveAttribute("href", "/documents/5");
		expect(eventsApi.getAll).toHaveBeenCalledWith({ page: 1, size: 15, vehicle_id: undefined });
	});

	it("filters by the vehicle in the URL", async () => {
		setRoute({ search: "vehicle_id=1" });
		render(<EventsPage />);
		await screen.findByText("maintenance");
		expect(eventsApi.getAll).toHaveBeenCalledWith({ page: 1, size: 15, vehicle_id: 1 });
	});

	it("shows a dash for a missing price and no document link", async () => {
		vi.mocked(eventsApi.getAll).mockResolvedValue(page([event({ price: null, document: null })]) as any);
		render(<EventsPage />);
		await screen.findByText("maintenance");
		expect(screen.queryByRole("link", { name: "Registration card" })).not.toBeInTheDocument();
		expect(screen.queryByText(/NaN|\$0\.00/)).not.toBeInTheDocument();
	});

	it("deletes an event from the list", async () => {
		const u = userEvent.setup();
		render(<EventsPage />);
		await screen.findByText("maintenance");
		await u.click(screen.getByTitle("Delete"));
		await waitFor(() => expect(eventsApi.delete).toHaveBeenCalledWith(9));
	});

	it("shows the event details with links to the vehicle and document", async () => {
		render(<EventDetailsPage />);
		expect(await screen.findByText("Oil change")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /AAA-111/ })).toHaveAttribute("href", "/vehicles/1");
		expect(screen.getByRole("link", { name: "Registration card" })).toHaveAttribute("href", "/documents/5");
		expect(screen.getByText("Alpha Logistics")).toBeInTheDocument();
	});

	it("loads the event into the edit form", async () => {
		render(<EditEventPage />);
		expect(await screen.findByDisplayValue("Oil change")).toBeInTheDocument();
		expect(eventsApi.getById).toHaveBeenCalledWith(9);
		expect(screen.getByRole("button", { name: "Update Event" })).toBeInTheDocument();
	});

	it("starts the add form with the vehicle from the query string", async () => {
		setRoute({ search: "vehicle_id=1" });
		const u = userEvent.setup();
		render(<AddEventPage />);
		await u.click(await screen.findByRole("button", { name: "Add Event" }));
		expect(screen.queryByText("Vehicle is required")).not.toBeInTheDocument();
	});
});

describe("insurances", () => {
	it("lists all policies by default", async () => {
		render(<InsurancesPage />);
		expect(await screen.findByText("PZU")).toBeInTheDocument();
		expect(screen.getByText("OC/AC")).toBeInTheDocument();
		expect(screen.getByText("POL-1")).toBeInTheDocument();
		expect(screen.getByText("$1,200.00")).toBeInTheDocument();
		expect(insuranceApi.getAll).toHaveBeenCalledWith({ page: 1, size: 15, vehicle_id: undefined });
		expect(insuranceApi.getFinishing).not.toHaveBeenCalled();
	});

	it("switches to the policies ending soon", async () => {
		const u = userEvent.setup();
		render(<InsurancesPage />);
		await screen.findByText("PZU");
		await u.click(screen.getByRole("button", { name: "Ending soon" }));
		await waitFor(() => expect(insuranceApi.getFinishing).toHaveBeenCalledWith({ page: 1, size: 15 }));
	});

	it("shows the policy details", async () => {
		setRoute({ params: { id: "6" } });
		render(<InsuranceDetailsPage />);
		expect(await screen.findByText("POL-1")).toBeInTheDocument();
		expect(screen.getByText("Full cover")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /AAA-111/ })).toHaveAttribute("href", "/vehicles/1");
		expect(insuranceApi.getById).toHaveBeenCalledWith(6);
	});

	it("loads the policy into the edit form", async () => {
		setRoute({ params: { id: "6" } });
		render(<EditInsurancePage />);
		expect(await screen.findByDisplayValue("PZU")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Update Insurance" })).toBeInTheDocument();
	});

	it("opens the add form", async () => {
		render(<AddInsurancePage />);
		expect(await screen.findByRole("button", { name: "Add Insurance" })).toBeInTheDocument();
	});

	it("deletes a policy from its detail page and returns to the list", async () => {
		setRoute({ params: { id: "6" } });
		const u = userEvent.setup();
		render(<InsuranceDetailsPage />);
		await screen.findByText("POL-1");
		await u.click(screen.getByRole("button", { name: /Delete/ }));
		await waitFor(() => expect(insuranceApi.delete).toHaveBeenCalledWith(6));
		expect(router.push).toHaveBeenCalledWith("/insurances");
	});
});

describe("comments", () => {
	it("lists comments with author and date", async () => {
		render(<CommentsPage />);
		expect(await screen.findByText("Tyres need checking")).toBeInTheDocument();
		expect(screen.getByText(/Worker Alpha · May 5, 2026/)).toBeInTheDocument();
		expect(commentsApi.getAll).toHaveBeenCalledWith({ page: 1, size: 15, vehicle_id: undefined });
	});

	it("filters by the vehicle in the URL", async () => {
		setRoute({ search: "vehicle_id=1" });
		render(<CommentsPage />);
		await screen.findByText("Tyres need checking");
		expect(commentsApi.getAll).toHaveBeenCalledWith({ page: 1, size: 15, vehicle_id: 1 });
	});

	it("shows an empty state", async () => {
		vi.mocked(commentsApi.getAll).mockResolvedValue(page([]) as any);
		render(<CommentsPage />);
		expect(await screen.findByText("No comments found")).toBeInTheDocument();
	});

	it("shows the comment and its context", async () => {
		setRoute({ params: { id: "11" } });
		render(<CommentDetailsPage />);
		expect(await screen.findByText("Tyres need checking")).toBeInTheDocument();
		expect(screen.getByText("Worker Alpha (worker@example.com)")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /AAA-111/ })).toHaveAttribute("href", "/vehicles/1");
	});

	it("loads the comment into the edit form", async () => {
		setRoute({ params: { id: "11" } });
		render(<EditCommentPage />);
		expect(await screen.findByDisplayValue("Tyres need checking")).toBeInTheDocument();
		expect(commentsApi.getById).toHaveBeenCalledWith(11);
	});

	it("opens the add form", async () => {
		render(<AddCommentPage />);
		expect(await screen.findByRole("button", { name: "Add Comment" })).toBeInTheDocument();
	});

	it("shows a not-found page for a comment the user cannot see", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		setRoute({ params: { id: "99" } });
		vi.mocked(commentsApi.getById).mockRejectedValue({ response: { status: 404 } });
		render(<CommentDetailsPage />);
		expect(await screen.findByText("Comment not found")).toBeInTheDocument();
	});

	void comment;
	void insurance;
});
