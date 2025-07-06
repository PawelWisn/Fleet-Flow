"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
	UserIcon,
	BuildingOfficeIcon,
	PencilIcon,
	TrashIcon,
	CalendarIcon,
	ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import LoadingSpinner from "@/components/LoadingSpinner";
import { usersApi } from "@/services/api";
import { User } from "@/types";

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

export default function UserDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const userId = parseInt(params.id as string);
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const fetchUser = async () => {
			try {
				const response = await usersApi.getById(userId);
				setUser(response);
			} catch (error) {
				console.error("Error fetching user:", error);
				toast.error("Failed to load user");
				router.push("/users");
			} finally {
				setLoading(false);
			}
		};

		if (userId) {
			fetchUser();
		}
	}, [userId, router]);

	const handleDelete = async () => {
		if (!user || !confirm("Are you sure you want to delete this user?")) {
			return;
		}

		setDeleting(true);
		try {
			await usersApi.delete(user.id);
			toast.success("User deleted successfully!");
			router.push("/users");
		} catch (error) {
			console.error("Error deleting user:", error);
			toast.error("Failed to delete user");
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex justify-center items-center min-h-[400px]">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (!user) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<UserIcon className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-2 text-sm font-medium text-gray-900">User not found</h3>
					<p className="mt-1 text-sm text-gray-500">The user you're looking for doesn't exist.</p>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<RoleGuard allowedRoles={["manager", "admin"]}>
				<div className="space-y-6">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
							<p className="text-sm text-gray-500">{user.email}</p>
						</div>
						<div className="flex space-x-3">
							<button
								onClick={() => router.push(`/users/${user.id}/edit`)}
								className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								<PencilIcon className="h-4 w-4 mr-2" />
								Edit
							</button>
							<button
								onClick={handleDelete}
								disabled={deleting}
								className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
							>
								<TrashIcon className="h-4 w-4 mr-2" />
								{deleting ? "Deleting..." : "Delete"}
							</button>
						</div>
					</div>

					{/* User Info */}
					<div className="bg-white shadow overflow-hidden sm:rounded-lg">
						<div className="px-4 py-5 sm:px-6">
							<h3 className="text-lg leading-6 font-medium text-gray-900">User Information</h3>
							<p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and account information.</p>
						</div>
						<div className="border-t border-gray-200">
							<dl>
								<div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
									<dt className="text-sm font-medium text-gray-500 flex items-center">
										<UserIcon className="h-5 w-5 mr-2" />
										Full Name
									</dt>
									<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.name}</dd>
								</div>
								<div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
									<dt className="text-sm font-medium text-gray-500">Email Address</dt>
									<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user.email}</dd>
								</div>
								<div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
									<dt className="text-sm font-medium text-gray-500 flex items-center">
										<ShieldCheckIcon className="h-5 w-5 mr-2" />
										Role
									</dt>
									<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
										>
											{getRoleLabel(user.role)}
										</span>
									</dd>
								</div>
								<div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
									<dt className="text-sm font-medium text-gray-500 flex items-center">
										<BuildingOfficeIcon className="h-5 w-5 mr-2" />
										Company
									</dt>
									<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
										{user.company_id ? `Company ID: ${user.company_id}` : "Not assigned"}
									</dd>
								</div>
								<div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
									<dt className="text-sm font-medium text-gray-500 flex items-center">
										<CalendarIcon className="h-5 w-5 mr-2" />
										Created
									</dt>
									<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
										{user.created_at ? new Date(user.created_at).toLocaleString() : "Unknown"}
									</dd>
								</div>
								{user.updated_at && (
									<div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
										<dt className="text-sm font-medium text-gray-500 flex items-center">
											<CalendarIcon className="h-5 w-5 mr-2" />
											Last Updated
										</dt>
										<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
											{new Date(user.updated_at).toLocaleString()}
										</dd>
									</div>
								)}
							</dl>
						</div>
					</div>
				</div>
			</RoleGuard>
		</DashboardLayout>
	);
}
