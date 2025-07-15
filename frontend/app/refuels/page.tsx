"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { refuelsApi } from "@/services/api";
import { Refuel, PaginatedResponse } from "@/types";
import toast from "react-hot-toast";

export default function RefuelsPage() {
	const router = useRouter();
	const [refuels, setRefuels] = useState<Refuel[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const itemsPerPage = 15;

	const fetchRefuels = async (page = 1, search = "") => {
		try {
			setLoading(true);
			const response: PaginatedResponse<Refuel> = await refuelsApi.getAll();
			setRefuels(response.items);
			setTotalPages(Math.ceil(response.total / itemsPerPage));
			setTotalItems(response.total);
			setCurrentPage(page);
		} catch (error) {
			console.error("Error fetching refuels:", error);
			toast.error("Failed to load refuels");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRefuels(1, searchTerm);
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentPage(1);
		fetchRefuels(1, searchTerm);
	};

	const handlePageChange = (page: number) => {
		fetchRefuels(page, searchTerm);
	};

	const handleDelete = async (refuelId: number) => {
		if (!confirm("Are you sure you want to delete this refuel record?")) {
			return;
		}

		try {
			await refuelsApi.delete(refuelId);
			toast.success("Refuel record deleted successfully");
			fetchRefuels(currentPage, searchTerm);
		} catch (error) {
			console.error("Error deleting refuel:", error);
			toast.error("Failed to delete refuel record");
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

	const renderPagination = () => {
		if (totalPages <= 1) return null;

		const pages = [];
		const maxVisiblePages = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

		if (endPage - startPage + 1 < maxVisiblePages) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		for (let i = startPage; i <= endPage; i++) {
			pages.push(
				<button
					key={i}
					onClick={() => handlePageChange(i)}
					className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
						i === currentPage
							? "z-10 bg-primary-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
							: "text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0"
					}`}
				>
					{i}
				</button>,
			);
		}

		return (
			<div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
				<div className="flex flex-1 justify-between sm:hidden">
					<button
						onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
						disabled={currentPage === 1}
						className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
					>
						Previous
					</button>
					<button
						onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
						disabled={currentPage === totalPages}
						className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
					<div>
						<nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
							<button
								onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
								disabled={currentPage === 1}
								className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
							>
								Previous
							</button>
							{pages}
							<button
								onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
								disabled={currentPage === totalPages}
								className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
							>
								Next
							</button>
						</nav>
					</div>
				</div>
			</div>
		);
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
				{/* Action buttons and search */}
				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
					{/* Search */}
					<form onSubmit={handleSearch} className="flex-1 max-w-md">
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
							</div>
							<input
								type="text"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Search by location, vehicle..."
								className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
							/>
						</div>
					</form>

					{/* Add button */}
					<button onClick={() => router.push("/refuels/add")} className="btn-primary flex items-center">
						<PlusIcon className="h-5 w-5 mr-2" />
						Add Refuel
					</button>
				</div>

				{/* Refuels grid */}
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

				{/* Empty state */}
				{refuels.length === 0 && (
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
				{renderPagination()}
			</div>
		</DashboardLayout>
	);
}
