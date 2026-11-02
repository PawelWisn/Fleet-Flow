"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";

interface EditLoaderProps<T> {
	title: string;
	subtitle: string;
	resourceName: string;
	fetchItem: (id: number) => Promise<T>;
	children: (item: T) => React.ReactNode;
}

/** Loads the record named by the `[id]` route param and renders the edit form once it is available. */
export default function EditLoader<T>({ title, subtitle, resourceName, fetchItem, children }: EditLoaderProps<T>) {
	const params = useParams();
	const id = parseInt(params.id as string);
	const [item, setItem] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setItem(await fetchItem(id));
			} catch (err: any) {
				console.error(`Error fetching ${resourceName}:`, err);
				const status = err.response?.status;
				setError(
					status === 404
						? `${resourceName} not found`
						: status === 403
						? `You don't have permission to edit this ${resourceName.toLowerCase()}`
						: `Failed to load ${resourceName.toLowerCase()}`,
				);
				toast.error(`Failed to load ${resourceName.toLowerCase()}`);
			} finally {
				setLoading(false);
			}
		};

		if (id) load();
	}, [id]);

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex items-center justify-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (error || !item) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<h3 className="text-lg font-medium text-gray-900">{error || `${resourceName} not found`}</h3>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title={title} subtitle={subtitle}>
			<div className="space-y-6">{children(item)}</div>
		</DashboardLayout>
	);
}
