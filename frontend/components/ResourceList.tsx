"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon, TruckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import SearchableDropdown from "@/components/SearchableDropdown";
import { searchVehicles, vehicleLabel } from "@/components/relationSearch";
import { vehiclesApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { PaginatedResponse, Vehicle } from "@/types";

interface ListMode {
	value: string;
	label: string;
}

interface ResourceListProps<T extends { id: number }> {
	title: string;
	subtitle: string;
	/** Frontend route, e.g. "/events" */
	basePath: string;
	singularName: string;
	pluralName: string;
	fetchPage: (params: { page: number; size: number; vehicleId?: number; mode: string }) => Promise<PaginatedResponse<T>>;
	deleteItem: (id: number) => Promise<void>;
	renderCard: (item: T) => React.ReactNode;
	/** Optional switch between result sets, e.g. all / finishing soon. The first mode is the default. */
	modes?: ListMode[];
	canEdit?: (item: T) => boolean;
}

function ResourceListContent<T extends { id: number }>({
	title,
	subtitle,
	basePath,
	singularName,
	pluralName,
	fetchPage,
	deleteItem,
	renderCard,
	modes,
	canEdit,
}: ResourceListProps<T>) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const initialVehicleId = searchParams.get("vehicle_id") || "";

	const [items, setItems] = useState<T[]>([]);
	const [loading, setLoading] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [paginationData, setPaginationData] = useState<PaginatedResponse<T> | null>(null);
	const [vehicleId, setVehicleId] = useState(initialVehicleId);
	const [vehicleText, setVehicleText] = useState("");
	const [mode, setMode] = useState(modes?.[0]?.value || "");
	const [reloadKey, setReloadKey] = useState(0);

	// Resolve the label of a vehicle filter that came from the URL
	useEffect(() => {
		if (!initialVehicleId) return;
		vehiclesApi
			.getById(parseInt(initialVehicleId))
			.then((vehicle) => setVehicleText(vehicleLabel(vehicle)))
			.catch(() => setVehicleText(`Vehicle #${initialVehicleId}`));
	}, [initialVehicleId]);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const response = await fetchPage({ page: currentPage, size: pageSize, vehicleId: vehicleId ? parseInt(vehicleId) : undefined, mode });
				setItems(response.items);
				setPaginationData(response);
			} catch (error: any) {
				console.error(`Error fetching ${pluralName}:`, error);
				toast.error(getErrorMessage(error, `Failed to fetch ${pluralName}`));
			} finally {
				setLoading(false);
			}
		};

		load();
	}, [currentPage, pageSize, vehicleId, mode, reloadKey]);

	const handleDelete = useCallback(
		async (id: number) => {
			if (!window.confirm(`Are you sure you want to delete this ${singularName}?`)) return;
			try {
				await deleteItem(id);
				toast.success(`${singularName[0].toUpperCase()}${singularName.slice(1)} deleted successfully`);
				// Step back a page if we just removed the last item of the current one
				if (items.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
				else setReloadKey((key) => key + 1);
			} catch (error: any) {
				console.error(`Error deleting ${singularName}:`, error);
				toast.error(getErrorMessage(error, `Failed to delete ${singularName}`));
			}
		},
		[deleteItem, items.length, currentPage, singularName],
	);

	const clearVehicleFilter = () => {
		setVehicleId("");
		setVehicleText("");
		setCurrentPage(1);
		router.replace(basePath);
	};

	return (
		<DashboardLayout title={title} subtitle={subtitle}>
			<div className="space-y-6">
				<div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
					<div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-1">
						<div className="w-full sm:max-w-sm">
							<SearchableDropdown<Vehicle>
								value={vehicleId}
								valueLabel={vehicleText}
								onChange={(value, label) => {
									setVehicleId(value);
									setVehicleText(label);
									setCurrentPage(1);
								}}
								onSearch={searchVehicles}
								renderOption={(vehicle) => ({ value: vehicle.id.toString(), label: vehicleLabel(vehicle) })}
								placeholder="Filter by vehicle"
								label="Vehicle"
								icon={<TruckIcon className="h-5 w-5" />}
							/>
						</div>
						{vehicleId && (
							<button onClick={clearVehicleFilter} className="btn-secondary flex items-center whitespace-nowrap">
								<XMarkIcon className="h-4 w-4 mr-1" />
								Clear filter
							</button>
						)}
						{modes && modes.length > 1 && (
							<div className="inline-flex rounded-lg border border-gray-300 bg-white overflow-hidden">
								{modes.map((option) => (
									<button
										key={option.value}
										onClick={() => {
											setMode(option.value);
											setCurrentPage(1);
										}}
										className={`px-4 py-2 text-sm font-medium transition-colors ${
											mode === option.value ? "bg-primary-600 text-white" : "text-gray-700 hover:bg-gray-50"
										}`}
									>
										{option.label}
									</button>
								))}
							</div>
						)}
					</div>

					<button
						onClick={() => router.push(`${basePath}/add${vehicleId ? `?vehicle_id=${vehicleId}` : ""}`)}
						className="btn-primary whitespace-nowrap flex items-center justify-center"
					>
						<PlusIcon className="h-5 w-5 mr-2" />
						Add {singularName[0].toUpperCase()}
						{singularName.slice(1)}
					</button>
				</div>

				{loading ? (
					<div className="flex items-center justify-center h-64">
						<LoadingSpinner />
					</div>
				) : items.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{items.map((item) => (
							<div key={item.id} className="card hover:shadow-md transition-shadow flex flex-col">
								<div className="flex justify-end space-x-2 mb-2">
									<button
										onClick={() => router.push(`${basePath}/${item.id}`)}
										className="text-gray-400 hover:text-primary-600 transition-colors"
										title="View details"
									>
										<EyeIcon className="h-4 w-4" />
									</button>
									{(!canEdit || canEdit(item)) && (
										<>
											<button
												onClick={() => router.push(`${basePath}/${item.id}/edit`)}
												className="text-gray-400 hover:text-blue-600 transition-colors"
												title="Edit"
											>
												<PencilIcon className="h-4 w-4" />
											</button>
											<button
												onClick={() => handleDelete(item.id)}
												className="text-gray-400 hover:text-red-600 transition-colors"
												title="Delete"
											>
												<TrashIcon className="h-4 w-4" />
											</button>
										</>
									)}
								</div>
								{renderCard(item)}
							</div>
						))}
					</div>
				) : (
					<div className="text-center py-12">
						<h3 className="mt-2 text-sm font-medium text-gray-900">No {pluralName} found</h3>
						<p className="mt-1 text-sm text-gray-500">
							{vehicleId ? "Try clearing the vehicle filter or " : "Get started by "}adding a new {singularName}.
						</p>
					</div>
				)}

				{!loading && paginationData && paginationData.pages > 1 && (
					<Pagination
						currentPage={currentPage}
						totalPages={paginationData.pages}
						totalItems={paginationData.total}
						itemsPerPage={pageSize}
						onPageChange={setCurrentPage}
						onPageSizeChange={(size) => {
							setPageSize(size);
							setCurrentPage(1);
						}}
					/>
				)}
			</div>
		</DashboardLayout>
	);
}

export default function ResourceList<T extends { id: number }>(props: ResourceListProps<T>) {
	return (
		<Suspense
			fallback={
				<DashboardLayout title={props.title} subtitle={props.subtitle}>
					<div className="flex items-center justify-center h-64">
						<LoadingSpinner />
					</div>
				</DashboardLayout>
			}
		>
			<ResourceListContent {...props} />
		</Suspense>
	);
}
