"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
	UserCircleIcon,
	ChevronDownIcon,
	ArrowRightOnRectangleIcon,
	UserIcon,
	Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

const getRoleBadgeColor = (role: string) => {
	switch (role) {
		case "admin":
			return "bg-red-100 text-red-800";
		case "manager":
			return "bg-blue-100 text-blue-800";
		case "worker":
			return "bg-green-100 text-green-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
};

const getRoleLabel = (role: string) => {
	switch (role) {
		case "admin":
			return "Administrator";
		case "manager":
			return "Manager";
		case "worker":
			return "Worker";
		default:
			return role;
	}
};

interface TopBarProps {
	title?: string;
	subtitle?: string;
}

export default function TopBar({ title, subtitle }: TopBarProps) {
	const { user } = useAuth();
	const router = useRouter();
	const [dropdownOpen, setDropdownOpen] = useState(false);

	const handleLogout = async () => {
		try {
			await api.post("/users/logout/");
			localStorage.removeItem("userData");
			toast.success("Logged out successfully");
			router.push("/");
		} catch (error) {
			console.error("Logout error:", error);
			toast.error("Failed to logout");
		} finally {
			setDropdownOpen(false);
		}
	};

	const handleProfileClick = () => {
		router.push("/profile");
		setDropdownOpen(false);
	};

	if (!user) {
		return null;
	}

	return (
		<div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
			<div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
				{/* Left side - page title or default */}
				<div className="flex items-center">
					<div>
						<h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
							{title || "Fleet Management System"}
						</h2>
						{subtitle && <p className="text-sm text-gray-500 hidden sm:block">{subtitle}</p>}
					</div>
				</div>

				{/* Right side - User info and actions */}
				<div className="flex items-center space-x-4">
					{/* User info */}
					<div className="hidden sm:flex sm:items-center sm:space-x-3">
						<div className="text-right">
							<p className="text-sm font-medium text-gray-900">{user.name}</p>
							<p className="text-xs text-gray-500">{user.email}</p>
						</div>
						<span
							className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
								user.role,
							)}`}
						>
							{getRoleLabel(user.role)}
						</span>
					</div>

					{/* User dropdown */}
					<div className="relative">
						<button
							type="button"
							className="flex items-center space-x-2 p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
							onClick={() => setDropdownOpen(!dropdownOpen)}
						>
							<UserCircleIcon className="h-8 w-8" />
							<ChevronDownIcon className="h-4 w-4 hidden sm:block" />
						</button>

						{/* Dropdown menu */}
						{dropdownOpen && (
							<>
								{/* Backdrop */}
								<div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />

								{/* Dropdown content */}
								<div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20">
									<div className="py-1">
										{/* Mobile user info */}
										<div className="sm:hidden px-4 py-3 border-b border-gray-200">
											<p className="text-sm font-medium text-gray-900">{user.name}</p>
											<p className="text-xs text-gray-500">{user.email}</p>
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getRoleBadgeColor(
													user.role,
												)}`}
											>
												{getRoleLabel(user.role)}
											</span>
										</div>

										{/* Profile link */}
										<button
											onClick={handleProfileClick}
											className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										>
											<UserIcon className="h-4 w-4 mr-3" />
											Your Profile
										</button>

										{/* Settings link - only for admins */}
										{user.role === "admin" && (
											<button
												onClick={() => {
													router.push("/settings");
													setDropdownOpen(false);
												}}
												className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
											>
												<Cog6ToothIcon className="h-4 w-4 mr-3" />
												Settings
											</button>
										)}

										{/* Logout */}
										<div className="border-t border-gray-200">
											<button
												onClick={handleLogout}
												className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
											>
												<ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
												Sign out
											</button>
										</div>
									</div>
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
