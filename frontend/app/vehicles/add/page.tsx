"use client";

import DashboardLayout from "@/components/DashboardLayout";
import VehicleForm from "@/components/VehicleForm";

export default function AddVehiclePage() {
	return (
		<DashboardLayout title="Add New Vehicle" subtitle="Add a new vehicle to your fleet">
			<div className="space-y-6">
				{/* Vehicle Form */}
				<VehicleForm />
			</div>
		</DashboardLayout>
	);
}
