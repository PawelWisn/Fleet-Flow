"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { CalendarIcon, TruckIcon, UserIcon, ClockIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { reservationsApi } from "@/services/api";
import { Reservation } from "@/types";

export default function ReservationDetailsPage() {
	const router = useRouter();
	const params = useParams();
	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchReservation = async () => {
			try {
				setLoading(true);
				const data = await reservationsApi.getById(parseInt(params.id as string));
				setReservation(data);
			} catch (error: any) {
				console.error("Error fetching reservation:", error);
				if (error.response?.status === 404) {
					setError("Reservation not found");
				} else {
					setError("Failed to load reservation");
				}
				toast.error("Failed to load reservation");
			} finally {
				setLoading(false);
			}
		};

		if (params.id) {
			fetchReservation();
		}
	}, [params.id]);

	const handleDelete = async () => {
		if (!reservation) return;

		const confirmed = window.confirm("Are you sure you want to delete this reservation? This action cannot be undone.");

		if (!confirmed) return;

		setDeleting(true);
		try {
			await reservationsApi.delete(reservation.id);
			toast.success("Reservation deleted successfully");
			router.push("/reservations");
		} catch (error: any) {
			console.error("Error deleting reservation:", error);
			toast.error("Failed to delete reservation");
		} finally {
			setDeleting(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatDateTime = (dateString: string) => {
		return new Date(dateString).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
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

	if (error || !reservation) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
						<h3 className="text-lg font-medium text-red-800">Error Loading Reservation</h3>
						<p className="text-red-600 mt-2">{error}</p>
						<button
							onClick={() => router.push("/reservations")}
							className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded"
						>
							Back to Reservations
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
				<div className="flex justify-between items-start">
					<div className="flex items-center">
						<CalendarIcon className="h-8 w-8 text-blue-600 mr-3" />
						<div>
							<h1 className="text-2xl font-bold text-gray-900">Reservation Details</h1>
							<p className="text-gray-600">View and manage reservation information</p>
						</div>
					</div>
					<div className="flex space-x-3">
						<button
							onClick={() => router.push(`/reservations/${reservation.id}/edit`)}
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
							{deleting ? <LoadingSpinner /> : <TrashIcon className="h-4 w-4 mr-2" />}
							Delete
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Main Information */}
					<div className="lg:col-span-2 space-y-6">
						{/* Basic Details */}
						<div className="bg-white shadow-sm rounded-lg p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Reservation Information</h2>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-medium text-gray-500 mb-1">From Date</label>
									<p className="text-lg text-gray-900">{formatDate(reservation.date_from)}</p>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-500 mb-1">To Date</label>
									<p className="text-lg text-gray-900">{formatDate(reservation.date_to)}</p>
								</div>
							</div>
						</div>

						{/* Vehicle Information */}
						{reservation.vehicle && (
							<div className="bg-white shadow-sm rounded-lg p-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
									<TruckIcon className="h-5 w-5 mr-2" />
									Vehicle Information
								</h2>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-500 mb-1">Registration</label>
										<p className="text-lg font-semibold text-gray-900">{reservation.vehicle.registration_number}</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-500 mb-1">Vehicle</label>
										<p className="text-lg text-gray-900">
											{reservation.vehicle.brand} {reservation.vehicle.model}
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-500 mb-1">Type</label>
										<p className="text-gray-900 capitalize">{reservation.vehicle.gearbox_type}</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-500 mb-1">Year</label>
										<p className="text-gray-900">{reservation.vehicle.production_year}</p>
									</div>
								</div>
							</div>
						)}

						{/* User Information */}
						{reservation.user && (
							<div className="bg-white shadow-sm rounded-lg p-6">
								<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
									<UserIcon className="h-5 w-5 mr-2" />
									User Information
								</h2>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
										<p className="text-lg text-gray-900">{reservation.user.name}</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
										<p className="text-gray-900">{reservation.user.email}</p>
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Timeline */}
						<div className="bg-white shadow-sm rounded-lg p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
								<ClockIcon className="h-5 w-5 mr-2" />
								Timeline
							</h2>

							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-500 mb-1">Reserved On</label>
									<p className="text-sm text-gray-900">{formatDateTime(reservation.reservation_date)}</p>
								</div>
							</div>
						</div>

						{/* Quick Actions */}
						<div className="bg-white shadow-sm rounded-lg p-6">
							<h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

							<div className="space-y-3">
								<button
									onClick={() => router.push("/reservations")}
									className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
								>
									← Back to Reservations
								</button>

								{reservation.vehicle && (
									<button
										onClick={() => router.push(`/vehicles/${reservation.vehicle?.id}`)}
										className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
									>
										View Vehicle Details
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
