"use client";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Renders its children only if the current user may modify the given user. The backend only lets admins modify
 * other users, while everyone may modify themselves. Must be rendered inside DashboardLayout (which provides auth).
 */
export default function CanModifyUser({ userId, children }: { userId: number; children: React.ReactNode }) {
	const { user } = useAuth();
	if (user?.role === "admin" || user?.id === userId) {
		return <>{children}</>;
	}
	return null;
}
