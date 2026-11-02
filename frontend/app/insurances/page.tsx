"use client";

import Link from "next/link";
import ResourceList from "@/components/ResourceList";
import { formatCurrency, formatDate } from "@/components/relationSearch";
import { insuranceApi } from "@/services/api";
import { Insurance } from "@/types";

export default function InsurancesPage() {
	return (
		<ResourceList<Insurance>
			title="Insurances"
			subtitle="Insurance policies covering your vehicles"
			basePath="/insurances"
			singularName="insurance"
			pluralName="insurances"
			modes={[
				{ value: "all", label: "All" },
				{ value: "finishing", label: "Ending soon" },
			]}
			fetchPage={({ page, size, vehicleId, mode }) =>
				mode === "finishing" ? insuranceApi.getFinishing({ page, size }) : insuranceApi.getAll({ page, size, vehicle_id: vehicleId })
			}
			deleteItem={insuranceApi.delete}
			renderCard={(insurance) => (
				<>
					<div className="mb-4">
						<div className="flex items-center justify-between">
							<h3 className="text-lg font-semibold text-gray-900">{insurance.insurer}</h3>
							<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">{insurance.insurrance_type}</span>
						</div>
						<p className="text-sm text-gray-500">
							{insurance.vehicle?.brand} {insurance.vehicle?.model} · {insurance.vehicle?.registration_number}
						</p>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Policy:</span>
							<span className="text-sm font-medium">{insurance.policy_number}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Valid:</span>
							<span className="text-sm font-medium">
								{formatDate(insurance.date_from)} – {formatDate(insurance.date_to)}
							</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Price:</span>
							<span className="text-sm font-medium">{formatCurrency(insurance.price)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Document:</span>
							{insurance.document ? (
								<Link href={`/documents/${insurance.document.id}`} className="text-sm font-medium text-primary-600 hover:underline truncate ml-2">
									{insurance.document.title}
								</Link>
							) : (
								<span className="text-sm font-medium">-</span>
							)}
						</div>
					</div>
				</>
			)}
		/>
	);
}
