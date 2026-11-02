"use client";

import Link from "next/link";
import ResourceDetail, { DetailCard, DetailField } from "@/components/ResourceDetail";
import { formatCurrency, formatDateTime } from "@/components/relationSearch";
import { insuranceApi } from "@/services/api";
import { Insurance } from "@/types";

export default function InsuranceDetailsPage() {
	return (
		<ResourceDetail<Insurance>
			title="Insurance Details"
			subtitle="View insurance policy information"
			basePath="/insurances"
			singularName="insurance"
			pluralName="Insurances"
			fetchItem={insuranceApi.getById}
			deleteItem={insuranceApi.delete}
		>
			{(insurance) => (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<DetailCard title="Policy">
						<DetailField label="Insurer">{insurance.insurer}</DetailField>
						<DetailField label="Policy Number">{insurance.policy_number}</DetailField>
						<DetailField label="Type">{insurance.insurrance_type}</DetailField>
						<DetailField label="Price">{formatCurrency(insurance.price)}</DetailField>
						<DetailField label="Valid From">{formatDateTime(insurance.date_from)}</DetailField>
						<DetailField label="Valid To">{formatDateTime(insurance.date_to)}</DetailField>
						<DetailField label="Description">{insurance.description}</DetailField>
					</DetailCard>
					<DetailCard title="Related Records">
						<DetailField label="Vehicle">
							{insurance.vehicle && (
								<Link href={`/vehicles/${insurance.vehicle.id}`} className="text-primary-600 hover:underline">
									{insurance.vehicle.brand} {insurance.vehicle.model} ({insurance.vehicle.registration_number})
								</Link>
							)}
						</DetailField>
						<DetailField label="Document">
							{insurance.document && (
								<Link href={`/documents/${insurance.document.id}`} className="text-primary-600 hover:underline">
									{insurance.document.title}
								</Link>
							)}
						</DetailField>
						<DetailField label="Company">{insurance.company?.name}</DetailField>
					</DetailCard>
				</div>
			)}
		</ResourceDetail>
	);
}
