"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";

/** Shell for "add" pages; passes the optional `?vehicle_id=` query param to the form as a default. */
function AddPageContent({ render }: { render: (defaultVehicleId?: number) => React.ReactNode }) {
	const vehicleId = useSearchParams().get("vehicle_id");
	return <div className="space-y-6">{render(vehicleId ? parseInt(vehicleId) : undefined)}</div>;
}

export default function AddPage({ title, subtitle, render }: { title: string; subtitle: string; render: (defaultVehicleId?: number) => React.ReactNode }) {
	return (
		<DashboardLayout title={title} subtitle={subtitle}>
			<Suspense
				fallback={
					<div className="flex items-center justify-center h-64">
						<LoadingSpinner />
					</div>
				}
			>
				<AddPageContent render={render} />
			</Suspense>
		</DashboardLayout>
	);
}
