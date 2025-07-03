"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { PlusIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

// Mock data
const companies = [
	{
		id: 1,
		name: "Acme Corp",
		address: "123 Business St, City, State 12345",
		phone: "+1 (555) 123-4567",
		email: "contact@acmecorp.com",
		vehicle_count: 25,
		user_count: 12,
		created_at: "2023-01-15T10:00:00Z",
	},
	{
		id: 2,
		name: "Tech Solutions",
		address: "456 Innovation Ave, Tech City, TC 67890",
		phone: "+1 (555) 987-6543",
		email: "info@techsolutions.com",
		vehicle_count: 18,
		user_count: 8,
		created_at: "2023-03-22T14:30:00Z",
	},
	{
		id: 3,
		name: "Global Logistics",
		address: "789 Transport Rd, Shipping Port, SP 11111",
		phone: "+1 (555) 456-7890",
		email: "hello@globallogistics.com",
		vehicle_count: 42,
		user_count: 24,
		created_at: "2022-11-08T09:15:00Z",
	},
];

export default function CompaniesPage() {
	const [searchTerm, setSearchTerm] = useState("");

	const filteredCompanies = companies.filter(
		(company) =>
			company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			company.email.toLowerCase().includes(searchTerm.toLowerCase()),
	);

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
						<h1 className="text-2xl font-semibold text-gray-900">Companies</h1>
						<p className="mt-2 text-sm text-gray-700">Manage company information and fleet assignments.</p>
					</div>
					<button className="btn-primary flex items-center">
						<PlusIcon className="h-5 w-5 mr-2" />
						Add Company
					</button>
				</div>

				{/* Search */}
				<div className="card">
					<div className="max-w-md">
						<label htmlFor="search" className="block text-sm font-medium text-gray-700">
							Search companies
						</label>
						<input
							type="text"
							id="search"
							className="input-field mt-1"
							placeholder="Search by name or email"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
				</div>

				{/* Companies grid */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{filteredCompanies.map((company) => (
						<div key={company.id} className="card hover:shadow-md transition-shadow">
							<div className="flex items-start space-x-3">
								<div className="flex-shrink-0">
									<div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
										<BuildingOfficeIcon className="h-8 w-8 text-primary-600" />
									</div>
								</div>
								<div className="flex-1 min-w-0">
									<h3 className="text-lg font-medium text-gray-900 truncate">{company.name}</h3>
									<p className="text-sm text-gray-500 mt-1">Member since {formatDate(company.created_at)}</p>
								</div>
							</div>

							<div className="mt-4 space-y-3">
								<div>
									<p className="text-sm text-gray-600">Address</p>
									<p className="text-sm font-medium text-gray-900">{company.address}</p>
								</div>

								<div className="grid grid-cols-2 gap-4">
									<div>
										<p className="text-sm text-gray-600">Phone</p>
										<p className="text-sm font-medium text-gray-900">{company.phone}</p>
									</div>
									<div>
										<p className="text-sm text-gray-600">Email</p>
										<p className="text-sm font-medium text-gray-900 truncate">{company.email}</p>
									</div>
								</div>

								<div className="flex justify-between pt-3 border-t border-gray-200">
									<div className="text-center">
										<p className="text-2xl font-semibold text-gray-900">{company.vehicle_count}</p>
										<p className="text-sm text-gray-600">Vehicles</p>
									</div>
									<div className="text-center">
										<p className="text-2xl font-semibold text-gray-900">{company.user_count}</p>
										<p className="text-sm text-gray-600">Users</p>
									</div>
								</div>
							</div>

							<div className="mt-4 flex space-x-2">
								<button className="btn-primary flex-1 text-sm">View Details</button>
								<button className="btn-secondary flex-1 text-sm">Edit</button>
							</div>
						</div>
					))}
				</div>

				{filteredCompanies.length === 0 && (
					<div className="text-center py-12">
						<BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-2 text-sm font-medium text-gray-900">No companies found</h3>
						<p className="mt-1 text-sm text-gray-500">
							{searchTerm ? "Try adjusting your search criteria." : "Get started by adding your first company."}
						</p>
						{!searchTerm && (
							<div className="mt-6">
								<button className="btn-primary">
									<PlusIcon className="h-5 w-5 mr-2" />
									Add Company
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}
