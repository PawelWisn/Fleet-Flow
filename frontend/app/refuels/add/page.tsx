"use client";

import DashboardLayout from "@/components/DashboardLayout";
import RefuelForm from "@/components/RefuelForm";

export default function AddRefuelPage() {
	return (
		<DashboardLayout title="Add New Refuel" subtitle="Add a new fuel record">
			<div className="space-y-6">
				<RefuelForm />
			</div>
		</DashboardLayout>
	);
}
