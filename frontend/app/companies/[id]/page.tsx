"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
	BuildingOfficeIcon,
	PencilIcon,
	TrashIcon,
	MapPinIcon,
	IdentificationIcon,
	TruckIcon,
	UsersIcon,
} from "@heroicons/react/24/outline";
import { companiesApi } from "@/services/api";
import { Company } from "@/types";

export default function CompanyDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const companyId = parseInt(params.id as string);

	const [company, setCompany] = useState<Company | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		const fetchCompany = async () => {
			try {
				const companyData = await companiesApi.getById(companyId);
				setCompany(companyData);
			} catch (error) {
				console.error("Error fetching company:", error);
				toast.error("Failed to load company data");
				router.push("/companies");
			} finally {
				setIsLoading(false);
			}
		};

		if (companyId) {
			fetchCompany();
		}
	}, [companyId, router]);

	const handleDelete = async () => {
		if (!company) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete "${company.name}"? This action cannot be undone and will also delete all associated vehicles and users.`,
		);

		if (!confirmed) return;

		setIsDeleting(true);
		try {
			await companiesApi.delete(companyId);
			toast.success("Company deleted successfully");
			router.push("/companies");
		} catch (error) {
			console.error("Error deleting company:", error);
			toast.error("Failed to delete company");
		} finally {
			setIsDeleting(false);
		}
	};

	if (isLoading) {
		return (
			<DashboardLayout>
				<div className="flex justify-center items-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (!company) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Company not found</h2>
					<p className="text-gray-600 mb-4">The company you're looking for doesn't exist.</p>
					<button onClick={() => router.push("/companies")} className="text-blue-600 hover:text-blue-500">
						Back to Companies
					</button>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="bg-white shadow-sm rounded-lg">
					<div className="px-6 py-4 border-b border-gray-200">
						<div className="flex justify-between items-start">
							<div className="flex items-center">
								<BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
								<div>
									<h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
									<div className="flex items-center mt-1 text-sm text-gray-500">
										<IdentificationIcon className="h-4 w-4 mr-1" />
										NIP: {company.nip}
									</div>
								</div>
							</div>
							<div className="flex space-x-2">
								<button
									onClick={() => router.push(`/companies/${companyId}/edit`)}
									className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									<PencilIcon className="h-4 w-4 mr-1" />
									Edit
								</button>
								<button
									onClick={handleDelete}
									disabled={isDeleting}
									className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<TrashIcon className="h-4 w-4 mr-1" />
									{isDeleting ? "Deleting..." : "Delete"}
								</button>
							</div>
						</div>
					</div>

					{/* Company Details */}
					<div className="p-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Address Information */}
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
									<MapPinIcon className="h-5 w-5 mr-2" />
									Address Information
								</h3>
								<div className="space-y-3">
									<div>
										<span className="text-sm font-medium text-gray-500">Street Address:</span>
										<p className="text-sm text-gray-900">{company.address1}</p>
										{company.address2 && <p className="text-sm text-gray-900">{company.address2}</p>}
									</div>
									<div className="grid grid-cols-2 gap-4">
										<div>
											<span className="text-sm font-medium text-gray-500">City:</span>
											<p className="text-sm text-gray-900">{company.city}</p>
										</div>
										<div>
											<span className="text-sm font-medium text-gray-500">Post Code:</span>
											<p className="text-sm text-gray-900">{company.post_code}</p>
										</div>
									</div>
									<div>
										<span className="text-sm font-medium text-gray-500">Country:</span>
										<p className="text-sm text-gray-900">{company.country}</p>
									</div>
								</div>
							</div>

							{/* Statistics */}
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
								<div className="space-y-4">
									<div className="bg-blue-50 p-4 rounded-lg">
										<div className="flex items-center">
											<TruckIcon className="h-8 w-8 text-blue-600" />
											<div className="ml-3">
												<p className="text-2xl font-semibold text-blue-900">{company.vehicles?.length || 0}</p>
												<p className="text-sm text-blue-700">Vehicles</p>
											</div>
										</div>
									</div>
									<div className="bg-green-50 p-4 rounded-lg">
										<div className="flex items-center">
											<UsersIcon className="h-8 w-8 text-green-600" />
											<div className="ml-3">
												<p className="text-2xl font-semibold text-green-900">{company.users?.length || 0}</p>
												<p className="text-sm text-green-700">Users</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="bg-white shadow-sm rounded-lg p-6">
					<h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						<button
							onClick={() => router.push("/vehicles?company=" + companyId)}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
						>
							<TruckIcon className="h-6 w-6 text-blue-600 mb-2" />
							<h4 className="font-medium text-gray-900">View Vehicles</h4>
							<p className="text-sm text-gray-500">See all vehicles for this company</p>
						</button>
						<button
							onClick={() => router.push("/users?company=" + companyId)}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
						>
							<UsersIcon className="h-6 w-6 text-green-600 mb-2" />
							<h4 className="font-medium text-gray-900">View Users</h4>
							<p className="text-sm text-gray-500">See all users for this company</p>
						</button>
						<button
							onClick={() => router.push(`/companies/${companyId}/edit`)}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
						>
							<PencilIcon className="h-6 w-6 text-purple-600 mb-2" />
							<h4 className="font-medium text-gray-900">Edit Company</h4>
							<p className="text-sm text-gray-500">Update company information</p>
						</button>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
