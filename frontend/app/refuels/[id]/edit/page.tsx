"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import RefuelForm from "@/components/RefuelForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { refuelsApi } from "@/services/api";
import { Refuel } from "@/types";
import { toast } from "react-hot-toast";

export default function EditRefuelPage() {
	const params = useParams();
	const refuelId = parseInt(params.id as string);
	const [refuel, setRefuel] = useState<Refuel | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchRefuel = async () => {
			try {
				setLoading(true);
				const data = await refuelsApi.getById(refuelId);
				setRefuel(data);
			} catch (error: any) {
				console.error("Error fetching refuel:", error);
				if (error.response?.status === 404) {
					setError("Refuel record not found");
				} else if (error.response?.status === 403) {
					setError("You don't have permission to edit this refuel record");
				} else {
					setError("Failed to load refuel record");
				}
				toast.error("Failed to load refuel record");
			} finally {
				setLoading(false);
			}
		};

		if (refuelId) {
			fetchRefuel();
		}
	}, [refuelId]);

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (error || !refuel) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<h3 className="text-lg font-medium text-gray-900">{error || "Refuel record not found"}</h3>
					<p className="mt-1 text-sm text-gray-500">
						{error === "Refuel record not found"
							? "The refuel record you're trying to edit doesn't exist."
							: "There was an error loading the refuel record."}
					</p>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title="Edit Refuel" subtitle="Update refuel record information">
			<div className="space-y-6">
				<RefuelForm refuel={refuel} isEdit={true} />
			</div>
		</DashboardLayout>
	);
}
