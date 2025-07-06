"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ReservationForm from "@/components/ReservationForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { reservationsApi } from "@/services/api";
import { Reservation } from "@/types";

export default function EditReservationPage() {
	const router = useRouter();
	const params = useParams();
	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchReservation = async () => {
			try {
				setLoading(true);
				const data = await reservationsApi.getById(parseInt(params.id as string));
				setReservation(data);
			} catch (error: any) {
				console.error("Error fetching reservation:", error);
				if (error.response?.status === 404) {
					setError("Reservation not found");
					toast.error("Reservation not found");
				} else if (error.response?.status === 403) {
					setError("You don't have permission to edit this reservation");
					toast.error("Permission denied");
				} else {
					setError("Failed to load reservation");
					toast.error("Failed to load reservation");
				}
			} finally {
				setLoading(false);
			}
		};

		if (params.id) {
			fetchReservation();
		}
	}, [params.id]);

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex justify-center items-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (error || !reservation) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<div className="bg-red-50 border border-red-200 rounded-md p-4 max-w-md mx-auto">
						<h3 className="text-lg font-medium text-red-800">Error Loading Reservation</h3>
						<p className="text-red-600 mt-2">{error}</p>
						<button
							onClick={() => router.push("/reservations")}
							className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded"
						>
							Back to Reservations
						</button>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-6">
				<ReservationForm reservation={reservation} isEdit={true} />
			</div>
		</DashboardLayout>
	);
}
