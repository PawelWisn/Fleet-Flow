import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, vi } from "vitest";
import { auth, navigation, resetState, router } from "./state";

vi.mock("next/navigation", () => ({
	useRouter: () => router,
	useParams: () => navigation.params,
	useSearchParams: () => navigation.search,
	usePathname: () => navigation.pathname,
}));

vi.mock("next/link", () => ({
	default: ({ href, children, ...rest }: any) => React.createElement("a", { href, ...rest }, children),
}));

// The provider normally fetches /users/me/; tests choose the signed-in user through `loginAs()`.
// AuthContext's own test file opts out with vi.unmock.
vi.mock("@/contexts/AuthContext", () => {
	const useAuth = () => ({
		user: auth.user,
		loading: auth.loading,
		refreshUser: vi.fn(),
		hasRole: (roles: string[]) => !!auth.user && roles.includes(auth.user.role),
		canAccessUsers: () => !!auth.user && ["manager", "admin"].includes(auth.user.role),
		canManageAdmins: () => auth.user?.role === "admin",
	});
	return { AuthProvider: ({ children }: { children: React.ReactNode }) => children, useAuth };
});

// react-hot-toast: record messages instead of rendering them
vi.mock("react-hot-toast", () => {
	const toast: any = vi.fn();
	toast.success = vi.fn();
	toast.error = vi.fn();
	return { default: toast, toast, Toaster: () => null };
});

beforeEach(() => {
	resetState();
	localStorage.clear();
	window.confirm = vi.fn(() => true);
	// jsdom does not implement scrolling helpers used by some components
	Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
