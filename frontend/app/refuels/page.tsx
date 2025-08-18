"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { refuelsApi } from "@/services/api";
import { PlusIcon, EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Refuel, PaginatedResponse } from "@/types";
import toast from "react-hot-toast";

export default function RefuelsPage() {
	const router = useRouter();
	const [refuels, setRefuels] = useState<Refuel[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [paginationData, setPaginationData] = useState<PaginatedResponse<Refuel> | null>(null);

	const fetchRefuels = async () => {
		try {
			setLoading(true);
			const response: PaginatedResponse<Refuel> = await refuelsApi.getAll({
				page: currentPage,
				size: pageSize,
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

	useEffect(() => {
		fetchRefuels();
	}, [currentPage, pageSize]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePageSizeChange = (size: number) => {
		setPageSize(size);
		setCurrentPage(1);
	};

	const handleDelete = async (refuelId: number) => {
		if (window.confirm("Are you sure you want to delete this refuel record?")) {
			try {
				await refuelsApi.delete(refuelId);
				toast.success("Refuel record deleted successfully");
				fetchRefuels();
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
				{/* Action buttons */}
				<div className="flex justify-end">
					{/* Add button */}
					<button onClick={() => router.push("/refuels/add")} className="btn-primary">
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
