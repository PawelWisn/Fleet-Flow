import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/api", () => ({ usersApi: { getCurrentUser: vi.fn() } }));

import { usersApi } from "@/services/api";
import { user } from "../fixtures";

// The suite mocks AuthContext globally; this file exercises the real implementation
const actual = await vi.importActual<typeof import("@/contexts/AuthContext")>("@/contexts/AuthContext");

function Probe() {
	const auth = actual.useAuth();
	return (
		<div>
			<span data-testid="loading">{String(auth.loading)}</span>
			<span data-testid="user">{auth.user?.email ?? "none"}</span>
			<span data-testid="worker">{String(auth.hasRole(["worker"]))}</span>
			<span data-testid="users">{String(auth.canAccessUsers())}</span>
			<span data-testid="admins">{String(auth.canManageAdmins())}</span>
		</div>
	);
}

const renderProbe = () =>
	render(
		<actual.AuthProvider>
			<Probe />
		</actual.AuthProvider>,
	);

const flags = () => ({ worker: screen.getByTestId("worker").textContent, users: screen.getByTestId("users").textContent, admins: screen.getByTestId("admins").textContent });

describe("AuthProvider", () => {
	it("starts in the loading state, then exposes the signed-in user", async () => {
		vi.mocked(usersApi.getCurrentUser).mockResolvedValue(user({ role: "manager", email: "m@example.com" }));
		renderProbe();

		expect(screen.getByTestId("loading")).toHaveTextContent("true");
		await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
		expect(screen.getByTestId("user")).toHaveTextContent("m@example.com");
	});

	it("treats a failed /users/me/ as signed out", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.mocked(usersApi.getCurrentUser).mockRejectedValue(new Error("401"));
		renderProbe();

		await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
		expect(screen.getByTestId("user")).toHaveTextContent("none");
		expect(flags()).toEqual({ worker: "false", users: "false", admins: "false" });
	});

	it.each([
		["worker", { worker: "true", users: "false", admins: "false" }],
		["manager", { worker: "false", users: "true", admins: "false" }],
		["admin", { worker: "false", users: "true", admins: "true" }],
	] as const)("derives permissions for a %s", async (role, expected) => {
		vi.mocked(usersApi.getCurrentUser).mockResolvedValue(user({ role }));
		renderProbe();
		await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
		expect(flags()).toEqual(expected);
	});

	it("refreshUser re-fetches the user", async () => {
		vi.mocked(usersApi.getCurrentUser).mockResolvedValue(user({ email: "first@example.com" }));
		let refresh: () => Promise<void> = async () => {};
		function Grab() {
			refresh = actual.useAuth().refreshUser;
			return null;
		}
		render(
			<actual.AuthProvider>
				<Probe />
				<Grab />
			</actual.AuthProvider>,
		);
		await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("first@example.com"));

		vi.mocked(usersApi.getCurrentUser).mockResolvedValue(user({ email: "second@example.com" }));
		await refresh();

		await waitFor(() => expect(screen.getByTestId("user")).toHaveTextContent("second@example.com"));
		expect(usersApi.getCurrentUser).toHaveBeenCalledTimes(2);
	});

	it("useAuth outside a provider is a programming error", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<Probe />)).toThrow("useAuth must be used within an AuthProvider");
	});
});
