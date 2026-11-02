import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CanModifyUser from "@/components/CanModifyUser";
import RoleGuard from "@/components/RoleGuard";
import { auth, loginAs, router } from "../state";

describe("RoleGuard", () => {
	const renderGuard = (allowed = ["manager", "admin"]) =>
		render(
			<RoleGuard allowedRoles={allowed}>
				<p>secret</p>
			</RoleGuard>,
		);

	it.each(["manager", "admin"] as const)("renders children for %s", (role) => {
		loginAs(role);
		renderGuard();
		expect(screen.getByText("secret")).toBeInTheDocument();
		expect(router.push).not.toHaveBeenCalled();
	});

	it("hides children from other roles and redirects to the dashboard", () => {
		loginAs("worker");
		renderGuard();
		expect(screen.queryByText("secret")).not.toBeInTheDocument();
		expect(router.push).toHaveBeenCalledWith("/dashboard");
	});

	it("honours a custom fallback path", () => {
		loginAs("worker");
		render(
			<RoleGuard allowedRoles={["admin"]} fallbackPath="/vehicles">
				<p>secret</p>
			</RoleGuard>,
		);
		expect(router.push).toHaveBeenCalledWith("/vehicles");
	});

	it("shows a spinner and does not redirect while the user is loading", () => {
		auth.user = null;
		auth.loading = true;
		const { container } = renderGuard();
		expect(screen.queryByText("secret")).not.toBeInTheDocument();
		expect(container.querySelector(".animate-spin")).toBeInTheDocument();
		expect(router.push).not.toHaveBeenCalled();
	});

	it("renders nothing for an anonymous visitor", () => {
		loginAs(null);
		const { container } = renderGuard();
		expect(container).toBeEmptyDOMElement();
	});
});

describe("CanModifyUser", () => {
	const renderFor = (userId: number) =>
		render(
			<CanModifyUser userId={userId}>
				<button>Edit</button>
			</CanModifyUser>,
		);

	it("lets admins modify anyone", () => {
		loginAs("admin");
		renderFor(999);
		expect(screen.getByText("Edit")).toBeInTheDocument();
	});

	it.each(["manager", "worker"] as const)("lets a %s modify only themselves", (role) => {
		loginAs(role);
		const { unmount } = renderFor(auth.user!.id);
		expect(screen.getByText("Edit")).toBeInTheDocument();
		unmount();

		renderFor(999);
		expect(screen.queryByText("Edit")).not.toBeInTheDocument();
	});

	it("hides everything from anonymous visitors", () => {
		loginAs(null);
		renderFor(1);
		expect(screen.queryByText("Edit")).not.toBeInTheDocument();
	});
});
