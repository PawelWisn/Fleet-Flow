"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

// Mock data - replace with actual API calls
const vehicles = [
	{
		id: 1,
		registration_number: "ABC-123",
		brand: "Toyota",
		model: "Camry",
		production_year: 2022,
		kilometrage: 15000,
		availability: "available",
		gearbox_type: "automatic",
		company: { name: "Acme Corp" },
	},
	{
		id: 2,
		registration_number: "XYZ-789",
		brand: "BMW",
		model: "X5",
		production_year: 2021,
		kilometrage: 32000,
		availability: "in use",
		gearbox_type: "automatic",
		company: { name: "Tech Solutions" },
	},
	{
		id: 3,
		registration_number: "DEF-456",
		brand: "Honda",
		model: "Civic",
		production_year: 2023,
		kilometrage: 8000,
		availability: "service",
		gearbox_type: "manual",
		company: { name: "Acme Corp" },
	},
];

const availabilityColors = {
	available: "bg-green-100 text-green-800",
	"in use": "bg-blue-100 text-blue-800",
	service: "bg-yellow-100 text-yellow-800",
	decommissioned: "bg-red-100 text-red-800",
	booked: "bg-purple-100 text-purple-800",
};

export default function VehiclesPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [filterStatus, setFilterStatus] = useState("all");

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

				{/* Filters and search */}
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

				{/* Vehicles grid */}
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
									<span>{vehicle.company?.name}</span>
								</div>
							</div>

							<div className="mt-4 flex space-x-2">
								<button className="btn-primary flex-1 text-sm">View Details</button>
								<button className="btn-secondary flex-1 text-sm">Edit</button>
							</div>
						</div>
					))}
				</div>

				{filteredVehicles.length === 0 && (
					<div className="text-center py-12">
						<div className="text-gray-500">
							<p className="text-lg font-medium">No vehicles found</p>
							<p className="mt-1">Try adjusting your search or filter criteria.</p>
						</div>
					</div>
				)}
			</div>
		</DashboardLayout>
	);
}
