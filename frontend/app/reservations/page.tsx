"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { PlusIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

// Mock data
const reservations = [
	{
		id: 1,
		start_date: "2025-01-15",
		end_date: "2025-01-17",
		purpose: "Business trip to Berlin",
		status: "active",
		user: { name: "John Doe", email: "john@example.com" },
		vehicle: { brand: "Toyota", model: "Camry", registration_number: "ABC-123" },
	},
	{
		id: 2,
		start_date: "2025-01-20",
		end_date: "2025-01-22",
		purpose: "Client meeting in Munich",
		status: "pending",
		user: { name: "Jane Smith", email: "jane@example.com" },
		vehicle: { brand: "BMW", model: "X5", registration_number: "XYZ-789" },
	},
	{
		id: 3,
		start_date: "2025-01-10",
		end_date: "2025-01-12",
		purpose: "Equipment delivery",
		status: "completed",
		user: { name: "Mike Johnson", email: "mike@example.com" },
		vehicle: { brand: "Honda", model: "Civic", registration_number: "DEF-456" },
	},
];

const statusColors = {
	pending: "bg-yellow-100 text-yellow-800",
	active: "bg-green-100 text-green-800",
	completed: "bg-blue-100 text-blue-800",
	cancelled: "bg-red-100 text-red-800",
};

export default function ReservationsPage() {
	const [filterStatus, setFilterStatus] = useState("all");

	const filteredReservations = reservations.filter(
		(reservation) => filterStatus === "all" || reservation.status === filterStatus,
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
						<h1 className="text-2xl font-semibold text-gray-900">Reservations</h1>
						<p className="mt-2 text-sm text-gray-700">Manage vehicle reservations and bookings.</p>
					</div>
					<button className="btn-primary flex items-center">
						<PlusIcon className="h-5 w-5 mr-2" />
						New Reservation
					</button>
				</div>

				{/* Filters */}
				<div className="card">
					<div className="flex items-center space-x-4">
						<label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
							Filter by status:
						</label>
						<select
							id="status-filter"
							className="input-field max-w-xs"
							value={filterStatus}
							onChange={(e) => setFilterStatus(e.target.value)}
						>
							<option value="all">All statuses</option>
							<option value="pending">Pending</option>
							<option value="active">Active</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>
				</div>

				{/* Reservations list */}
				<div className="card">
					<div className="overflow-hidden">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Reservation
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Vehicle
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										User
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Dates
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{filteredReservations.map((reservation) => (
									<tr key={reservation.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="flex items-center">
												<CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
												<div>
													<div className="text-sm font-medium text-gray-900">#{reservation.id}</div>
													<div className="text-sm text-gray-500">{reservation.purpose}</div>
												</div>
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{reservation.vehicle.brand} {reservation.vehicle.model}
											</div>
											<div className="text-sm text-gray-500">{reservation.vehicle.registration_number}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">{reservation.user.name}</div>
											<div className="text-sm text-gray-500">{reservation.user.email}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
											<div>{formatDate(reservation.start_date)}</div>
											<div className="text-gray-500">to {formatDate(reservation.end_date)}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
													statusColors[reservation.status as keyof typeof statusColors]
												}`}
											>
												{reservation.status}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
											<button className="text-primary-600 hover:text-primary-900">View</button>
											<button className="text-gray-600 hover:text-gray-900">Edit</button>
											<button className="text-red-600 hover:text-red-900">Cancel</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>

				{filteredReservations.length === 0 && (
					<div className="text-center py-12">
						<CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
						<h3 className="mt-2 text-sm font-medium text-gray-900">No reservations</h3>
						<p className="mt-1 text-sm text-gray-500">Get started by creating a new reservation.</p>
						<div className="mt-6">
							<button className="btn-primary">
								<PlusIcon className="h-5 w-5 mr-2" />
								New Reservation
							</button>
						</div>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}
