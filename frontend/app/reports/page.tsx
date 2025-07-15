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
} from "@heroicons/react/24/outline";
import { reportsApi, vehiclesApi, reservationsApi, refuelsApi, usersApi } from "@/services/api";
import { RefuelStat, Vehicle, PaginatedResponse } from "@/types";
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
	const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
		totalVehicles: 0,
		totalRefuels: 0,
		totalReservations: 0,
		totalUsers: 0,
	});
	const [loading, setLoading] = useState(true);
	const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
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

			toast.success("Report downloaded successfully");
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
			<DashboardLayout title="Reports & Analytics" subtitle="View system statistics and generate reports">
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title="Reports & Analytics" subtitle="View system statistics and generate reports">
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

				{/* Fuel Usage Chart */}
				<div className="card">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Monthly Fuel Usage</h3>
							<p className="text-sm text-gray-500">Fuel consumption over time</p>
						</div>
						<ChartBarIcon className="h-6 w-6 text-gray-400" />
					</div>

					{fuelStats.length > 0 ? (
						<div className="space-y-4">
							{/* Simple bar chart representation */}
							<div className="space-y-3">
								{fuelStats.slice(-12).map((stat, index) => {
									const maxFuel = Math.max(...fuelStats.map((s) => s.total_fuel));
									const percentage = (stat.total_fuel / maxFuel) * 100;

									return (
										<div key={stat.month_year} className="flex items-center space-x-4">
											<div className="w-20 text-sm text-gray-600 font-mono">{formatMonth(stat.month_year)}</div>
											<div className="flex-1">
												<div className="bg-gray-200 rounded-full h-6 relative">
													<div
														className="bg-blue-600 h-6 rounded-full transition-all duration-300"
														style={{ width: `${percentage}%` }}
													/>
													<div className="absolute inset-0 flex items-center px-3">
														<span className="text-xs font-medium text-white">{stat.total_fuel.toFixed(1)}L</span>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					) : (
						<div className="text-center py-8">
							<ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-medium text-gray-900">No fuel data</h3>
							<p className="mt-1 text-sm text-gray-500">Start adding fuel records to see statistics</p>
						</div>
					)}
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
								<label className="block text-sm font-medium text-gray-700 mb-2">Select Vehicle</label>
								<select
									value={selectedVehicle || ""}
									onChange={(e) => setSelectedVehicle(e.target.value ? parseInt(e.target.value) : null)}
									className="input"
								>
									<option value="">Select a vehicle...</option>
									{vehicles.map((vehicle) => (
										<option key={vehicle.id} value={vehicle.id}>
											{vehicle.brand} {vehicle.model} - {vehicle.registration_number}
										</option>
									))}
								</select>
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

						{vehicles.length === 0 && (
							<div className="text-center py-8">
								<TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
								<h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles</h3>
								<p className="mt-1 text-sm text-gray-500">Add vehicles to generate reports</p>
							</div>
						)}
					</div>
				</div>

				{/* Vehicle Status Overview */}
				<div className="card">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h3 className="text-lg font-semibold text-gray-900">Vehicle Status Overview</h3>
							<p className="text-sm text-gray-500">Current status of all vehicles in the fleet</p>
						</div>
					</div>

					{vehicles.length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{["available", "in use", "service", "decommissioned", "booked"].map((status) => {
								const count = vehicles.filter((v) => v.availability === status).length;
								const percentage = vehicles.length > 0 ? ((count / vehicles.length) * 100).toFixed(1) : "0";

								const statusColors = {
									available: "text-green-600 bg-green-100",
									"in use": "text-blue-600 bg-blue-100",
									service: "text-yellow-600 bg-yellow-100",
									decommissioned: "text-red-600 bg-red-100",
									booked: "text-purple-600 bg-purple-100",
								};

								return (
									<div key={status} className="text-center p-4 rounded-lg border border-gray-200">
										<div
											className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status as keyof typeof statusColors]}`}
										>
											{status.charAt(0).toUpperCase() + status.slice(1)}
										</div>
										<div className="mt-2 text-2xl font-bold text-gray-900">{count}</div>
										<div className="text-sm text-gray-500">{percentage}% of fleet</div>
									</div>
								);
							})}
						</div>
					) : (
						<div className="text-center py-8">
							<TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles</h3>
							<p className="mt-1 text-sm text-gray-500">Add vehicles to see status overview</p>
						</div>
					)}
				</div>
			</div>
		</DashboardLayout>
	);
}
