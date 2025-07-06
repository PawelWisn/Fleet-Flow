"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface RoleGuardProps {
	children: React.ReactNode;
	allowedRoles: string[];
	fallbackPath?: string;
}

export default function RoleGuard({ children, allowedRoles, fallbackPath = "/dashboard" }: RoleGuardProps) {
	const { user, loading } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!loading && user && !allowedRoles.includes(user.role)) {
			router.push(fallbackPath);
		}
	}, [user, loading, allowedRoles, fallbackPath, router]);

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<LoadingSpinner />
			</div>
		);
	}

	if (!user || !allowedRoles.includes(user.role)) {
		return null; // Will redirect via useEffect
	}

	return <>{children}</>;
}
