"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
	TruckIcon,
	UserGroupIcon,
	WrenchScrewdriverIcon,
	ChartBarIcon,
	CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { vehiclesApi } from "@/services/api";
import { Vehicle } from "@/types";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface DashboardStats {
	totalVehicles: number;
	availableVehicles: number;
	vehiclesInService: number;
	vehiclesInUse: number;
	upcomingMaintenances: number;
	activeReservations: number;
}

export default function DashboardPage() {
	const [stats, setStats] = useState<DashboardStats>({
		totalVehicles: 0,
		availableVehicles: 0,
		vehiclesInService: 0,
		vehiclesInUse: 0,
		upcomingMaintenances: 0,
		activeReservations: 0,
	});
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [loading, setLoading] = useState(true);
	const [userData, setUserData] = useState<any>(null);
	const router = useRouter();

	// Check authentication on component mount
	useEffect(() => {
		const userDataString = localStorage.getItem("userData");

		if (userDataString) {
			setUserData(JSON.parse(userDataString));
		}

		// Authentication is handled by HTTP-only cookies
		// If the user is not authenticated, API calls will fail with 401
	}, [router]);

	// Fetch dashboard data
	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true);

				// Fetch vehicles data
				const vehiclesResponse = await vehiclesApi.getAll();
				const vehiclesData = vehiclesResponse.items || [];
				setVehicles(vehiclesData);

				// Calculate stats from vehicles data
				const totalVehicles = vehiclesData.length;
				const availableVehicles = vehiclesData.filter((v) => v.availability === "available").length;
				const vehiclesInService = vehiclesData.filter((v) => v.availability === "service").length;
				const vehiclesInUse = vehiclesData.filter((v) => v.availability === "in use").length;

				setStats({
					totalVehicles,
					availableVehicles,
					vehiclesInService,
					vehiclesInUse,
					upcomingMaintenances: Math.floor(totalVehicles * 0.15), // Mock data
					activeReservations: Math.floor(totalVehicles * 0.3), // Mock data
				});
			} catch (error: any) {
				console.error("Error fetching dashboard data:", error);
				if (error.response?.status === 401) {
					// User is not authenticated, redirect to login
					localStorage.removeItem("userData");
					router.push("/");
				} else {
					toast.error("Failed to load dashboard data");
				}
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [router]);

	const handleLogout = async () => {
		try {
			// Send logout request to backend (clears HTTP-only cookie)
			await api.post("/users/logout/");

			// Clear user data from local storage
			localStorage.removeItem("userData");

			toast.success("Logged out successfully");
			router.push("/");
		} catch (error) {
			console.error("Logout error:", error);
			// Even if logout request fails, clear local storage and redirect
			localStorage.removeItem("userData");
			toast.success("Logged out successfully");
			router.push("/");
		}
	};

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
						<p className="text-gray-600">Welcome back, {userData?.name || "User"}! Here's your fleet overview.</p>
					</div>
					<button
						onClick={handleLogout}
						className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
					>
						Logout
					</button>
				</div>

				{/* Stats Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<TruckIcon className="h-8 w-8 text-blue-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Total Vehicles</p>
								<p className="text-2xl font-bold text-gray-900">{stats.totalVehicles}</p>
							</div>
						</div>
					</div>

					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
									<div className="h-4 w-4 bg-green-600 rounded-full"></div>
								</div>
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Available</p>
								<p className="text-2xl font-bold text-green-600">{stats.availableVehicles}</p>
							</div>
						</div>
					</div>

					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
									<div className="h-4 w-4 bg-blue-600 rounded-full"></div>
								</div>
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">In Use</p>
								<p className="text-2xl font-bold text-blue-600">{stats.vehiclesInUse}</p>
							</div>
						</div>
					</div>

					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<WrenchScrewdriverIcon className="h-8 w-8 text-yellow-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">In Service</p>
								<p className="text-2xl font-bold text-yellow-600">{stats.vehiclesInService}</p>
							</div>
						</div>
					</div>

					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<CalendarDaysIcon className="h-8 w-8 text-purple-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Active Reservations</p>
								<p className="text-2xl font-bold text-purple-600">{stats.activeReservations}</p>
							</div>
						</div>
					</div>

					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<div className="flex items-center">
							<div className="flex-shrink-0">
								<ChartBarIcon className="h-8 w-8 text-orange-600" />
							</div>
							<div className="ml-4">
								<p className="text-sm font-medium text-gray-600">Upcoming Maintenances</p>
								<p className="text-2xl font-bold text-orange-600">{stats.upcomingMaintenances}</p>
							</div>
						</div>
					</div>
				</div>

				{/* Quick Actions */}
				<div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
						<button
							onClick={() => router.push("/vehicles")}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<TruckIcon className="h-6 w-6 text-blue-600 mb-2" />
							<p className="font-medium text-gray-900">Manage Vehicles</p>
							<p className="text-sm text-gray-600">View and edit vehicle details</p>
						</button>

						<button
							onClick={() => router.push("/reservations")}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<CalendarDaysIcon className="h-6 w-6 text-purple-600 mb-2" />
							<p className="font-medium text-gray-900">Reservations</p>
							<p className="text-sm text-gray-600">Schedule vehicle bookings</p>
						</button>

						<button
							onClick={() => router.push("/users")}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<UserGroupIcon className="h-6 w-6 text-green-600 mb-2" />
							<p className="font-medium text-gray-900">Users</p>
							<p className="text-sm text-gray-600">Manage team members</p>
						</button>

						<button
							onClick={() => router.push("/reports")}
							className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
						>
							<ChartBarIcon className="h-6 w-6 text-orange-600 mb-2" />
							<p className="font-medium text-gray-900">Reports</p>
							<p className="text-sm text-gray-600">View analytics and insights</p>
						</button>
					</div>
				</div>

				{/* Recent Activity or Vehicle Status Summary */}
				<div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
					<h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Status Overview</h3>
					{vehicles.length > 0 ? (
						<div className="overflow-x-auto">
							<table className="min-w-full divide-y divide-gray-200">
								<thead>
									<tr>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Vehicle
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>{" "}
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Company
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Kilometrage
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{vehicles.slice(0, 5).map((vehicle) => (
										<tr key={vehicle.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap">
												<div>
													<div className="text-sm font-medium text-gray-900">{vehicle.registration_number}</div>
													<div className="text-sm text-gray-500">
														{vehicle.brand} {vehicle.model}
													</div>
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												{" "}
												<span
													className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
														vehicle.availability === "available"
															? "bg-green-100 text-green-800"
															: vehicle.availability === "in use"
																? "bg-blue-100 text-blue-800"
																: vehicle.availability === "service"
																	? "bg-yellow-100 text-yellow-800"
																	: "bg-red-100 text-red-800"
													}`}
												>
													{vehicle.availability}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{vehicle.company?.address1 || "N/A"}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{vehicle.kilometrage?.toLocaleString() || "N/A"} km
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="text-gray-500 text-center py-8">No vehicles found.</p>
					)}
				</div>
			</div>
		</DashboardLayout>
	);
}
