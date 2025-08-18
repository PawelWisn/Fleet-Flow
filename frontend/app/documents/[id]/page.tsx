"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import {
	DocumentTextIcon,
	TruckIcon,
	UserIcon,
	PencilIcon,
	TrashIcon,
	CalendarIcon,
	ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingSpinner from "@/components/LoadingSpinner";
import { documentsApi } from "@/services/api";
import { Document } from "@/types";

export default function DocumentDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const documentId = parseInt(params.id as string);
	const [document, setDocument] = useState<Document | null>(null);
	const [loading, setLoading] = useState(true);
	const [deleting, setDeleting] = useState(false);
	const [downloading, setDownloading] = useState(false);

	useEffect(() => {
		const fetchDocument = async () => {
			try {
				const response = await documentsApi.getById(documentId);
				setDocument(response);
			} catch (error) {
				console.error("Error fetching document:", error);
				toast.error("Failed to load document");
				router.push("/documents");
			} finally {
				setLoading(false);
			}
		};

		if (documentId) {
			fetchDocument();
		}
	}, [documentId, router]);

	const handleDownload = async () => {
		if (!document || !document.file_path) {
			toast.error("No file available for download");
			return;
		}

		setDownloading(true);
		try {
			const blob = await documentsApi.download(document.id);

			// Create a download link
			const url = window.URL.createObjectURL(blob);
			const link = window.document.createElement("a");
			link.href = url;

			// Get file extension from file_path
			const fileExtension = document.file_path.split(".").pop() || "";
			link.download = `${document.title}.${fileExtension}`;

			window.document.body.appendChild(link);
			link.click();
			window.document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("File downloaded successfully!");
		} catch (error) {
			console.error("Error downloading file:", error);
			toast.error("Failed to download file");
		} finally {
			setDownloading(false);
		}
	};

	const handleDelete = async () => {
		if (!document || !confirm("Are you sure you want to delete this document?")) {
			return;
		}

		setDeleting(true);
		try {
			await documentsApi.delete(document.id);
			toast.success("Document deleted successfully!");
			router.push("/documents");
		} catch (error) {
			console.error("Error deleting document:", error);
			toast.error("Failed to delete document");
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<DashboardLayout>
				<div className="flex justify-center items-center min-h-[400px]">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (!document) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-2 text-sm font-medium text-gray-900">Document not found</h3>
					<p className="mt-1 text-sm text-gray-500">The document you're looking for doesn't exist.</p>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
						<p className="text-sm text-gray-500">Document Details</p>
					</div>
					<div className="flex space-x-3">
						<button
							onClick={handleDownload}
							disabled={downloading || !document.file_path}
							className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
							title={!document.file_path ? "No file available for download" : "Download file"}
						>
							<ArrowDownTrayIcon className="h-4 w-4 mr-2" />
							{downloading ? "Downloading..." : "Download"}
						</button>
						<button
							onClick={() => router.push(`/documents/${document.id}/edit`)}
							className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						>
							<PencilIcon className="h-4 w-4 mr-2" />
							Edit
						</button>
						<button
							onClick={handleDelete}
							disabled={deleting}
							className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
						>
							<TrashIcon className="h-4 w-4 mr-2" />
							{deleting ? "Deleting..." : "Delete"}
						</button>
					</div>
				</div>

				{/* Document Info */}
				<div className="bg-white shadow overflow-hidden sm:rounded-lg">
					<div className="px-4 py-5 sm:px-6">
						<h3 className="text-lg leading-6 font-medium text-gray-900">Document Information</h3>
						<p className="mt-1 max-w-2xl text-sm text-gray-500">{document.description}</p>
					</div>
					<div className="border-t border-gray-200">
						<dl>
							<div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
								<dt className="text-sm font-medium text-gray-500 flex items-center">
									<DocumentTextIcon className="h-5 w-5 mr-2" />
									File Type
								</dt>
								<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
									<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
										{document.file_type}
									</span>
								</dd>
							</div>
							<div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
								<dt className="text-sm font-medium text-gray-500 flex items-center">
									<TruckIcon className="h-5 w-5 mr-2" />
									Vehicle
								</dt>
								<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
									{document.vehicle ? document.vehicle.registration_number : "Not assigned"}
								</dd>
							</div>
							<div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
								<dt className="text-sm font-medium text-gray-500 flex items-center">
									<UserIcon className="h-5 w-5 mr-2" />
									User
								</dt>
								<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
									{document.user ? document.user.name : "Not assigned"}
								</dd>
							</div>
							<div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
								<dt className="text-sm font-medium text-gray-500 flex items-center">
									<CalendarIcon className="h-5 w-5 mr-2" />
									Created
								</dt>
								<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
									{document.created_at ? new Date(document.created_at).toLocaleString() : "Unknown"}
								</dd>
							</div>
							{document.updated_at && (
								<div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
									<dt className="text-sm font-medium text-gray-500 flex items-center">
										<CalendarIcon className="h-5 w-5 mr-2" />
										Last Updated
									</dt>
									<dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
										{new Date(document.updated_at).toLocaleString()}
									</dd>
								</div>
							)}
						</dl>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
