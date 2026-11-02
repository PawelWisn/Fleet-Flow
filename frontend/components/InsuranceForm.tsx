"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { BuildingOfficeIcon, DocumentTextIcon, TruckIcon } from "@heroicons/react/24/outline";
import { insuranceApi, vehiclesApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { Company, CreateInsuranceForm, Document, Insurance, InsurranceType, Vehicle } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import SearchableDropdown from "@/components/SearchableDropdown";
import { searchCompanies, searchDocuments, searchVehicles, toDateTimeInput, vehicleLabel } from "@/components/relationSearch";

interface InsuranceFormProps {
	insurance?: Insurance;
	isEdit?: boolean;
	defaultVehicleId?: number;
}

interface InsuranceFormState {
	insurer: string;
	policy_number: string;
	date_from: string;
	date_to: string;
	description: string;
	price: string;
	insurrance_type: InsurranceType;
	vehicle_id: string;
	document_id: string;
	company_id: string;
}

export const insuranceTypes: { value: InsurranceType; label: string }[] = [
	{ value: "OC", label: "OC (third-party liability)" },
	{ value: "AC", label: "AC (comprehensive)" },
	{ value: "OC/AC", label: "OC/AC (both)" },
];

export default function InsuranceForm({ insurance, isEdit = false, defaultVehicleId }: InsuranceFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<keyof InsuranceFormState, string>>>({});
	const [formData, setFormData] = useState<InsuranceFormState>({
		insurer: insurance?.insurer || "",
		policy_number: insurance?.policy_number || "",
		date_from: toDateTimeInput(insurance?.date_from),
		date_to: toDateTimeInput(insurance?.date_to),
		description: insurance?.description || "",
		price: insurance?.price?.toString() ?? "",
		insurrance_type: insurance?.insurrance_type || "OC",
		vehicle_id: (insurance?.vehicle_id ?? defaultVehicleId)?.toString() || "",
		document_id: insurance?.document_id?.toString() || "",
		company_id: insurance?.company_id?.toString() || "",
	});
	const [labels, setLabels] = useState({
		vehicle: insurance?.vehicle ? vehicleLabel(insurance.vehicle) : "",
		document: insurance?.document?.title || "",
		company: insurance?.company?.name || "",
	});

	const handleChange = (field: keyof InsuranceFormState, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
	};

	// Picking a vehicle pre-fills the company with the vehicle's own company
	const handleVehicleChange = async (value: string, label: string) => {
		handleChange("vehicle_id", value);
		setLabels((prev) => ({ ...prev, vehicle: label }));
		try {
			const vehicle: Vehicle = await vehiclesApi.getById(parseInt(value));
			if (vehicle.company_id) {
				handleChange("company_id", vehicle.company_id.toString());
				setLabels((prev) => ({ ...prev, company: vehicle.company?.name || `Company #${vehicle.company_id}` }));
			}
		} catch (error) {
			console.error("Error loading vehicle company:", error);
		}
	};

	const validate = (): boolean => {
		const newErrors: Partial<Record<keyof InsuranceFormState, string>> = {};
		if (!formData.insurer.trim()) newErrors.insurer = "Insurer is required";
		if (!formData.policy_number.trim()) newErrors.policy_number = "Policy number is required";
		if (!formData.date_from) newErrors.date_from = "Start date is required";
		if (!formData.date_to) newErrors.date_to = "End date is required";
		if (formData.date_from && formData.date_to && formData.date_to <= formData.date_from) newErrors.date_to = "End date must be after the start date";
		if (!formData.description.trim()) newErrors.description = "Description is required";
		if (formData.price === "" || isNaN(Number(formData.price)) || Number(formData.price) < 0) newErrors.price = "Price must be a positive number";
		if (!formData.vehicle_id) newErrors.vehicle_id = "Vehicle is required";
		if (!formData.document_id) newErrors.document_id = "Document is required";
		if (!formData.company_id) newErrors.company_id = "Company is required";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const payload: CreateInsuranceForm = {
			insurer: formData.insurer.trim(),
			policy_number: formData.policy_number.trim(),
			date_from: formData.date_from,
			date_to: formData.date_to,
			description: formData.description.trim(),
			price: Number(formData.price),
			insurrance_type: formData.insurrance_type,
			vehicle_id: parseInt(formData.vehicle_id),
			document_id: parseInt(formData.document_id),
			company_id: parseInt(formData.company_id),
		};

		setLoading(true);
		try {
			if (isEdit && insurance) {
				await insuranceApi.update(insurance.id, payload);
				toast.success("Insurance updated successfully");
			} else {
				await insuranceApi.create(payload);
				toast.success("Insurance created successfully");
			}
			router.push("/insurances");
		} catch (error: any) {
			console.error("Error saving insurance:", error);
			toast.error(getErrorMessage(error, isEdit ? "Failed to update insurance" : "Failed to create insurance"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="card">
					<div className="mb-6">
						<h2 className="text-xl font-semibold text-gray-900">{isEdit ? "Edit Insurance" : "Add New Insurance"}</h2>
						<p className="text-sm text-gray-600">Track the insurance policies covering your vehicles.</p>
					</div>

					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Policy Details</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="label-required">Insurer</label>
								<input
									type="text"
									maxLength={128}
									value={formData.insurer}
									onChange={(e) => handleChange("insurer", e.target.value)}
									className={`input ${errors.insurer ? "border-red-500" : ""}`}
									placeholder="Insurance company"
								/>
								{errors.insurer && <p className="error">{errors.insurer}</p>}
							</div>
							<div>
								<label className="label-required">Policy Number</label>
								<input
									type="text"
									maxLength={64}
									value={formData.policy_number}
									onChange={(e) => handleChange("policy_number", e.target.value)}
									className={`input ${errors.policy_number ? "border-red-500" : ""}`}
									placeholder="POL-0000"
								/>
								{errors.policy_number && <p className="error">{errors.policy_number}</p>}
							</div>
							<div>
								<label className="label-required">Type</label>
								<select
									value={formData.insurrance_type}
									onChange={(e) => handleChange("insurrance_type", e.target.value)}
									className="input"
								>
									{insuranceTypes.map((type) => (
										<option key={type.value} value={type.value}>
											{type.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="label-required">Price ($)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={formData.price}
									onChange={(e) => handleChange("price", e.target.value)}
									className={`input ${errors.price ? "border-red-500" : ""}`}
									placeholder="0.00"
								/>
								{errors.price && <p className="error">{errors.price}</p>}
							</div>
							<div>
								<label className="label-required">Valid From</label>
								<input
									type="datetime-local"
									value={formData.date_from}
									onChange={(e) => handleChange("date_from", e.target.value)}
									className={`input ${errors.date_from ? "border-red-500" : ""}`}
								/>
								{errors.date_from && <p className="error">{errors.date_from}</p>}
							</div>
							<div>
								<label className="label-required">Valid To</label>
								<input
									type="datetime-local"
									value={formData.date_to}
									onChange={(e) => handleChange("date_to", e.target.value)}
									className={`input ${errors.date_to ? "border-red-500" : ""}`}
								/>
								{errors.date_to && <p className="error">{errors.date_to}</p>}
							</div>
							<div className="md:col-span-2">
								<label className="label-required">Description</label>
								<textarea
									rows={3}
									maxLength={1024}
									value={formData.description}
									onChange={(e) => handleChange("description", e.target.value)}
									className={`input ${errors.description ? "border-red-500" : ""}`}
									placeholder="Coverage details"
								/>
								{errors.description && <p className="error">{errors.description}</p>}
							</div>
						</div>
					</div>

					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Related Records</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<SearchableDropdown<Vehicle>
									value={formData.vehicle_id}
									valueLabel={labels.vehicle}
									onChange={handleVehicleChange}
									onSearch={searchVehicles}
									renderOption={(vehicle) => ({ value: vehicle.id.toString(), label: vehicleLabel(vehicle) })}
									placeholder="Select a vehicle"
									label="Vehicle"
									icon={<TruckIcon className="h-5 w-5" />}
									required
								/>
								{errors.vehicle_id && <p className="error">{errors.vehicle_id}</p>}
							</div>
							<div>
								<SearchableDropdown<Company>
									value={formData.company_id}
									valueLabel={labels.company}
									onChange={(value, label) => {
										handleChange("company_id", value);
										setLabels((prev) => ({ ...prev, company: label }));
									}}
									onSearch={searchCompanies}
									renderOption={(company) => ({ value: company.id.toString(), label: company.name })}
									placeholder="Select a company"
									label="Company"
									icon={<BuildingOfficeIcon className="h-5 w-5" />}
									required
								/>
								{errors.company_id && <p className="error">{errors.company_id}</p>}
							</div>
							<div className="md:col-span-2">
								<SearchableDropdown<Document>
									value={formData.document_id}
									valueLabel={labels.document}
									onChange={(value, label) => {
										handleChange("document_id", value);
										setLabels((prev) => ({ ...prev, document: label }));
									}}
									onSearch={searchDocuments}
									renderOption={(document) => ({ value: document.id.toString(), label: document.title })}
									placeholder="Select the policy document"
									label="Document"
									icon={<DocumentTextIcon className="h-5 w-5" />}
									required
								/>
								{errors.document_id && <p className="error">{errors.document_id}</p>}
							</div>
						</div>
					</div>

					<div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
						<button type="button" onClick={() => router.push("/insurances")} disabled={loading} className="btn-secondary">
							Cancel
						</button>
						<button type="submit" disabled={loading} className="btn-primary">
							{loading ? (
								<>
									<LoadingSpinner />
									{isEdit ? "Updating..." : "Creating..."}
								</>
							) : isEdit ? (
								"Update Insurance"
							) : (
								"Add Insurance"
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
