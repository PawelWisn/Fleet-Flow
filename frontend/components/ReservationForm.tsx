"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { CalendarIcon, TruckIcon, UserIcon } from "@heroicons/react/24/outline";
import { reservationsApi, vehiclesApi, usersApi } from "@/services/api";
import { Reservation, CreateReservationForm, UpdateReservationForm, Vehicle, User } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

interface ReservationFormProps {
	reservation?: Reservation;
	isEdit?: boolean;
}

export default function ReservationForm({ reservation, isEdit = false }: ReservationFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loadingData, setLoadingData] = useState(true);

	const [formData, setFormData] = useState({
		date_from: reservation?.date_from?.split("T")[0] || "",
		date_to: reservation?.date_to?.split("T")[0] || "",
		vehicle_id: reservation?.vehicle_id || "",
		user_id: reservation?.user_id || "",
	});

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoadingData(true);
				const [vehiclesResponse, usersResponse] = await Promise.all([vehiclesApi.getAll(), usersApi.getAll()]);

				setVehicles(vehiclesResponse.items || []);
				setUsers(usersResponse.items || []);
			} catch (error) {
				console.error("Error fetching form data:", error);
				toast.error("Failed to load form data");
			} finally {
				setLoadingData(false);
			}
		};

		fetchData();
	}, []);

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
				toast.error(`Failed to ${isEdit ? "update" : "create"} reservation`);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	if (loadingData) {
		return (
			<div className="flex justify-center items-center h-64">
				<LoadingSpinner />
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="bg-white shadow-sm rounded-lg p-6">
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
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Vehicle *</label>
							<div className="relative">
								<TruckIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<select
									value={formData.vehicle_id}
									onChange={(e) => handleChange("vehicle_id", e.target.value)}
									className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
								>
									<option value="">Select a vehicle</option>
									{vehicles.map((vehicle) => (
										<option key={vehicle.id} value={vehicle.id}>
											{vehicle.registration_number} - {vehicle.brand} {vehicle.model}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* User Selection */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">User *</label>
							<div className="relative">
								<UserIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<select
									value={formData.user_id}
									onChange={(e) => handleChange("user_id", e.target.value)}
									className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
									required
								>
									<option value="">Select a user</option>
									{users.map((user) => (
										<option key={user.id} value={user.id}>
											{user.name} ({user.email})
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Start Date */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
							<input
								type="date"
								value={formData.date_from}
								onChange={(e) => handleChange("date_from", e.target.value)}
								min={new Date().toISOString().split("T")[0]}
								className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
								className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								required
							/>
						</div>
					</div>

					{/* Form Actions */}
					<div className="mt-8 flex justify-end space-x-4">
						<button
							type="button"
							onClick={() => router.push("/reservations")}
							className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
