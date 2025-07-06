"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
	UserIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	BuildingOfficeIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
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

export default function UsersPage() {
	const router = useRouter();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const [roleFilter, setRoleFilter] = useState("all");
	const itemsPerPage = 12;

	const fetchUsers = async (page = 1, search = "", role = "all") => {
		try {
			setLoading(true);
			const response = await usersApi.getAll();

			// Client-side filtering since the API doesn't support these params yet
			let filteredUsers = response.items || [];

			if (search) {
				filteredUsers = filteredUsers.filter(
					(user) =>
						user.name.toLowerCase().includes(search.toLowerCase()) ||
						user.email.toLowerCase().includes(search.toLowerCase()),
				);
			}

			if (role !== "all") {
				filteredUsers = filteredUsers.filter((user) => user.role === role);
			}

			// Simple client-side pagination
			const startIndex = (page - 1) * itemsPerPage;
			const endIndex = startIndex + itemsPerPage;
			const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

			setUsers(paginatedUsers);
			setTotalPages(Math.ceil(filteredUsers.length / itemsPerPage));
			setTotalItems(filteredUsers.length);
			setCurrentPage(page);
		} catch (error) {
			console.error("Error fetching users:", error);
			toast.error("Failed to load users");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchUsers(1, searchTerm, roleFilter);
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentPage(1);
		fetchUsers(1, searchTerm, roleFilter);
	};

	const handleRoleFilter = (role: string) => {
		setRoleFilter(role);
		setCurrentPage(1);
		fetchUsers(1, searchTerm, role);
	};

	const handlePageChange = (page: number) => {
		fetchUsers(page, searchTerm, roleFilter);
	};

	const handleDelete = async (userId: number) => {
		if (!confirm("Are you sure you want to delete this user?")) {
			return;
		}

		try {
			await usersApi.delete(userId);
			toast.success("User deleted successfully!");
			fetchUsers(currentPage, searchTerm, roleFilter);
		} catch (error) {
			console.error("Error deleting user:", error);
			toast.error("Failed to delete user");
		}
	};

	const renderPagination = () => {
		if (totalPages <= 1) return null;

		const pages = [];
		const maxVisiblePages = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

		if (endPage - startPage < maxVisiblePages - 1) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		for (let i = startPage; i <= endPage; i++) {
			pages.push(
				<button
					key={i}
					onClick={() => handlePageChange(i)}
					className={`px-3 py-2 rounded-md text-sm font-medium ${
						i === currentPage ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"
					}`}
				>
					{i}
				</button>,
			);
		}

		return (
			<div className="flex items-center justify-between px-4 py-3 sm:px-6">
				<div className="flex justify-between flex-1 sm:hidden">
					<button
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1}
						className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
					>
						Previous
					</button>
					<button
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
						className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
					>
						Next
					</button>
				</div>
				<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div>
						<p className="text-sm text-gray-700">
							Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
							<span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
							<span className="font-medium">{totalItems}</span> results
						</p>
					</div>
					<div className="flex space-x-1">{pages}</div>
				</div>
			</div>
		);
	};

	return (
		<DashboardLayout>
			<RoleGuard allowedRoles={["manager", "admin"]}>
				<div className="space-y-6">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Users</h1>
							<p className="text-sm text-gray-500">Manage user accounts and permissions</p>
						</div>
						<button
							onClick={() => router.push("/users/add")}
							className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<PlusIcon className="h-4 w-4 mr-2" />
							Add User
						</button>
					</div>

					{/* Filters and Search */}
					<div className="flex flex-col sm:flex-row gap-4">
						<form onSubmit={handleSearch} className="flex gap-4 flex-1">
							<div className="flex-1 relative">
								<MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<input
									type="text"
									placeholder="Search users..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<button
								type="submit"
								className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							>
								Search
							</button>
						</form>
						<select
							value={roleFilter}
							onChange={(e) => handleRoleFilter(e.target.value)}
							className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="all">All Roles</option>
							<option value="admin">Administrator</option>
							<option value="manager">Manager</option>
							<option value="worker">Worker</option>
						</select>
					</div>

					{/* Users Grid */}
					<div className="bg-white shadow overflow-hidden sm:rounded-md">
						{loading ? (
							<div className="flex justify-center items-center py-12">
								<LoadingSpinner />
							</div>
						) : users.length === 0 ? (
							<div className="text-center py-12">
								<UserIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
								<p className="mt-1 text-sm text-gray-500">Get started by creating a new user.</p>
								<div className="mt-6">
									<button
										onClick={() => router.push("/users/add")}
										className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
									>
										<PlusIcon className="h-4 w-4 mr-2" />
										Add User
									</button>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-6">
								{users.map((user) => (
									<div
										key={user.id}
										className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
									>
										<div className="flex items-center space-x-3 mb-4">
											<div className="flex-shrink-0">
												<div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
													<UserIcon className="h-6 w-6 text-gray-600" />
												</div>
											</div>
											<div className="flex-1 min-w-0">
												<h3 className="text-lg font-medium text-gray-900 truncate">{user.name}</h3>
												<p className="text-sm text-gray-500 truncate">{user.email}</p>
											</div>
										</div>

										<div className="space-y-3 text-sm">
											<div className="flex items-center justify-between">
												<span className="flex items-center text-gray-600">
													<ShieldCheckIcon className="h-4 w-4 mr-1" />
													Role:
												</span>
												<span
													className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
												>
													{getRoleLabel(user.role)}
												</span>
											</div>
											{user.company_id && (
												<div className="flex items-center justify-between">
													<span className="flex items-center text-gray-600">
														<BuildingOfficeIcon className="h-4 w-4 mr-1" />
														Company:
													</span>
													<span>ID: {user.company_id}</span>
												</div>
											)}
											<div className="flex items-center justify-between">
												<span className="text-gray-600">Joined:</span>
												<span>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}</span>
											</div>
										</div>

										<div className="mt-4 flex space-x-2">
											<button
												onClick={() => router.push(`/users/${user.id}`)}
												className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
											>
												<EyeIcon className="h-4 w-4 mr-1" />
												View
											</button>
											<button
												onClick={() => router.push(`/users/${user.id}/edit`)}
												className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
											>
												<PencilIcon className="h-4 w-4 mr-1" />
												Edit
											</button>
											<button
												onClick={() => handleDelete(user.id)}
												className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
											>
												<TrashIcon className="h-4 w-4" />
											</button>
										</div>
									</div>
								))}
							</div>
						)}
						{renderPagination()}
					</div>
				</div>
			</RoleGuard>
		</DashboardLayout>
	);
}
