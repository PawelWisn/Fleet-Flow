"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { refuelsApi } from "@/services/api";
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Refuel, PaginatedResponse } from "@/types";
import toast from "react-hot-toast";
export default function RefuelsPage() {
	const router = useRouter();
	const [refuels, setRefuels] = useState<Refuel[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [paginationData, setPaginationData] = useState<PaginatedResponse<Refuel> | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Fetch refuels from API
	useEffect(() => {
		const fetchRefuels = async () => {
			try {
				setLoading(true);
				const response: PaginatedResponse<Refuel> = await refuelsApi.getAll({
					page: currentPage,
					size: pageSize,
					search: debouncedSearchTerm || undefined,
				});
				setRefuels(response.items);
				setPaginationData(response);
			} catch (error) {
				console.error("Error fetching refuels:", error);
				toast.error("Failed to fetch refuel records");
			} finally {
				setLoading(false);
			}
		};

		fetchRefuels();
	}, [currentPage, pageSize, debouncedSearchTerm]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePageSizeChange = (size: number) => {
		setPageSize(size);
		setCurrentPage(1); // Reset to first page when changing page size
	};

	const handleSearchChange = (value: string) => {
		setSearchTerm(value);
		setCurrentPage(1); // Reset to first page when searching
	};

	const handleDelete = async (refuelId: number) => {
		if (window.confirm("Are you sure you want to delete this refuel record?")) {
			try {
				await refuelsApi.delete(refuelId);
				toast.success("Refuel record deleted successfully");
				// Refetch by updating search term temporarily
				const currentSearch = debouncedSearchTerm;
				setDebouncedSearchTerm("");
				setTimeout(() => setDebouncedSearchTerm(currentSearch), 50);
			} catch (error) {
				console.error("Error deleting refuel:", error);
				toast.error("Failed to delete refuel record");
			}
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	if (loading) {
		return (
			<DashboardLayout title="Refuels" subtitle="Manage fuel records and track consumption">
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title="Refuels" subtitle="Manage fuel records and track consumption">
			<div className="space-y-6">
				{/* Search and Action buttons */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					{/* Search input */}
					<div className="relative flex-1 max-w-md">
						<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
							<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
						</div>
						<input
							type="text"
							placeholder="Search by vehicle brand, model or driver..."
							value={searchTerm}
							onChange={(e) => handleSearchChange(e.target.value)}
							className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
						/>
					</div>

					{/* Add button */}
					<button onClick={() => router.push("/refuels/add")} className="btn-primary whitespace-nowrap">
						<PlusIcon className="h-5 w-5 mr-2" />
						Add Refuel
					</button>
				</div>

				{/* Refuels grid */}
				{refuels.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{refuels.map((refuel) => (
							<div key={refuel.id} className="card hover:shadow-md transition-shadow">
								<div className="flex justify-between items-start mb-4">
									<div>
										<h3 className="text-lg font-semibold text-gray-900">
											{refuel.vehicle?.brand} {refuel.vehicle?.model}
										</h3>
										<p className="text-sm text-gray-500">{refuel.vehicle?.registration_number}</p>
									</div>
									<div className="flex space-x-2">
										<button
											onClick={() => router.push(`/refuels/${refuel.id}`)}
											className="text-gray-400 hover:text-primary-600 transition-colors"
											title="View details"
										>
											<EyeIcon className="h-4 w-4" />
										</button>
										<button
											onClick={() => router.push(`/refuels/${refuel.id}/edit`)}
											className="text-gray-400 hover:text-blue-600 transition-colors"
											title="Edit"
										>
											<PencilIcon className="h-4 w-4" />
										</button>
										<button
											onClick={() => handleDelete(refuel.id)}
											className="text-gray-400 hover:text-red-600 transition-colors"
											title="Delete"
										>
											<TrashIcon className="h-4 w-4" />
										</button>
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Date:</span>
										<span className="text-sm font-medium">{formatDate(refuel.date)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Fuel Amount:</span>
										<span className="text-sm font-medium">{refuel.fuel_amount}L</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Price:</span>
										<span className="text-sm font-medium">{formatCurrency(refuel.price)}</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Kilometrage:</span>
										<span className="text-sm font-medium">{refuel.kilometrage_during_refuel.toLocaleString()} km</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Gas Station:</span>
										<span className="text-sm font-medium truncate" title={refuel.gas_station}>
											{refuel.gas_station}
										</span>
									</div>
									<div className="flex justify-between">
										<span className="text-sm text-gray-600">Driver:</span>
										<span className="text-sm font-medium">{refuel.user?.name}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<div className="mx-auto h-12 w-12 text-gray-400">
							<svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</div>
						<h3 className="mt-2 text-sm font-medium text-gray-900">No refuel records</h3>
						<p className="mt-1 text-sm text-gray-500">Get started by adding a new refuel record.</p>
						<div className="mt-6">
							<button onClick={() => router.push("/refuels/add")} className="btn-primary">
								<PlusIcon className="h-5 w-5 mr-2" />
								Add Refuel
							</button>
						</div>
					</div>
				)}

				{/* Pagination */}
				{!loading && paginationData && paginationData.pages > 1 && (
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
