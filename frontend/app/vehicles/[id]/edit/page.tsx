"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import VehicleForm from "@/components/VehicleForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Vehicle } from "@/types";
import { vehiclesApi } from "@/services/api";
import toast from "react-hot-toast";

export default function EditVehiclePage() {
	const [vehicle, setVehicle] = useState<Vehicle | null>(null);
	const [loading, setLoading] = useState(true);
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
					setError("You don't have permission to edit this vehicle");
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
						<h1 className="text-2xl font-semibold text-gray-900">Edit Vehicle</h1>
						<p className="mt-2 text-sm text-gray-700">Update vehicle information.</p>
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

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Page header */}
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Edit Vehicle</h1>
					<p className="mt-2 text-sm text-gray-700">
						Update information for {vehicle.brand} {vehicle.model} ({vehicle.registration_number})
					</p>
				</div>

				{/* Vehicle Form */}
				<VehicleForm vehicle={vehicle} />
			</div>
		</DashboardLayout>
	);
}
