"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Vehicle } from "@/types";
import { vehiclesApi } from "@/services/api";
import toast from "react-hot-toast";
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function VehicleDetailsPage() {
	const [vehicle, setVehicle] = useState<Vehicle | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const params = useParams();
	const vehicleId = parseInt(params.id as string);

	useEffect(() => {
		const fetchVehicle = async () => {
			try {
				setLoading(true);
				setError(null);
				const vehicleData = await vehiclesApi.getById(vehicleId);
				setVehicle(vehicleData);
			} catch (err: any) {
				console.error("Error fetching vehicle:", err);
				if (err.response?.status === 404) {
					setError("Vehicle not found");
				} else if (err.response?.status === 403) {
					setError("You don't have permission to view this vehicle");
				} else {
					setError("Failed to load vehicle data");
				}
				toast.error("Failed to load vehicle");
			} finally {
				setLoading(false);
			}
		};

		if (vehicleId) {
			fetchVehicle();
		} else {
			setError("Invalid vehicle ID");
			setLoading(false);
		}
	}, [vehicleId]);

	const handleDelete = async () => {
		if (!vehicle) return;

		const confirmed = window.confirm(
			`Are you sure you want to delete this vehicle (${vehicle.registration_number})? This action cannot be undone.`,
		);

		if (!confirmed) return;

		try {
			setDeleting(true);
			await vehiclesApi.delete(vehicle.id);
			toast.success("Vehicle deleted successfully");
			router.push("/vehicles");
		} catch (error: any) {
			console.error("Error deleting vehicle:", error);
			if (error.response?.status === 403) {
				toast.error("You don't have permission to delete this vehicle");
			} else {
				toast.error("Failed to delete vehicle");
			}
		} finally {
			setDeleting(false);
		}
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

	if (error || !vehicle) {
		return (
			<DashboardLayout>
				<div className="space-y-6">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">Vehicle Details</h1>
						<p className="mt-2 text-sm text-gray-700">View detailed vehicle information.</p>
					</div>

					<div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
								<h3 className="text-sm font-medium text-red-800">Error</h3>
								<p className="text-sm text-red-700 mt-1">{error}</p>
							</div>
							<button onClick={() => router.push("/vehicles")} className="ml-auto btn-secondary text-sm">
								Back to Vehicles
							</button>
						</div>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	const availabilityColors = {
		available: "bg-green-100 text-green-800",
		"in use": "bg-blue-100 text-blue-800",
		service: "bg-yellow-100 text-yellow-800",
		decommissioned: "bg-red-100 text-red-800",
		booked: "bg-purple-100 text-purple-800",
	};

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Page header */}
				<div className="flex justify-between items-start">
					<div>
						<h1 className="text-2xl font-semibold text-gray-900">
							{vehicle.brand} {vehicle.model}
						</h1>
						<p className="mt-2 text-sm text-gray-700">Registration: {vehicle.registration_number}</p>
					</div>
					<div className="flex space-x-3">
						<button
							onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)}
							className="btn-secondary flex items-center"
						>
							<PencilIcon className="h-4 w-4 mr-2" />
							Edit
						</button>
						<button
							onClick={handleDelete}
							disabled={deleting}
							className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
						>
							<TrashIcon className="h-4 w-4 mr-2" />
							{deleting ? "Deleting..." : "Delete"}
						</button>
					</div>
				</div>

				{/* Vehicle Status */}
				<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
					<div className="flex items-center justify-between mb-4">
						<h3 className="text-lg font-medium text-gray-900">Status</h3>
						<span
							className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
								availabilityColors[vehicle.availability as keyof typeof availabilityColors]
							}`}
						>
							{vehicle.availability}
						</span>
					</div>
				</div>

				{/* Vehicle Information */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Basic Information */}
					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
						<div className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Registration Number:</span>
								<span className="font-medium">{vehicle.registration_number}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Brand:</span>
								<span className="font-medium">{vehicle.brand}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Model:</span>
								<span className="font-medium">{vehicle.model}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Production Year:</span>
								<span className="font-medium">{vehicle.production_year}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">VIN:</span>
								<span className="font-medium font-mono text-xs">{vehicle.vin}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Registration ID:</span>
								<span className="font-medium">{vehicle.id_number}</span>
							</div>
						</div>
					</div>

					{/* Technical Specifications */}
					<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Technical Specifications</h3>
						<div className="space-y-3 text-sm">
							<div className="flex justify-between">
								<span className="text-gray-600">Weight:</span>
								<span className="font-medium">{vehicle.weight} kg</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Kilometrage:</span>
								<span className="font-medium">{vehicle.kilometrage.toLocaleString()} km</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Gearbox Type:</span>
								<span className="font-medium capitalize">{vehicle.gearbox_type}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Tire Type:</span>
								<span className="font-medium capitalize">{vehicle.tire_type}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-600">Company:</span>
								<span className="font-medium">{vehicle.company?.name || "N/A"}</span>
							</div>
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex justify-start space-x-4">
					<button onClick={() => router.push("/vehicles")} className="btn-secondary">
						Back to Vehicles
					</button>
				</div>
			</div>
		</DashboardLayout>
	);
}
