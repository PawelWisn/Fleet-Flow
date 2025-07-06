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
import { documentsApi } from "@/services/api";
import { Document } from "@/types";

export default function DocumentsPage() {
	const router = useRouter();
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [totalItems, setTotalItems] = useState(0);
	const itemsPerPage = 10;

	const fetchDocuments = async (page = 1, search = "") => {
		try {
			setLoading(true);
			const response = await documentsApi.getAll({
				page,
				size: itemsPerPage,
			});
			setDocuments(response.items || []);
			setTotalPages(response.pages || 1);
			setTotalItems(response.total || 0);
			setCurrentPage(page);
		} catch (error) {
			console.error("Error fetching documents:", error);
			toast.error("Failed to load documents");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDocuments(1, searchTerm);
	}, []);

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setCurrentPage(1);
		fetchDocuments(1, searchTerm);
	};

	const handlePageChange = (page: number) => {
		fetchDocuments(page, searchTerm);
	};

	const handleDelete = async (documentId: number) => {
		if (!confirm("Are you sure you want to delete this document?")) {
			return;
		}

		try {
			await documentsApi.delete(documentId);
			toast.success("Document deleted successfully!");
			fetchDocuments(currentPage, searchTerm);
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

	const renderPagination = () => {
		if (totalPages <= 1) return null;

		const pages = [];
		const maxVisiblePages = 5;
		let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
		let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

		if (endPage - startPage < maxVisiblePages - 1) {
			startPage = Math.max(1, endPage - maxVisiblePages + 1);
		}

		for (let i = startPage; i <= endPage; i++) {
			pages.push(
				<button
					key={i}
					onClick={() => handlePageChange(i)}
					className={`px-3 py-2 rounded-md text-sm font-medium ${
						i === currentPage ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"
					}`}
				>
					{i}
				</button>,
			);
		}

		return (
			<div className="flex items-center justify-between px-4 py-3 sm:px-6">
				<div className="flex justify-between flex-1 sm:hidden">
					<button
						onClick={() => handlePageChange(currentPage - 1)}
						disabled={currentPage === 1}
						className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
					>
						Previous
					</button>
					<button
						onClick={() => handlePageChange(currentPage + 1)}
						disabled={currentPage === totalPages}
						className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
					>
						Next
					</button>
				</div>
				<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div>
						<p className="text-sm text-gray-700">
							Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
							<span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{" "}
							<span className="font-medium">{totalItems}</span> results
						</p>
					</div>
					<div className="flex space-x-1">{pages}</div>
				</div>
			</div>
		);
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

				{/* Search */}
				<form onSubmit={handleSearch} className="flex gap-4">
					<div className="flex-1 relative">
						<MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
						<input
							type="text"
							placeholder="Search documents..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<button
						type="submit"
						className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Search
					</button>
				</form>

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
														{document.vehicle_id && (
															<span className="flex items-center">
																<TruckIcon className="h-3 w-3 mr-1" />
																Vehicle {document.vehicle_id}
															</span>
														)}
														{document.user_id && (
															<span className="flex items-center">
																<UserIcon className="h-3 w-3 mr-1" />
																User {document.user_id}
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
							{renderPagination()}
						</>
					)}
				</div>
			</div>
		</DashboardLayout>
	);
}
