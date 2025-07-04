"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Vehicle, CreateVehicleForm, Company } from "@/types";
import { vehiclesApi, companiesApi } from "@/services/api";
import toast from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";

interface VehicleFormProps {
	vehicle?: Vehicle; // If provided, we're editing; if not, we're creating
	onSuccess?: () => void;
	onCancel?: () => void;
}

export default function VehicleForm({ vehicle, onSuccess, onCancel }: VehicleFormProps) {
	const [formData, setFormData] = useState<CreateVehicleForm>({
		id_number: "",
		vin: "",
		weight: 0,
		registration_number: "",
		brand: "",
		model: "",
		production_year: new Date().getFullYear(),
		kilometrage: 0,
		gearbox_type: "manual",
		availability: "available",
		tire_type: "all-season",
		company_id: undefined,
	});

	const [companies, setCompanies] = useState<Company[]>([]);
	const [loading, setLoading] = useState(false);
	const [loadingCompanies, setLoadingCompanies] = useState(true);
	const router = useRouter();

	// Load companies for the dropdown
	useEffect(() => {
		const fetchCompanies = async () => {
			try {
				setLoadingCompanies(true);
				const response = await companiesApi.getAll();
				setCompanies(response.items || []);
			} catch (error) {
				console.error("Error fetching companies:", error);
				toast.error("Failed to load companies");
			} finally {
				setLoadingCompanies(false);
			}
		};

		fetchCompanies();
	}, []);

	// If editing, populate form with vehicle data
	useEffect(() => {
		if (vehicle) {
			setFormData({
				id_number: vehicle.id_number,
				vin: vehicle.vin,
				weight: vehicle.weight,
				registration_number: vehicle.registration_number,
				brand: vehicle.brand,
				model: vehicle.model,
				production_year: vehicle.production_year,
				kilometrage: vehicle.kilometrage,
				gearbox_type: vehicle.gearbox_type,
				availability: vehicle.availability,
				tire_type: vehicle.tire_type,
				company_id: vehicle.company_id,
			});
		}
	}, [vehicle]);

	const handleInputChange = (field: keyof CreateVehicleForm, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.registration_number || !formData.brand || !formData.model || !formData.vin) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (formData.vin.length !== 17) {
			toast.error("VIN must be exactly 17 characters");
			return;
		}

		if (!formData.company_id) {
			toast.error("Please select a company");
			return;
		}

		setLoading(true);

		try {
			if (vehicle) {
				// Update existing vehicle
				await vehiclesApi.update(vehicle.id, formData);
				toast.success("Vehicle updated successfully!");
			} else {
				// Create new vehicle
				await vehiclesApi.create(formData);
				toast.success("Vehicle created successfully!");
			}

			if (onSuccess) {
				onSuccess();
			} else {
				router.push("/vehicles");
			}
		} catch (error: any) {
			console.error("Error saving vehicle:", error);

			if (error.response?.status === 422) {
				toast.error("Please check all field values");
			} else if (error.response?.status === 403) {
				toast.error("You don't have permission to perform this action");
			} else {
				toast.error(vehicle ? "Failed to update vehicle" : "Failed to create vehicle");
			}
		} finally {
			setLoading(false);
		}
	};

	if (loadingCompanies) {
		return (
			<div className="flex justify-center items-center h-64">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
				<h2 className="text-xl font-semibold text-gray-900 mb-6">{vehicle ? "Edit Vehicle" : "Add New Vehicle"}</h2>

				{/* Basic Information */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div>
						<label htmlFor="registration_number" className="block text-sm font-medium text-gray-700">
							Registration Number *
						</label>
						<input
							type="text"
							id="registration_number"
							className="input-field mt-1"
							placeholder="e.g., ABC-1234"
							value={formData.registration_number}
							onChange={(e) => handleInputChange("registration_number", e.target.value)}
							required
							maxLength={16}
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="brand" className="block text-sm font-medium text-gray-700">
							Brand *
						</label>
						<input
							type="text"
							id="brand"
							className="input-field mt-1"
							placeholder="e.g., Toyota"
							value={formData.brand}
							onChange={(e) => handleInputChange("brand", e.target.value)}
							required
							maxLength={32}
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="model" className="block text-sm font-medium text-gray-700">
							Model *
						</label>
						<input
							type="text"
							id="model"
							className="input-field mt-1"
							placeholder="e.g., Camry"
							value={formData.model}
							onChange={(e) => handleInputChange("model", e.target.value)}
							required
							maxLength={64}
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="vin" className="block text-sm font-medium text-gray-700">
							VIN *
						</label>
						<input
							type="text"
							id="vin"
							className="input-field mt-1"
							placeholder="17-character VIN"
							value={formData.vin}
							onChange={(e) => handleInputChange("vin", e.target.value.toUpperCase())}
							required
							maxLength={17}
							minLength={17}
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="id_number" className="block text-sm font-medium text-gray-700">
							Registration ID Number *
						</label>
						<input
							type="text"
							id="id_number"
							className="input-field mt-1"
							placeholder="Registration document number"
							value={formData.id_number}
							onChange={(e) => handleInputChange("id_number", e.target.value)}
							required
							maxLength={64}
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="production_year" className="block text-sm font-medium text-gray-700">
							Production Year *
						</label>
						<input
							type="number"
							id="production_year"
							className="input-field mt-1"
							min={1900}
							max={new Date().getFullYear() + 1}
							value={formData.production_year}
							onChange={(e) => handleInputChange("production_year", parseInt(e.target.value))}
							required
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="weight" className="block text-sm font-medium text-gray-700">
							Weight (kg) *
						</label>
						<input
							type="number"
							id="weight"
							className="input-field mt-1"
							min={0}
							step={0.1}
							placeholder="e.g., 1500"
							value={formData.weight || ""}
							onChange={(e) => handleInputChange("weight", parseFloat(e.target.value) || 0)}
							required
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="kilometrage" className="block text-sm font-medium text-gray-700">
							Kilometrage *
						</label>
						<input
							type="number"
							id="kilometrage"
							className="input-field mt-1"
							min={0}
							placeholder="e.g., 50000"
							value={formData.kilometrage || ""}
							onChange={(e) => handleInputChange("kilometrage", parseInt(e.target.value) || 0)}
							required
							disabled={loading}
						/>
					</div>

					<div>
						<label htmlFor="gearbox_type" className="block text-sm font-medium text-gray-700">
							Gearbox Type *
						</label>
						<select
							id="gearbox_type"
							className="input-field mt-1"
							value={formData.gearbox_type}
							onChange={(e) => handleInputChange("gearbox_type", e.target.value as any)}
							required
							disabled={loading}
						>
							<option value="manual">Manual</option>
							<option value="automatic">Automatic</option>
							<option value="semi-automatic">Semi-automatic</option>
						</select>
					</div>

					<div>
						<label htmlFor="tire_type" className="block text-sm font-medium text-gray-700">
							Tire Type *
						</label>
						<select
							id="tire_type"
							className="input-field mt-1"
							value={formData.tire_type}
							onChange={(e) => handleInputChange("tire_type", e.target.value as any)}
							required
							disabled={loading}
						>
							<option value="summer">Summer</option>
							<option value="winter">Winter</option>
							<option value="all-season">All-season</option>
						</select>
					</div>

					<div>
						<label htmlFor="availability" className="block text-sm font-medium text-gray-700">
							Availability Status *
						</label>
						<select
							id="availability"
							className="input-field mt-1"
							value={formData.availability}
							onChange={(e) => handleInputChange("availability", e.target.value as any)}
							required
							disabled={loading}
						>
							<option value="available">Available</option>
							<option value="in use">In Use</option>
							<option value="service">Service</option>
							<option value="booked">Booked</option>
							<option value="decommissioned">Decommissioned</option>
						</select>
					</div>

					<div>
						<label htmlFor="company_id" className="block text-sm font-medium text-gray-700">
							Company *
						</label>
						<select
							id="company_id"
							className="input-field mt-1"
							value={formData.company_id || ""}
							onChange={(e) => handleInputChange("company_id", parseInt(e.target.value))}
							required
							disabled={loading}
						>
							<option value="">Select a company</option>
							{companies.map((company) => (
								<option key={company.id} value={company.id}>
									{company.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
					<button
						type="button"
						onClick={onCancel || (() => router.push("/vehicles"))}
						className="btn-secondary"
						disabled={loading}
					>
						Cancel
					</button>
					<button type="submit" className="btn-primary flex items-center" disabled={loading}>
						{loading ? (
							<>
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
								{vehicle ? "Updating..." : "Creating..."}
							</>
						) : (
							<>{vehicle ? "Update Vehicle" : "Create Vehicle"}</>
						)}
					</button>
				</div>
			</div>
		</form>
	);
}
