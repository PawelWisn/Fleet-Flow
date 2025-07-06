"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { usersApi } from "@/services/api";

interface AuthContextType {
	user: User | null;
	loading: boolean;
	refreshUser: () => Promise<void>;
	hasRole: (roles: string[]) => boolean;
	canAccessUsers: () => boolean;
	canManageAdmins: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	const refreshUser = async () => {
		try {
			const userData = await usersApi.getCurrentUser();
			setUser(userData);
		} catch (error) {
			console.error("Failed to fetch current user:", error);
			setUser(null);
		} finally {
			setLoading(false);
		}
	};

	const hasRole = (roles: string[]): boolean => {
		if (!user) return false;
		return roles.includes(user.role);
	};

	const canAccessUsers = (): boolean => {
		if (!user) return false;
		// Only managers and admins can access users panel
		return ["manager", "admin"].includes(user.role);
	};

	const canManageAdmins = (): boolean => {
		if (!user) return false;
		// Only admins can manage other admins
		return user.role === "admin";
	};

	useEffect(() => {
		refreshUser();
	}, []);

	const value = {
		user,
		loading,
		refreshUser,
		hasRole,
		canAccessUsers,
		canManageAdmins,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
