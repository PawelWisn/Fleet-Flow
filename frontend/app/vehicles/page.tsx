"use client";

import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { vehiclesApi } from "@/services/api";
import { Vehicle } from "@/types";
import toast from "react-hot-toast";

const availabilityColors = {
	available: "bg-green-100 text-green-800",
	"in use": "bg-blue-100 text-blue-800",
	service: "bg-yellow-100 text-yellow-800",
	decommissioned: "bg-red-100 text-red-800",
	booked: "bg-purple-100 text-purple-800",
};

export default function VehiclesPage() {
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");

	// Fetch vehicles from API
	useEffect(() => {
		const fetchVehicles = async () => {
			try {
				setLoading(true);
				setError(null);
				const response = await vehiclesApi.getAll();
				setVehicles(response.items || []); // Handle paginated response
			} catch (err) {
				console.error("Error fetching vehicles:", err);
				setError("Failed to load vehicles. Please try again.");
				toast.error("Failed to load vehicles");
			} finally {
				setLoading(false);
			}
		};

		fetchVehicles();
	}, []);

	const filteredVehicles = vehicles.filter((vehicle) => {
		const matchesSearch =
			vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
			vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
			vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesStatus = filterStatus === "all" || vehicle.availability === filterStatus;

		return matchesSearch && matchesStatus;
	});

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Page header */}
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">Vehicles</h1>
						<p className="mt-2 text-sm text-gray-700">Manage your fleet vehicles and their status.</p>
					</div>
					<button className="btn-primary flex items-center">
						<PlusIcon className="h-5 w-5 mr-2" />
						Add Vehicle
					</button>
				</div>

				{/* Error state */}
				{error && (
					<div className="card bg-red-50 border-red-200">
						<div className="flex items-center">
							<div className="text-red-400 mr-3">
								<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div>
								<h3 className="text-sm font-medium text-red-800">Error loading vehicles</h3>
								<p className="text-sm text-red-700 mt-1">{error}</p>
							</div>
							<button onClick={() => window.location.reload()} className="ml-auto btn-secondary text-sm">
								Retry
							</button>
						</div>
					</div>
				)}

				{/* Loading state */}
				{loading && (
					<div className="flex justify-center py-12">
						<LoadingSpinner />
					</div>
				)}

				{/* Filters and search - only show when not loading */}
				{!loading && (
					<div className="card">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div>
								<label htmlFor="search" className="block text-sm font-medium text-gray-700">
									Search vehicles
								</label>
								<div className="mt-1 relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="text"
										id="search"
										className="input-field pl-10"
										placeholder="Search by registration, brand, or model"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
									/>
								</div>
							</div>

							<div>
								<label htmlFor="status" className="block text-sm font-medium text-gray-700">
									Filter by status
								</label>
								<select
									id="status"
									className="input-field mt-1"
									value={filterStatus}
									onChange={(e) => setFilterStatus(e.target.value)}
								>
									<option value="all">All statuses</option>
									<option value="available">Available</option>
									<option value="in use">In Use</option>
									<option value="service">Service</option>
									<option value="booked">Booked</option>
									<option value="decommissioned">Decommissioned</option>
								</select>
							</div>
						</div>
					</div>
				)}

				{/* Vehicles grid - only show when not loading */}
				{!loading && (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{filteredVehicles.map((vehicle) => (
							<div key={vehicle.id} className="card hover:shadow-md transition-shadow">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-lg font-medium text-gray-900">
										{vehicle.brand} {vehicle.model}
									</h3>
									<span
										className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
											availabilityColors[vehicle.availability as keyof typeof availabilityColors]
										}`}
									>
										{vehicle.availability}
									</span>
								</div>

								<div className="space-y-2 text-sm text-gray-600">
									<div className="flex justify-between">
										<span>Registration:</span>
										<span className="font-medium">{vehicle.registration_number}</span>
									</div>
									<div className="flex justify-between">
										<span>Year:</span>
										<span>{vehicle.production_year}</span>
									</div>
									<div className="flex justify-between">
										<span>Mileage:</span>
										<span>{vehicle.kilometrage.toLocaleString()} km</span>
									</div>
									<div className="flex justify-between">
										<span>Transmission:</span>
										<span className="capitalize">{vehicle.gearbox_type}</span>
									</div>
									<div className="flex justify-between">
										<span>Company:</span>
										<span>{vehicle.company?.name || "N/A"}</span>
									</div>
								</div>

								<div className="mt-4 flex space-x-2">
									<button className="btn-primary flex-1 text-sm">View Details</button>
									<button className="btn-secondary flex-1 text-sm">Edit</button>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Empty state - only show when not loading and no vehicles */}
				{!loading && filteredVehicles.length === 0 && !error && (
					<div className="text-center py-12">
						<div className="text-gray-500">
							<p className="text-lg font-medium">
								{vehicles.length === 0 ? "No vehicles in your fleet" : "No vehicles found"}
							</p>
							<p className="mt-1">
								{vehicles.length === 0
									? "Get started by adding your first vehicle."
									: "Try adjusting your search or filter criteria."}
							</p>
							{vehicles.length === 0 && (
								<button className="btn-primary mt-4">
									<PlusIcon className="h-5 w-5 mr-2" />
									Add Your First Vehicle
								</button>
							)}
						</div>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}
