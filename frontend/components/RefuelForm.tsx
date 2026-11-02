"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { TruckIcon, UserIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { refuelsApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { useAuth } from "@/contexts/AuthContext";
import { Refuel, Vehicle, User, Document, CreateRefuelForm } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import SearchableDropdown from "@/components/SearchableDropdown";
import { searchDocuments, searchUsers, searchVehicles, userLabel, vehicleLabel } from "@/components/relationSearch";

interface RefuelFormProps {
	refuel?: Refuel;
	isEdit?: boolean;
}

interface RefuelFormErrors {
	date?: string;
	fuel_amount?: string;
	price?: string;
	kilometrage_during_refuel?: string;
	gas_station?: string;
	vehicle_id?: string;
	document_id?: string;
	user_id?: string;
}

export default function RefuelForm({ refuel, isEdit = false }: RefuelFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const { user: currentUser } = useAuth();
	// Workers only see and create their own refuels
	const canChooseUser = currentUser?.role !== "worker";

	const [formData, setFormData] = useState<CreateRefuelForm>({
		date: refuel?.date?.split("T")[0] || new Date().toISOString().split("T")[0],
		fuel_amount: refuel?.fuel_amount || 0,
		price: refuel?.price || 0,
		kilometrage_during_refuel: refuel?.kilometrage_during_refuel || 0,
		gas_station: refuel?.gas_station || "",
		vehicle_id: refuel?.vehicle_id || 0,
		document_id: refuel?.document_id || 0,
		user_id: refuel?.user_id || currentUser?.id || 0,
	});
	const [labels, setLabels] = useState({
		vehicle: refuel?.vehicle ? vehicleLabel(refuel.vehicle) : "",
		user: refuel?.user ? userLabel(refuel.user) : currentUser && !refuel ? userLabel(currentUser) : "",
		document: refuel?.document?.title || "",
	});

	const [errors, setErrors] = useState<RefuelFormErrors>({});

	const validateForm = (): boolean => {
		const newErrors: RefuelFormErrors = {};

		if (!formData.date) {
			newErrors.date = "Date is required";
		}

		if (!formData.fuel_amount || formData.fuel_amount <= 0) {
			newErrors.fuel_amount = "Fuel amount must be greater than 0";
		}

		if (!formData.price || formData.price <= 0) {
			newErrors.price = "Price must be greater than 0";
		}

		if (!formData.kilometrage_during_refuel || formData.kilometrage_during_refuel <= 0) {
			newErrors.kilometrage_during_refuel = "Kilometrage must be greater than 0";
		}

		if (!formData.gas_station.trim()) {
			newErrors.gas_station = "Gas station is required";
		}

		if (!formData.vehicle_id) {
			newErrors.vehicle_id = "Vehicle is required";
		}

		if (!formData.user_id) {
			newErrors.user_id = "User is required";
		}

		if (!formData.document_id) {
			newErrors.document_id = "Document is required";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setLoading(true);

		try {
			if (isEdit && refuel) {
				await refuelsApi.update(refuel.id, formData);
				toast.success("Refuel record updated successfully");
			} else {
				await refuelsApi.create(formData);
				toast.success("Refuel record created successfully");
			}

			router.push("/refuels");
		} catch (error: any) {
			console.error("Error saving refuel:", error);
			toast.error(getErrorMessage(error, isEdit ? "Failed to update refuel record" : "Failed to create refuel record"));
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (field: keyof CreateRefuelForm, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<div className="max-w-4xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="card">
					<div className="mb-6">
						<h2 className="text-xl font-semibold text-gray-900">
							{isEdit ? "Edit Refuel Record" : "Add New Refuel Record"}
						</h2>
						<p className="text-sm text-gray-600">
							{isEdit ? "Update the refuel record details." : "Fill in the details for the new refuel record."}
						</p>
					</div>

					{/* Basic Information */}
					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Date */}
							<div>
								<label className="label-required">Date</label>
								<input
									type="date"
									value={formData.date}
									onChange={(e) => handleChange("date", e.target.value)}
									className={`input ${errors.date ? "border-red-500" : ""}`}
								/>
								{errors.date && <p className="error">{errors.date}</p>}
							</div>

							{/* Vehicle */}
							<div>
								<SearchableDropdown<Vehicle>
									value={formData.vehicle_id ? String(formData.vehicle_id) : ""}
									valueLabel={labels.vehicle}
									onChange={(value, label) => {
										handleChange("vehicle_id", parseInt(value));
										setLabels((prev) => ({ ...prev, vehicle: label }));
									}}
									onSearch={searchVehicles}
									renderOption={(vehicle) => ({ value: vehicle.id.toString(), label: vehicleLabel(vehicle) })}
									placeholder="Select a vehicle"
									label="Vehicle"
									icon={<TruckIcon className="h-5 w-5" />}
									required
								/>
								{errors.vehicle_id && <p className="error">{errors.vehicle_id}</p>}
							</div>
						</div>
					</div>

					{/* Fuel Details */}
					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Fuel Details</h3>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							{/* Fuel Amount */}
							<div>
								<label className="label-required">Fuel Amount (Liters)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={formData.fuel_amount || ""}
									onChange={(e) => {
										const value = e.target.value;
										if (value === "" || value === "0") {
											handleChange("fuel_amount", 0);
										} else {
											const numValue = parseFloat(value);
											if (!isNaN(numValue)) {
												handleChange("fuel_amount", numValue);
											}
										}
									}}
									className={`input ${errors.fuel_amount ? "border-red-500" : ""}`}
									placeholder="0.00"
								/>
								{errors.fuel_amount && <p className="error">{errors.fuel_amount}</p>}
							</div>

							{/* Price */}
							<div>
								<label className="label-required">Price ($)</label>
								<input
									type="number"
									step="0.01"
									min="0"
									value={formData.price || ""}
									onChange={(e) => {
										const value = e.target.value;
										if (value === "" || value === "0") {
											handleChange("price", 0);
										} else {
											const numValue = parseFloat(value);
											if (!isNaN(numValue)) {
												handleChange("price", numValue);
											}
										}
									}}
									className={`input ${errors.price ? "border-red-500" : ""}`}
									placeholder="0.00"
								/>
								{errors.price && <p className="error">{errors.price}</p>}
							</div>

							{/* Kilometrage */}
							<div>
								<label className="label-required">Kilometrage During Refuel (km)</label>
								<input
									type="number"
									min="0"
									value={formData.kilometrage_during_refuel || ""}
									onChange={(e) => {
										const value = e.target.value;
										if (value === "" || value === "0") {
											handleChange("kilometrage_during_refuel", 0);
										} else {
											const numValue = parseInt(value);
											if (!isNaN(numValue)) {
												handleChange("kilometrage_during_refuel", numValue);
											}
										}
									}}
									className={`input ${errors.kilometrage_during_refuel ? "border-red-500" : ""}`}
									placeholder="0"
								/>
								{errors.kilometrage_during_refuel && <p className="error">{errors.kilometrage_during_refuel}</p>}
							</div>
						</div>
					</div>

					{/* Location and Personnel */}
					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Location and Personnel</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Driver */}
							<div>
								{canChooseUser ? (
									<SearchableDropdown<User>
										value={formData.user_id ? String(formData.user_id) : ""}
										valueLabel={labels.user}
										onChange={(value, label) => {
											handleChange("user_id", parseInt(value));
											setLabels((prev) => ({ ...prev, user: label }));
										}}
										onSearch={searchUsers}
										renderOption={(user) => ({ value: user.id.toString(), label: userLabel(user) })}
										placeholder="Select a driver"
										label="Driver"
										icon={<UserIcon className="h-5 w-5" />}
										required
									/>
								) : (
									<>
										<label className="block text-sm font-medium text-gray-700 mb-2">Driver</label>
										<p className="py-2 text-sm text-gray-900">{labels.user || currentUser?.name}</p>
									</>
								)}
								{errors.user_id && <p className="error">{errors.user_id}</p>}
							</div>

							{/* Gas Station */}
							<div>
								<label className="label-required">Gas Station</label>
								<input
									type="text"
									value={formData.gas_station}
									onChange={(e) => handleChange("gas_station", e.target.value)}
									className={`input ${errors.gas_station ? "border-red-500" : ""}`}
									placeholder="Enter gas station name or address"
								/>
								{errors.gas_station && <p className="error">{errors.gas_station}</p>}
							</div>
						</div>
					</div>

					{/* Related document */}
					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Related Document</h3>
						<div className="grid grid-cols-1 gap-6">
							<div>
								<SearchableDropdown<Document>
									value={formData.document_id ? String(formData.document_id) : ""}
									valueLabel={labels.document}
									onChange={(value, label) => {
										handleChange("document_id", parseInt(value));
										setLabels((prev) => ({ ...prev, document: label }));
									}}
									onSearch={searchDocuments}
									renderOption={(document) => ({ value: document.id.toString(), label: document.title })}
									placeholder="Select a document"
									label="Document"
									icon={<DocumentTextIcon className="h-5 w-5" />}
									required
								/>
								{errors.document_id && <p className="error">{errors.document_id}</p>}
								<p className="text-sm text-gray-500 mt-1">Link this refuel record to a relevant document (receipt, invoice, etc.)</p>
							</div>
						</div>
					</div>

					{/* Form actions */}
					<div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
						<button type="button" onClick={() => router.push("/refuels")} disabled={loading} className="btn-secondary">
							Cancel
						</button>
						<button type="submit" disabled={loading} className="btn-primary">
							{loading ? (
								<>
									<LoadingSpinner />
									{isEdit ? "Updating..." : "Creating..."}
								</>
							) : (
								<>{isEdit ? "Update Refuel" : "Add Refuel"}</>
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
