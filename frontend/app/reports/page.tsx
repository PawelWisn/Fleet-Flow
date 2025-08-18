"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
	ChartBarIcon,
	DocumentArrowDownIcon,
	TruckIcon,
	BeakerIcon,
	CalendarIcon,
	UsersIcon,
	MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { reportsApi, vehiclesApi, reservationsApi, refuelsApi, usersApi } from "@/services/api";
import { RefuelStat, Vehicle, PaginatedResponse, Refuel } from "@/types";
import toast from "react-hot-toast";

interface DashboardStats {
	totalVehicles: number;
	totalRefuels: number;
	totalReservations: number;
	totalUsers: number;
}

export default function ReportsPage() {
	const [fuelStats, setFuelStats] = useState<RefuelStat[]>([]);
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [recentRefuels, setRecentRefuels] = useState<Refuel[]>([]);
	const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
		totalVehicles: 0,
		totalRefuels: 0,
		totalReservations: 0,
		totalUsers: 0,
	});
	const [loading, setLoading] = useState(true);
	const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
	const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
	const [downloadingReport, setDownloadingReport] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true);

				// Fetch fuel stats
				try {
					const fuelStatsRes = await reportsApi.getFuelStats();
					setFuelStats(fuelStatsRes);
				} catch (error) {
					console.warn("Failed to fetch fuel stats:", error);
				}

				// Fetch vehicles
				try {
					const vehiclesRes = await vehiclesApi.getAll();
					setVehicles(vehiclesRes.items);
					setDashboardStats((prev) => ({ ...prev, totalVehicles: vehiclesRes.total }));
				} catch (error) {
					console.warn("Failed to fetch vehicles:", error);
				}

				// Fetch refuels
				try {
					const refuelsRes = await refuelsApi.getAll();
					setDashboardStats((prev) => ({ ...prev, totalRefuels: refuelsRes.total }));
					// Get the first 15 recent refuels
					setRecentRefuels(refuelsRes.items.slice(0, 15));
				} catch (error) {
					console.warn("Failed to fetch refuels:", error);
				}

				// Fetch reservations
				try {
					const reservationsRes = await reservationsApi.getAll();
					setDashboardStats((prev) => ({ ...prev, totalReservations: reservationsRes.total }));
				} catch (error) {
					console.warn("Failed to fetch reservations:", error);
				}

				// Fetch users
				try {
					const usersRes = await usersApi.getAll();
					setDashboardStats((prev) => ({ ...prev, totalUsers: usersRes.total }));
				} catch (error) {
					console.warn("Failed to fetch users:", error);
				}
			} catch (error) {
				console.error("Error fetching reports data:", error);
				toast.error("Failed to load some reports data");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	const handleDownloadVehicleReport = async () => {
		if (!selectedVehicle) {
			toast.error("Please select a vehicle first");
			return;
		}

		try {
			setDownloadingReport(true);
			const blob = await reportsApi.getVehicleFuelReport(selectedVehicle);

			// Create download link
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;

			const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle);
			const filename = `vehicle_${selectedVehicleData?.registration_number || selectedVehicle}_fuel_report.pdf`;
			link.download = filename;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Vehicle fuel report downloaded successfully");
		} catch (error: any) {
			console.error("Error downloading report:", error);
			if (error.response?.status === 403) {
				toast.error("You don't have permission to download this report");
			} else {
				toast.error("Failed to download report");
			}
		} finally {
			setDownloadingReport(false);
		}
	};

	const filteredVehicles = vehicles.filter(
		(vehicle) =>
			vehicle.registration_number.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
			vehicle.model.toLowerCase().includes(vehicleSearchTerm.toLowerCase()) ||
			vehicle.brand.toLowerCase().includes(vehicleSearchTerm.toLowerCase()),
	);

	const formatMonth = (monthYear: string) => {
		const [year, month] = monthYear.split("-");
		const date = new Date(parseInt(year), parseInt(month) - 1);
		return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
	};

	const getTotalFuel = () => {
		return fuelStats.reduce((total, stat) => total + stat.total_fuel, 0).toFixed(1);
	};

	const getAvailableVehicles = () => {
		return vehicles.filter((v) => v.availability === "available").length;
	};

	const getInUseVehicles = () => {
		return vehicles.filter((v) => v.availability === "in use").length;
	};

	if (loading) {
		return (
			<DashboardLayout title="Analytics" subtitle="View system statistics and generate reports">
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title="Analytics" subtitle="View system statistics and generate reports">
			<div className="space-y-8">
				{/* Dashboard Stats */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div className="card">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<TruckIcon className="h-8 w-8 text-blue-600" />
							</div>
							<div className="ml-4">
								<div className="text-2xl font-bold text-gray-900">{dashboardStats.totalVehicles}</div>
								<div className="text-sm text-gray-500">Total Vehicles</div>
								<div className="text-xs text-gray-400 mt-1">
									{getAvailableVehicles()} available, {getInUseVehicles()} in use
								</div>
							</div>
						</div>
					</div>

					<div className="card">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<BeakerIcon className="h-8 w-8 text-green-600" />
							</div>
							<div className="ml-4">
								<div className="text-2xl font-bold text-gray-900">{dashboardStats.totalRefuels}</div>
								<div className="text-sm text-gray-500">Fuel Records</div>
								<div className="text-xs text-gray-400 mt-1">{getTotalFuel()}L total fuel</div>
							</div>
						</div>
					</div>

					<div className="card">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<CalendarIcon className="h-8 w-8 text-purple-600" />
							</div>
							<div className="ml-4">
								<div className="text-2xl font-bold text-gray-900">{dashboardStats.totalReservations}</div>
								<div className="text-sm text-gray-500">Reservations</div>
							</div>
						</div>
					</div>

					<div className="card">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<UsersIcon className="h-8 w-8 text-orange-600" />
							</div>
							<div className="ml-4">
								<div className="text-2xl font-bold text-gray-900">{dashboardStats.totalUsers}</div>
								<div className="text-sm text-gray-500">Active Users</div>
							</div>
						</div>
					</div>
				</div>

				{/* Vehicle Reports */}
				<div className="card">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Vehicle Fuel Reports</h3>
							<p className="text-sm text-gray-500">Generate detailed fuel usage reports for vehicles</p>
						</div>
						<DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
					</div>

					<div className="space-y-4">
						<div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
							<div className="flex-1">
								<label className="block text-sm font-medium text-gray-700 mb-2">Search and Select Vehicle</label>
								<div className="space-y-2">
									<div className="relative">
										<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
											<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
										</div>
										<input
											type="text"
											placeholder="Search by registration, brand, or model"
											value={vehicleSearchTerm}
											onChange={(e) => setVehicleSearchTerm(e.target.value)}
											className="input-field pl-10"
										/>
									</div>
									<select
										value={selectedVehicle || ""}
										onChange={(e) => setSelectedVehicle(e.target.value ? parseInt(e.target.value) : null)}
										className="input-field"
									>
										<option value="">Select a vehicle...</option>
										{filteredVehicles.map((vehicle) => (
											<option key={vehicle.id} value={vehicle.id}>
												{vehicle.brand} {vehicle.model} - {vehicle.registration_number}
											</option>
										))}
									</select>
								</div>
							</div>
							<div className="flex items-end">
								<button
									onClick={handleDownloadVehicleReport}
									disabled={!selectedVehicle || downloadingReport}
									className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
								>
									{downloadingReport ? (
										<>
											<LoadingSpinner />
											Generating...
										</>
									) : (
										<>
											<DocumentArrowDownIcon className="h-4 w-4 mr-2" />
											Download PDF Report
										</>
									)}
								</button>
							</div>
						</div>

						{filteredVehicles.length === 0 && vehicleSearchTerm && (
							<div className="text-center py-8">
								<TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
								<p className="mt-1 text-sm text-gray-500">No vehicles match your search criteria</p>
							</div>
						)}

						{vehicles.length === 0 && (
							<div className="text-center py-8">
								<TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles</h3>
								<p className="mt-1 text-sm text-gray-500">Add vehicles to generate reports</p>
							</div>
						)}
					</div>
				</div>

				{/* Recent Refuel Entries */}
				<div className="card">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Recent Refuel Entries</h3>
							<p className="text-sm text-gray-500">Last 15 fuel records</p>
						</div>
						<BeakerIcon className="h-6 w-6 text-gray-400" />
					</div>

					{recentRefuels.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Date
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Vehicle
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Driver
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Fuel Amount
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Price
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Gas Station
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Kilometrage
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{recentRefuels.map((refuel) => (
										<tr key={refuel.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{new Date(refuel.date).toLocaleDateString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{refuel.vehicle ? `${refuel.vehicle.brand} ${refuel.vehicle.model}` : "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{refuel.user?.name || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{refuel.fuel_amount.toFixed(1)}L
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${refuel.price.toFixed(2)}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{refuel.gas_station}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{refuel.kilometrage_during_refuel.toLocaleString()} km
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<div className="text-center py-8">
							<BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-medium text-gray-900">No refuel records</h3>
							<p className="mt-1 text-sm text-gray-500">Start adding fuel records to see them here</p>
						</div>
					)}
				</div>
			</div>
		</DashboardLayout>
	);
}
