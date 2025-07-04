"use client";

import DashboardLayout from "@/components/DashboardLayout";
import VehicleForm from "@/components/VehicleForm";

export default function AddVehiclePage() {
	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Page header */}
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Add New Vehicle</h1>
					<p className="mt-2 text-sm text-gray-700">Add a new vehicle to your fleet.</p>
				</div>

				{/* Vehicle Form */}
				<VehicleForm />
			</div>
		</DashboardLayout>
	);
}
