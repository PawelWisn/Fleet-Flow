"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
	DocumentTextIcon,
	PlusIcon,
	MagnifyingGlassIcon,
	TruckIcon,
	UserIcon,
	EyeIcon,
	PencilIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import Pagination from "@/components/Pagination";
import { documentsApi } from "@/services/api";
import { Document, PaginatedResponse } from "@/types";

export default function DocumentsPage() {
	const router = useRouter();
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(15);
	const [paginationData, setPaginationData] = useState<PaginatedResponse<Document> | null>(null);

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 500);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Reset page when search term changes
	useEffect(() => {
		setCurrentPage(1);
	}, [debouncedSearchTerm]);

	useEffect(() => {
		const fetchDocuments = async () => {
			try {
				setLoading(true);
				const response = await documentsApi.getAll({
					page: currentPage,
					size: pageSize,
					search: debouncedSearchTerm || undefined,
				});
				setDocuments(response.items || []);
				setPaginationData(response);
			} catch (error) {
				console.error("Error fetching documents:", error);
				toast.error("Failed to load documents");
			} finally {
				setLoading(false);
			}
		};

		fetchDocuments();
	}, [currentPage, pageSize, debouncedSearchTerm]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePageSizeChange = (size: number) => {
		setPageSize(size);
		setCurrentPage(1); // Reset to first page when changing page size
	};

	const handleDelete = async (documentId: number) => {
		if (!confirm("Are you sure you want to delete this document?")) {
			return;
		}

		try {
			await documentsApi.delete(documentId);
			toast.success("Document deleted successfully!");
			// Refetch the current page
			const response = await documentsApi.getAll({
				page: currentPage,
				size: pageSize,
				search: debouncedSearchTerm || undefined,
			});
			setDocuments(response.items || []);
			setPaginationData(response);
		} catch (error) {
			console.error("Error deleting document:", error);
			toast.error("Failed to delete document");
		}
	};

	const getFileTypeColor = (fileType: string) => {
		switch (fileType) {
			case "registration":
				return "bg-blue-100 text-blue-800";
			case "insurance":
				return "bg-green-100 text-green-800";
			case "maintenance":
				return "bg-yellow-100 text-yellow-800";
			case "inspection":
				return "bg-purple-100 text-purple-800";
			case "manual":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-orange-100 text-orange-800";
		}
	};

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">Documents</h1>
						<p className="text-sm text-gray-500">Manage all document records</p>
					</div>
					<button
						onClick={() => router.push("/documents/add")}
						className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						<PlusIcon className="h-4 w-4 mr-2" />
						Add Document
					</button>
				</div>

				{/* Search and Filters */}
				{!loading && (
					<div className="card">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div className="sm:col-span-2 lg:col-span-3">
								<label htmlFor="search" className="block text-sm font-medium text-gray-700">
									Search documents
								</label>
								<div className="mt-1 relative">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
									</div>
									<input
										type="text"
										id="search"
										className="input-field pl-10"
										placeholder="Search by title, description, vehicle plates, or user name"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
									/>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Documents List */}
				<div className="bg-white shadow overflow-hidden sm:rounded-md">
					{loading ? (
						<div className="flex justify-center items-center py-12">
							<LoadingSpinner />
						</div>
					) : documents.length === 0 ? (
						<div className="text-center py-12">
							<DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
							<h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
							<p className="mt-1 text-sm text-gray-500">Get started by creating a new document.</p>
							<div className="mt-6">
								<button
									onClick={() => router.push("/documents/add")}
									className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									<PlusIcon className="h-4 w-4 mr-2" />
									Add Document
								</button>
							</div>
						</div>
					) : (
						<>
							<ul className="divide-y divide-gray-200">
								{documents.map((document) => (
									<li key={document.id}>
										<div className="px-4 py-4 flex items-center justify-between">
											<div className="flex items-center space-x-4">
												<div className="flex-shrink-0">
													<DocumentTextIcon className="h-10 w-10 text-gray-400" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate">{document.title}</p>
													<p className="text-sm text-gray-500 truncate">{document.description}</p>
													<div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
														<span
															className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(document.file_type)}`}
														>
															{document.file_type}
														</span>
														{document.vehicle && (
															<span className="flex items-center">
																<TruckIcon className="h-3 w-3 mr-1" />
																{document.vehicle.registration_number}
															</span>
														)}
														{document.user && (
															<span className="flex items-center">
																<UserIcon className="h-3 w-3 mr-1" />
																{document.user.name}
															</span>
														)}
													</div>
												</div>
											</div>
											<div className="flex items-center space-x-2">
												<button
													onClick={() => router.push(`/documents/${document.id}`)}
													className="p-2 text-gray-400 hover:text-blue-500"
													title="View details"
												>
													<EyeIcon className="h-4 w-4" />
												</button>
												<button
													onClick={() => router.push(`/documents/${document.id}/edit`)}
													className="p-2 text-gray-400 hover:text-green-500"
													title="Edit document"
												>
													<PencilIcon className="h-4 w-4" />
												</button>
												<button
													onClick={() => handleDelete(document.id)}
													className="p-2 text-gray-400 hover:text-red-500"
													title="Delete document"
												>
													<TrashIcon className="h-4 w-4" />
												</button>
											</div>
										</div>
									</li>
								))}
							</ul>
						</>
					)}
				</div>

				{/* Pagination */}
				{!loading && paginationData && paginationData.pages > 1 && (
					<Pagination
						currentPage={currentPage}
						totalPages={paginationData.pages}
						totalItems={paginationData.total}
						itemsPerPage={pageSize}
						onPageChange={handlePageChange}
						onPageSizeChange={handlePageSizeChange}
					/>
				)}
			</div>
		</DashboardLayout>
	);
}
