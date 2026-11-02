import { vi } from "vitest";
import type { User } from "@/types";

/** Mutable state behind the globally mocked `next/navigation` and `AuthContext`; tests tweak it before rendering. */
export const router = {
	push: vi.fn(),
	replace: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn(),
	prefetch: vi.fn(),
};

export const navigation = {
	params: {} as Record<string, string>,
	search: new URLSearchParams(),
	pathname: "/",
};

export const users = {
	admin: { id: 1, email: "admin@example.com", name: "Admin Root", role: "admin", company_id: 10 } as User,
	manager: { id: 2, email: "manager@example.com", name: "Manager Alpha", role: "manager", company_id: 1 } as User,
	worker: { id: 3, email: "worker@example.com", name: "Worker Alpha", role: "worker", company_id: 1 } as User,
};

export const auth: { user: User | null; loading: boolean } = { user: users.admin, loading: false };

export function loginAs(role: keyof typeof users | null) {
	auth.user = role ? users[role] : null;
	auth.loading = false;
}

export function setRoute({ params = {}, search = "", pathname = "/" }: { params?: Record<string, string>; search?: string; pathname?: string } = {}) {
	navigation.params = params;
	navigation.search = new URLSearchParams(search);
	navigation.pathname = pathname;
}

export function resetState() {
	Object.values(router).forEach((fn) => fn.mockReset());
	setRoute();
	loginAs("admin");
}
