"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { PencilIcon, TrashIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { refuelsApi } from "@/services/api";
import { Refuel } from "@/types";

export default function RefuelDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const refuelId = parseInt(params.id as string);
	const [refuel, setRefuel] = useState<Refuel | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const fetchRefuel = async () => {
			try {
				setLoading(true);
				const data = await refuelsApi.getById(refuelId);
				setRefuel(data);
			} catch (error) {
				console.error("Error fetching refuel:", error);
				toast.error("Failed to load refuel details");
			} finally {
				setLoading(false);
			}
		};

		if (refuelId) {
			fetchRefuel();
		}
	}, [refuelId]);

	const handleDelete = async () => {
		if (!refuel) return;

		const confirmed = window.confirm(
			"Are you sure you want to delete this refuel record? This action cannot be undone.",
		);

		if (!confirmed) return;

		setDeleting(true);
		try {
			await refuelsApi.delete(refuelId);
			toast.success("Refuel record deleted successfully");
			router.push("/refuels");
		} catch (error) {
			console.error("Error deleting refuel:", error);
			toast.error("Failed to delete refuel record");
		} finally {
			setDeleting(false);
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const calculateEfficiency = () => {
		if (!refuel || !refuel.amount || !refuel.cost) return null;
		return (refuel.cost / refuel.amount).toFixed(2);
	};

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (!refuel) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<h3 className="text-lg font-medium text-gray-900">Refuel record not found</h3>
					<p className="mt-1 text-sm text-gray-500">The refuel record you're looking for doesn't exist.</p>
					<div className="mt-6">
						<button onClick={() => router.push("/refuels")} className="btn-primary">
							<ArrowLeftIcon className="h-4 w-4 mr-2" />
							Back to Refuels
						</button>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title="Refuel Details" subtitle="View refuel record information">
			<div className="space-y-6">
				{/* Header */}
				<div className="flex justify-between items-start">
					<button onClick={() => router.push("/refuels")} className="btn-secondary flex items-center">
						<ArrowLeftIcon className="h-4 w-4 mr-2" />
						Back to Refuels
					</button>

					<div className="flex space-x-3">
						<button
							onClick={() => router.push(`/refuels/${refuel.id}/edit`)}
							className="btn-secondary flex items-center"
						>
							<PencilIcon className="h-4 w-4 mr-2" />
							Edit
						</button>
						<button
							onClick={handleDelete}
							disabled={deleting}
							className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 flex items-center"
						>
							<TrashIcon className="h-4 w-4 mr-2" />
							{deleting ? "Deleting..." : "Delete"}
						</button>
					</div>
				</div>

				{/* Refuel details */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Basic Information */}
					<div className="card">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
						<dl className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-gray-500">Date</dt>
								<dd className="mt-1 text-sm text-gray-900">{formatDate(refuel.date)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Location</dt>
								<dd className="mt-1 text-sm text-gray-900">{refuel.location}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Driver</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{refuel.user?.name}
									<span className="text-gray-500 ml-2">({refuel.user?.email})</span>
								</dd>
							</div>
						</dl>
					</div>

					{/* Vehicle Information */}
					<div className="card">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Information</h3>
						<dl className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-gray-500">Vehicle</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{refuel.vehicle?.brand} {refuel.vehicle?.model}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Registration Number</dt>
								<dd className="mt-1 text-sm text-gray-900">{refuel.vehicle?.registration_number}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Odometer Reading</dt>
								<dd className="mt-1 text-sm text-gray-900">{refuel.odometer.toLocaleString()} km</dd>
							</div>
						</dl>
					</div>

					{/* Fuel Information */}
					<div className="card">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Information</h3>
						<dl className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-gray-500">Amount</dt>
								<dd className="mt-1 text-sm text-gray-900">{refuel.amount} Liters</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Total Cost</dt>
								<dd className="mt-1 text-sm text-gray-900">{formatCurrency(refuel.cost)}</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Price per Liter</dt>
								<dd className="mt-1 text-sm text-gray-900">{calculateEfficiency() && `$${calculateEfficiency()}/L`}</dd>
							</div>
						</dl>
					</div>

					{/* Timestamps */}
					<div className="card">
						<h3 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h3>
						<dl className="space-y-4">
							<div>
								<dt className="text-sm font-medium text-gray-500">Created</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{new Date(refuel.created_at).toLocaleString("en-US", {
										year: "numeric",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</dd>
							</div>
							<div>
								<dt className="text-sm font-medium text-gray-500">Last Updated</dt>
								<dd className="mt-1 text-sm text-gray-900">
									{new Date(refuel.updated_at).toLocaleString("en-US", {
										year: "numeric",
										month: "short",
										day: "numeric",
										hour: "2-digit",
										minute: "2-digit",
									})}
								</dd>
							</div>
						</dl>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
