"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CalendarIcon, TruckIcon, UserIcon } from "@heroicons/react/24/outline";
import { reservationsApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { useAuth } from "@/contexts/AuthContext";
import { Reservation, CreateReservationForm, UpdateReservationForm, Vehicle, User } from "@/types";
import LoadingSpinner from "./LoadingSpinner";
import SearchableDropdown from "./SearchableDropdown";
import { searchUsers, searchVehicles, userLabel, vehicleLabel } from "./relationSearch";

interface ReservationFormProps {
	reservation?: Reservation;
	isEdit?: boolean;
}

export default function ReservationForm({ reservation, isEdit = false }: ReservationFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const { user: currentUser } = useAuth();

	const [formData, setFormData] = useState({
		date_from: reservation?.date_from?.split("T")[0] || "",
		date_to: reservation?.date_to?.split("T")[0] || "",
		vehicle_id: reservation?.vehicle_id?.toString() || "",
		// Reservations are made for yourself unless you are allowed to choose (workers cannot book for others)
		user_id: (reservation?.user_id ?? currentUser?.id)?.toString() || "",
	});
	const [labels, setLabels] = useState({
		vehicle: reservation?.vehicle ? vehicleLabel(reservation.vehicle) : "",
		user: reservation?.user ? userLabel(reservation.user) : currentUser && !reservation ? userLabel(currentUser) : "",
	});
	const canChooseUser = currentUser?.role !== "worker";

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.date_from || !formData.date_to || !formData.vehicle_id || !formData.user_id) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (new Date(formData.date_from) >= new Date(formData.date_to)) {
			toast.error("End date must be after start date");
			return;
		}

		setLoading(true);

		try {
			const submissionData = {
				date_from: new Date(formData.date_from).toISOString(),
				date_to: new Date(formData.date_to).toISOString(),
				vehicle_id: parseInt(formData.vehicle_id.toString()),
				user_id: parseInt(formData.user_id.toString()),
			};

			if (isEdit && reservation) {
				await reservationsApi.update(reservation.id, submissionData as UpdateReservationForm);
				toast.success("Reservation updated successfully!");
			} else {
				await reservationsApi.create(submissionData as CreateReservationForm);
				toast.success("Reservation created successfully!");
			}

			router.push("/reservations");
		} catch (error: any) {
			console.error("Error submitting reservation:", error);
			if (error.response?.status === 400) {
				toast.error("Invalid reservation data. Please check your inputs.");
			} else if (error.response?.status === 409) {
				toast.error("Vehicle is not available for the selected dates");
			} else {
				toast.error(getErrorMessage(error, `Failed to ${isEdit ? "update" : "create"} reservation`));
			}
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="max-w-2xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="bg-white shadow-xs rounded-lg p-6">
					<div className="flex items-center mb-6">
						<CalendarIcon className="h-8 w-8 text-blue-600 mr-3" />
						<div>
							<h2 className="text-xl font-bold text-gray-900">
								{isEdit ? "Edit Reservation" : "Create New Reservation"}
							</h2>
							<p className="text-gray-600">
								{isEdit ? "Update reservation details" : "Fill in the details to create a new reservation"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Vehicle Selection */}
						<SearchableDropdown<Vehicle>
							value={formData.vehicle_id}
							valueLabel={labels.vehicle}
							onChange={(value, label) => {
								handleChange("vehicle_id", value);
								setLabels((prev) => ({ ...prev, vehicle: label }));
							}}
							onSearch={searchVehicles}
							renderOption={(vehicle) => ({ value: vehicle.id.toString(), label: vehicleLabel(vehicle) })}
							placeholder="Select a vehicle"
							label="Vehicle"
							icon={<TruckIcon className="h-5 w-5" />}
							required
						/>

						{/* User Selection */}
						{canChooseUser ? (
							<SearchableDropdown<User>
								value={formData.user_id}
								valueLabel={labels.user}
								onChange={(value, label) => {
									handleChange("user_id", value);
									setLabels((prev) => ({ ...prev, user: label }));
								}}
								onSearch={searchUsers}
								renderOption={(user) => ({ value: user.id.toString(), label: userLabel(user) })}
								placeholder="Select a user"
								label="User"
								icon={<UserIcon className="h-5 w-5" />}
								required
							/>
						) : (
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">User</label>
								<p className="py-2 text-sm text-gray-900">{labels.user || currentUser?.name}</p>
							</div>
						)}

						{/* Start Date */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
							<input
								type="date"
								value={formData.date_from}
								onChange={(e) => handleChange("date_from", e.target.value)}
								// Existing reservations may already have started; only new bookings must begin today or later
								min={isEdit ? undefined : new Date().toISOString().split("T")[0]}
								className="w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								required
							/>
						</div>

						{/* End Date */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">To Date *</label>
							<input
								type="date"
								value={formData.date_to}
								onChange={(e) => handleChange("date_to", e.target.value)}
								min={formData.date_from || new Date().toISOString().split("T")[0]}
								className="w-full border border-gray-300 rounded-md shadow-xs py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								required
							/>
						</div>
					</div>

					{/* Form Actions */}
					<div className="mt-8 flex justify-end space-x-4">
						<button
							type="button"
							onClick={() => router.push("/reservations")}
							className="px-4 py-2 border border-gray-300 rounded-md shadow-xs text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
						>
							{loading && <LoadingSpinner />}
							{isEdit ? "Update Reservation" : "Create Reservation"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
