"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { BuildingOfficeIcon, DocumentTextIcon, TruckIcon } from "@heroicons/react/24/outline";
import { eventsApi, vehiclesApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { Company, CreateEventForm, Document, Event, Vehicle } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import SearchableDropdown from "@/components/SearchableDropdown";
import { searchCompanies, searchDocuments, searchVehicles, toDateTimeInput, vehicleLabel } from "@/components/relationSearch";

interface EventFormProps {
	event?: Event;
	isEdit?: boolean;
	defaultVehicleId?: number;
}

interface EventFormState {
	event_type: string;
	date: string;
	description: string;
	price: string;
	vehicle_id: string;
	document_id: string;
	company_id: string;
}

export default function EventForm({ event, isEdit = false, defaultVehicleId }: EventFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<keyof EventFormState, string>>>({});
	const [formData, setFormData] = useState<EventFormState>({
		event_type: event?.event_type || "",
		date: toDateTimeInput(event?.date) || toDateTimeInput(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString()),
		description: event?.description || "",
		price: event?.price?.toString() ?? "",
		vehicle_id: (event?.vehicle_id ?? defaultVehicleId)?.toString() || "",
		document_id: event?.document_id?.toString() || "",
		company_id: event?.company_id?.toString() || "",
	});
	const [labels, setLabels] = useState({
		vehicle: event?.vehicle ? vehicleLabel(event.vehicle) : "",
		document: event?.document?.title || "",
		company: event?.company?.name || "",
	});

	const handleChange = (field: keyof EventFormState, value: string) => {
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
		const newErrors: Partial<Record<keyof EventFormState, string>> = {};
		if (!formData.event_type.trim()) newErrors.event_type = "Event type is required";
		if (!formData.date) newErrors.date = "Date is required";
		if (!formData.description.trim()) newErrors.description = "Description is required";
		if (formData.description.length > 1024) newErrors.description = "Description must be at most 1024 characters";
		if (formData.price !== "" && (isNaN(Number(formData.price)) || Number(formData.price) < 0)) newErrors.price = "Price must be a positive number";
		if (!formData.vehicle_id) newErrors.vehicle_id = "Vehicle is required";
		if (!formData.document_id) newErrors.document_id = "Document is required";
		if (!formData.company_id) newErrors.company_id = "Company is required";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const payload: CreateEventForm = {
			event_type: formData.event_type.trim(),
			date: formData.date,
			description: formData.description.trim(),
			price: formData.price === "" ? null : Number(formData.price),
			vehicle_id: parseInt(formData.vehicle_id),
			document_id: parseInt(formData.document_id),
			company_id: parseInt(formData.company_id),
		};

		setLoading(true);
		try {
			if (isEdit && event) {
				await eventsApi.update(event.id, payload);
				toast.success("Event updated successfully");
			} else {
				await eventsApi.create(payload);
				toast.success("Event created successfully");
			}
			router.push("/events");
		} catch (error: any) {
			console.error("Error saving event:", error);
			toast.error(getErrorMessage(error, isEdit ? "Failed to update event" : "Failed to create event"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="card">
					<div className="mb-6">
						<h2 className="text-xl font-semibold text-gray-900">{isEdit ? "Edit Event" : "Add New Event"}</h2>
						<p className="text-sm text-gray-600">Record maintenance, repairs, inspections or other vehicle events.</p>
					</div>

					<div className="form-group">
						<h3 className="text-lg font-medium text-gray-900 mb-4">Event Details</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="label-required">Event Type</label>
								<input
									type="text"
									maxLength={128}
									value={formData.event_type}
									onChange={(e) => handleChange("event_type", e.target.value)}
									className={`input ${errors.event_type ? "border-red-500" : ""}`}
									placeholder="e.g. maintenance, repair, inspection"
								/>
								{errors.event_type && <p className="error">{errors.event_type}</p>}
							</div>
							<div>
								<label className="label-required">Date</label>
								<input
									type="datetime-local"
									value={formData.date}
									onChange={(e) => handleChange("date", e.target.value)}
									className={`input ${errors.date ? "border-red-500" : ""}`}
								/>
								{errors.date && <p className="error">{errors.date}</p>}
							</div>
							<div>
								<label className="label-optional">Price ($)</label>
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
							<div className="md:col-span-2">
								<label className="label-required">Description</label>
								<textarea
									rows={4}
									maxLength={1024}
									value={formData.description}
									onChange={(e) => handleChange("description", e.target.value)}
									className={`input ${errors.description ? "border-red-500" : ""}`}
									placeholder="What happened?"
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
									placeholder="Select a supporting document"
									label="Document"
									icon={<DocumentTextIcon className="h-5 w-5" />}
									required
								/>
								{errors.document_id && <p className="error">{errors.document_id}</p>}
							</div>
						</div>
					</div>

					<div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
						<button type="button" onClick={() => router.push("/events")} disabled={loading} className="btn-secondary">
							Cancel
						</button>
						<button type="submit" disabled={loading} className="btn-primary">
							{loading ? (
								<>
									<LoadingSpinner />
									{isEdit ? "Updating..." : "Creating..."}
								</>
							) : isEdit ? (
								"Update Event"
							) : (
								"Add Event"
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
