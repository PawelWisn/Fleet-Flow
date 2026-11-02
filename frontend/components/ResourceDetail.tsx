"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getErrorMessage } from "@/services/errors";

interface ResourceDetailProps<T extends { id: number }> {
	title: string;
	subtitle: string;
	basePath: string;
	singularName: string;
	pluralName: string;
	fetchItem: (id: number) => Promise<T>;
	deleteItem: (id: number) => Promise<void>;
	children: (item: T) => React.ReactNode;
	canEdit?: (item: T) => boolean;
}

export default function ResourceDetail<T extends { id: number }>({
	title,
	subtitle,
	basePath,
	singularName,
	pluralName,
	fetchItem,
	deleteItem,
	children,
	canEdit,
}: ResourceDetailProps<T>) {
	const params = useParams();
	const router = useRouter();
	const id = parseInt(params.id as string);
	const [item, setItem] = useState<T | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				setItem(await fetchItem(id));
			} catch (error: any) {
				console.error(`Error fetching ${singularName}:`, error);
				if (error.response?.status !== 404) toast.error(getErrorMessage(error, `Failed to load ${singularName}`));
			} finally {
				setLoading(false);
			}
		};

		if (id) load();
	}, [id]);

	const handleDelete = async () => {
		if (!window.confirm(`Are you sure you want to delete this ${singularName}? This action cannot be undone.`)) return;
		setDeleting(true);
		try {
			await deleteItem(id);
			toast.success(`${singularName[0].toUpperCase()}${singularName.slice(1)} deleted successfully`);
			router.push(basePath);
		} catch (error: any) {
			console.error(`Error deleting ${singularName}:`, error);
			toast.error(getErrorMessage(error, `Failed to delete ${singularName}`));
			setDeleting(false);
		}
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

	if (!item) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<h3 className="text-lg font-medium text-gray-900">{singularName[0].toUpperCase() + singularName.slice(1)} not found</h3>
					<p className="mt-1 text-sm text-gray-500">The {singularName} you&apos;re looking for doesn&apos;t exist or you can&apos;t access it.</p>
					<div className="mt-6">
						<button onClick={() => router.push(basePath)} className="btn-primary inline-flex items-center">
							<ArrowLeftIcon className="h-4 w-4 mr-2" />
							Back to {pluralName}
						</button>
					</div>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout title={title} subtitle={subtitle}>
			<div className="space-y-6">
				<div className="flex justify-between items-start">
					<button onClick={() => router.push(basePath)} className="btn-secondary flex items-center">
						<ArrowLeftIcon className="h-4 w-4 mr-2" />
						Back to {pluralName}
					</button>

					{(!canEdit || canEdit(item)) && (
						<div className="flex space-x-3">
							<button onClick={() => router.push(`${basePath}/${item.id}/edit`)} className="btn-secondary flex items-center">
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
					)}
				</div>

				{children(item)}
			</div>
		</DashboardLayout>
	);
}

export function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="card">
			<h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
			<dl className="space-y-4">{children}</dl>
		</div>
	);
}

export function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<dt className="text-sm font-medium text-gray-500">{label}</dt>
			<dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap wrap-break-word">{children || "-"}</dd>
		</div>
	);
}
