"use client";

import EditLoader from "@/components/EditLoader";
import InsuranceForm from "@/components/InsuranceForm";
import { insuranceApi } from "@/services/api";
import { Insurance } from "@/types";

export default function EditInsurancePage() {
	return (
		<EditLoader<Insurance> title="Edit Insurance" subtitle="Update insurance information" resourceName="Insurance" fetchItem={insuranceApi.getById}>
			{(insurance) => <InsuranceForm insurance={insurance} isEdit />}
		</EditLoader>
	);
}
