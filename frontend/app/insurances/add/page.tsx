"use client";

import AddPage from "@/components/AddPage";
import InsuranceForm from "@/components/InsuranceForm";

export default function AddInsurancePage() {
	return (
		<AddPage title="Add New Insurance" subtitle="Add an insurance policy" render={(defaultVehicleId) => <InsuranceForm defaultVehicleId={defaultVehicleId} />} />
	);
}
