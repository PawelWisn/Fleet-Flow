"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
	CalendarIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	EyeIcon,
	PencilIcon,
	TruckIcon,
	UserIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { reservationsApi } from "@/services/api";
import { Reservation } from "@/types";

export default function ReservationsPage() {
	const router = useRouter();
	const [reservations, setReservations] = useState<Reservation[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");

	useEffect(() => {
		const fetchReservations = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await reservationsApi.getAll();
				setReservations(response.items || []);
			} catch (err: any) {
				console.error("Error fetching reservations:", err);
				if (err.response?.status === 401) {
					router.push("/");
				} else {
					setError("Failed to load reservations. Please try again.");
					toast.error("Failed to load reservations");
				}
			} finally {
				setLoading(false);
			}
		};

		fetchReservations();
	}, [router]);

	const filteredReservations = reservations.filter((reservation) => {
		const matchesSearch =
			reservation.vehicle?.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			reservation.vehicle?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			reservation.vehicle?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			reservation.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

		return matchesSearch;
	});

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	const getDuration = (dateFrom: string, dateTo: string) => {
		const start = new Date(dateFrom);
		const end = new Date(dateTo);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays === 1 ? "1 day" : `${diffDays} days`;
	};

	if (loading) {
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
						<h3 className="text-lg font-medium text-red-800">Error Loading Reservations</h3>
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
						<CalendarIcon className="h-8 w-8 text-blue-600 mr-3" />
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
							<p className="text-gray-600">Manage vehicle reservations and bookings</p>
						</div>
					</div>
					<button
						onClick={() => router.push("/reservations/add")}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<PlusIcon className="h-4 w-4 mr-2" />
						New Reservation
					</button>
				</div>

				{/* Search */}
				<div className="bg-white shadow-sm rounded-lg p-6">
					<div className="relative">
						<MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							placeholder="Search by vehicle or user..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					{searchTerm && (
						<div className="mt-4 text-sm text-gray-600">
							Showing {filteredReservations.length} of {reservations.length} reservations
						</div>
					)}
				</div>

				{/* Reservations List */}
				{filteredReservations.length === 0 ? (
					<div className="bg-white shadow-sm rounded-lg p-12 text-center">
						<CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							{reservations.length === 0 ? "No reservations yet" : "No reservations found"}
						</h3>
						<p className="text-gray-500 mb-6">
							{reservations.length === 0
								? "Get started by creating your first reservation"
								: "Try adjusting your search criteria"}
						</p>
						{reservations.length === 0 && (
							<button
								onClick={() => router.push("/reservations/add")}
								className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
							>
								<PlusIcon className="h-4 w-4 mr-2" />
								Create First Reservation
							</button>
						)}
					</div>
				) : (
					<div className="bg-white shadow-sm rounded-lg overflow-hidden">
						<div className="grid grid-cols-1 divide-y divide-gray-200">
							{filteredReservations.map((reservation) => (
								<div key={reservation.id} className="p-6 hover:bg-gray-50">
									<div className="flex items-center justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center space-x-3 mb-2">
												<h3 className="text-lg font-medium text-gray-900">Reservation #{reservation.id}</h3>
											</div>

											<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
												<div className="flex items-center">
													<CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
													<span>
														{formatDate(reservation.date_from)} - {formatDate(reservation.date_to)}
													</span>
													<span className="ml-2 text-gray-500">
														({getDuration(reservation.date_from, reservation.date_to)})
													</span>
												</div>

												{reservation.vehicle && (
													<div className="flex items-center">
														<TruckIcon className="h-4 w-4 mr-2 text-gray-400" />
														<span>
															{reservation.vehicle.registration_number} - {reservation.vehicle.brand}{" "}
															{reservation.vehicle.model}
														</span>
													</div>
												)}

												{reservation.user && (
													<div className="flex items-center">
														<UserIcon className="h-4 w-4 mr-2 text-gray-400" />
														<span>{reservation.user.name}</span>
													</div>
												)}
											</div>
										</div>

										<div className="flex items-center space-x-2 ml-4">
											<button
												onClick={() => router.push(`/reservations/${reservation.id}`)}
												className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
											>
												<EyeIcon className="h-4 w-4 mr-1" />
												View
											</button>
											<button
												onClick={() => router.push(`/reservations/${reservation.id}/edit`)}
												className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
											>
												<PencilIcon className="h-4 w-4 mr-1" />
												Edit
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}
