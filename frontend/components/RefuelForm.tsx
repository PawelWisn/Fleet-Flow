"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { refuelsApi, vehiclesApi, usersApi, documentsApi } from "@/services/api";
import { Refuel, Vehicle, User, Document, CreateRefuelForm } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";

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
	company_id?: string;
}

export default function RefuelForm({ refuel, isEdit = false }: RefuelFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loadingData, setLoadingData] = useState(true);

	const [formData, setFormData] = useState<CreateRefuelForm>({
		date: refuel?.date?.split("T")[0] || new Date().toISOString().split("T")[0],
		fuel_amount: refuel?.fuel_amount || 0,
		price: refuel?.price || 0,
		kilometrage_during_refuel: refuel?.kilometrage_during_refuel || 0,
		gas_station: refuel?.gas_station || "",
		vehicle_id: refuel?.vehicle_id || 0,
		document_id: refuel?.document_id || 0,
		user_id: refuel?.user_id || 0,
		company_id: refuel?.company_id || 0,
	});

	const [errors, setErrors] = useState<RefuelFormErrors>({});

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoadingData(true);
				const [vehiclesResponse, usersResponse, documentsResponse] = await Promise.all([
					vehiclesApi.getAll(),
					usersApi.getAll(),
					documentsApi.getAll({ page: 1, size: 100 }), // Fetch up to 100 documents
				]);

				setVehicles(vehiclesResponse.items);
				setUsers(usersResponse.items);
				setDocuments(documentsResponse.items);
			} catch (error) {
				console.error("Error loading data:", error);
				toast.error("Failed to load form data");
			} finally {
				setLoadingData(false);
			}
		};

		fetchData();
	}, []);

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
			if (error.response?.data?.detail) {
				toast.error(error.response.data.detail);
			} else {
				toast.error(isEdit ? "Failed to update refuel record" : "Failed to create refuel record");
			}
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

	if (loadingData) {
		return (
			<div className="flex items-center justify-center h-64">
				<LoadingSpinner />
			</div>
		);
	}

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
								<label className="label-required">Vehicle</label>
								<select
									value={formData.vehicle_id}
									onChange={(e) => handleChange("vehicle_id", parseInt(e.target.value))}
									className={`input ${errors.vehicle_id ? "border-red-500" : ""}`}
								>
									<option value="">Select a vehicle</option>
									{vehicles.map((vehicle) => (
										<option key={vehicle.id} value={vehicle.id}>
											{vehicle.brand} {vehicle.model} - {vehicle.registration_number}
										</option>
									))}
								</select>
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
								<label className="label-required">Driver</label>
								<select
									value={formData.user_id}
									onChange={(e) => handleChange("user_id", parseInt(e.target.value))}
									className={`input ${errors.user_id ? "border-red-500" : ""}`}
								>
									<option value="">Select a driver</option>
									{users.map((user) => (
										<option key={user.id} value={user.id}>
											{user.name} ({user.email})
										</option>
									))}
								</select>
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

					{/* Optional Information */}
					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Optional Information</h3>
						<div className="grid grid-cols-1 gap-6">
							{/* Document */}
							<div>
								<label className="label-optional">Related Document</label>
								<select
									value={formData.document_id || ""}
									onChange={(e) => handleChange("document_id", parseInt(e.target.value) || 0)}
									className="input"
								>
									<option value="">No document selected</option>
									{documents.map((document) => (
										<option key={document.id} value={document.id}>
											{document.title}
										</option>
									))}
								</select>
								<p className="text-sm text-gray-500 mt-1">
									Optionally link this refuel record to a relevant document (receipt, invoice, etc.)
								</p>
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
