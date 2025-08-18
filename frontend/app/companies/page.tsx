"use client";

import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import {
	PlusIcon,
	BuildingOfficeIcon,
	MagnifyingGlassIcon,
	PencilIcon,
	EyeIcon,
	TruckIcon,
	UsersIcon,
	MapPinIcon,
} from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { companiesApi } from "@/services/api";
import { Company, PaginatedResponse } from "@/types";

export default function CompaniesPage() {
	const router = useRouter();
	const [companies, setCompanies] = useState<Company[]>([]);
	const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [paginationData, setPaginationData] = useState<PaginatedResponse<Company> | null>(null);

	useEffect(() => {
		const fetchCompanies = async () => {
			try {
				setIsLoading(true);
				const response = await companiesApi.getAll({
					page: currentPage,
					size: pageSize,
				});
				setCompanies(response.items);
				setFilteredCompanies(response.items);
				setPaginationData(response);
				setError(null);
			} catch (error) {
				console.error("Error fetching companies:", error);
				setError("Failed to load companies");
				toast.error("Failed to load companies");
			} finally {
				setIsLoading(false);
			}
		};

		fetchCompanies();
	}, [currentPage, pageSize]);

	useEffect(() => {
		const filtered = companies.filter(
			(company) =>
				company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				company.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
				company.nip.includes(searchTerm),
		);
		setFilteredCompanies(filtered);
	}, [searchTerm, companies]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePageSizeChange = (size: number) => {
		setPageSize(size);
		setCurrentPage(1);
	};

	const formatAddress = (company: Company) => {
		const parts = [company.address1];
		if (company.address2) parts.push(company.address2);
		parts.push(`${company.city}, ${company.post_code}`);
		parts.push(company.country);
		return parts.join(", ");
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

	if (error) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<div className="bg-red-50 border border-red-200 rounded-md p-4">
						<h3 className="text-lg font-medium text-red-800">Error Loading Companies</h3>
						<p className="text-red-600 mt-2">{error}</p>
						<button
							onClick={() => window.location.reload()}
							className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded"
						>
							Try Again
						</button>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex justify-between items-center">
					<div className="flex items-center">
						<BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Companies</h1>
							<p className="text-gray-600">Manage company information and settings</p>
						</div>
					</div>
					<button
						onClick={() => router.push("/companies/add")}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<PlusIcon className="h-4 w-4 mr-2" />
						Add Company
					</button>
				</div>

				{/* Search and Filters */}
				<div className="bg-white shadow-sm rounded-lg p-6">
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="flex-1">
							<div className="relative">
								<MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<input
									type="text"
									placeholder="Search companies by name, city, or NIP..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						</div>
					</div>

					{searchTerm && (
						<div className="mt-4 text-sm text-gray-600">
							Showing {filteredCompanies.length} of {companies.length} companies
						</div>
					)}
				</div>

				{/* Companies List */}
				{filteredCompanies.length === 0 ? (
					<div className="bg-white shadow-sm rounded-lg p-12 text-center">
						<BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							{searchTerm ? "No companies found" : "No companies yet"}
						</h3>
						<p className="text-gray-500 mb-6">
							{searchTerm ? "Try adjusting your search criteria" : "Get started by adding your first company"}
						</p>
						{!searchTerm && (
							<button
								onClick={() => router.push("/companies/add")}
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
							>
								<PlusIcon className="h-4 w-4 mr-2" />
								Add First Company
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
						{filteredCompanies.map((company) => (
							<div
								key={company.id}
								className="bg-white shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
							>
								<div className="p-6">
									<div className="flex justify-between items-start mb-4">
										<div className="flex items-center">
											<BuildingOfficeIcon className="h-8 w-8 text-blue-600 mr-3" />
											<div>
												<h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{company.name}</h3>
												<p className="text-sm text-gray-500">NIP: {company.nip}</p>
											</div>
										</div>
									</div>

									<div className="space-y-3 mb-4">
										<div className="flex items-start">
											<MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
											<p className="text-sm text-gray-600 line-clamp-2">{formatAddress(company)}</p>
										</div>
									</div>

									{/* Stats */}
									<div className="grid grid-cols-2 gap-4 mb-4">
										<div className="text-center p-3 bg-blue-50 rounded-lg">
											<div className="flex items-center justify-center mb-1">
												<TruckIcon className="h-4 w-4 text-blue-600 mr-1" />
												<span className="text-lg font-semibold text-blue-900">{company.vehicles?.length || 0}</span>
											</div>
											<p className="text-xs text-blue-700">Vehicles</p>
										</div>
										<div className="text-center p-3 bg-green-50 rounded-lg">
											<div className="flex items-center justify-center mb-1">
												<UsersIcon className="h-4 w-4 text-green-600 mr-1" />
												<span className="text-lg font-semibold text-green-900">{company.users?.length || 0}</span>
											</div>
											<p className="text-xs text-green-700">Users</p>
										</div>
									</div>

									{/* Actions */}
									<div className="flex space-x-2">
										<button
											onClick={() => router.push(`/companies/${company.id}`)}
											className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
										>
											<EyeIcon className="h-4 w-4 mr-1" />
											View
										</button>
										<button
											onClick={() => router.push(`/companies/${company.id}/edit`)}
											className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
										>
											<PencilIcon className="h-4 w-4 mr-1" />
											Edit
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Pagination */}
				{!isLoading && paginationData && paginationData.pages > 1 && (
					<Pagination
						currentPage={currentPage}
						totalPages={paginationData.pages}
						totalItems={paginationData.total}
						itemsPerPage={pageSize}
						onPageChange={handlePageChange}
						onPageSizeChange={handlePageSizeChange}
					/>
				)}
			</div>
		</DashboardLayout>
	);
}
