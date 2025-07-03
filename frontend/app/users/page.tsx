"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

// Mock data
const users = [
	{
		id: 1,
		name: "John Doe",
		email: "john@example.com",
		role: "manager",
		company: { name: "Acme Corp" },
		created_at: "2024-01-15T10:00:00Z",
	},
	{
		id: 2,
		name: "Jane Smith",
		email: "jane@example.com",
		role: "worker",
		company: { name: "Tech Solutions" },
		created_at: "2024-02-20T14:30:00Z",
	},
	{
		id: 3,
		name: "Mike Johnson",
		email: "mike@example.com",
		role: "admin",
		company: { name: "Acme Corp" },
		created_at: "2024-03-10T09:15:00Z",
	},
];

const roleColors = {
	admin: "bg-purple-100 text-purple-800",
	manager: "bg-blue-100 text-blue-800",
	worker: "bg-green-100 text-green-800",
};

export default function UsersPage() {
	const [filterRole, setFilterRole] = useState("all");

	const filteredUsers = users.filter((user) => filterRole === "all" || user.role === filterRole);

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Page header */}
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">Users</h1>
						<p className="mt-2 text-sm text-gray-700">Manage user accounts and permissions.</p>
					</div>
					<button className="btn-primary flex items-center">
						<PlusIcon className="h-5 w-5 mr-2" />
						Add User
					</button>
				</div>

				{/* Filters */}
				<div className="card">
					<div className="flex items-center space-x-4">
						<label htmlFor="role-filter" className="text-sm font-medium text-gray-700">
							Filter by role:
						</label>
						<select
							id="role-filter"
							className="input-field max-w-xs"
							value={filterRole}
							onChange={(e) => setFilterRole(e.target.value)}
						>
							<option value="all">All roles</option>
							<option value="admin">Admin</option>
							<option value="manager">Manager</option>
							<option value="worker">Worker</option>
						</select>
					</div>
				</div>

				{/* Users grid */}
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{filteredUsers.map((user) => (
						<div key={user.id} className="card hover:shadow-md transition-shadow">
							<div className="flex items-center space-x-3 mb-4">
								<div className="flex-shrink-0">
									<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
										<UserIcon className="h-6 w-6 text-gray-600" />
									</div>
								</div>
								<div>
									<h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
									<p className="text-sm text-gray-500">{user.email}</p>
								</div>
							</div>

							<div className="space-y-2 text-sm">
								<div className="flex justify-between items-center">
									<span className="text-gray-600">Role:</span>
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
											roleColors[user.role as keyof typeof roleColors]
										}`}
									>
										{user.role}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Company:</span>
									<span>{user.company?.name}</span>
								</div>
								<div className="flex justify-between">
									<span className="text-gray-600">Joined:</span>
									<span>{formatDate(user.created_at)}</span>
								</div>
							</div>

							<div className="mt-4 flex space-x-2">
								<button className="btn-primary flex-1 text-sm">View Profile</button>
								<button className="btn-secondary flex-1 text-sm">Edit</button>
							</div>
						</div>
					))}
				</div>

				{filteredUsers.length === 0 && (
					<div className="text-center py-12">
						<UserIcon className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
						<p className="mt-1 text-sm text-gray-500">Try adjusting your filter criteria.</p>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}
