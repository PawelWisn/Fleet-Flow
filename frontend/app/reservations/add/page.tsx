"use client";

import DashboardLayout from "@/components/DashboardLayout";
import ReservationForm from "@/components/ReservationForm";

export default function AddReservationPage() {
	return (
		<DashboardLayout>
			<div className="space-y-6">
				<ReservationForm />
			</div>
		</DashboardLayout>
	);
}
