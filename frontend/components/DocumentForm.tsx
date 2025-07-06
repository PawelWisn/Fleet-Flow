"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { DocumentTextIcon, TruckIcon, UserIcon } from "@heroicons/react/24/outline";
import { documentsApi, vehiclesApi, usersApi } from "@/services/api";
import { Document, CreateDocumentForm, UpdateDocumentForm, Vehicle, User } from "@/types";
import LoadingSpinner from "./LoadingSpinner";

interface DocumentFormProps {
	document?: Document;
	documentId?: string;
	isEdit?: boolean;
}

const documentTypes = [
	{ value: "registration", label: "Registration Document" },
	{ value: "insurance", label: "Insurance Document" },
	{ value: "maintenance", label: "Maintenance Record" },
	{ value: "inspection", label: "Inspection Certificate" },
	{ value: "manual", label: "User Manual" },
	{ value: "other", label: "Other" },
];

export default function DocumentForm({ document, documentId, isEdit = false }: DocumentFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [users, setUsers] = useState<User[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [documentData, setDocumentData] = useState<Document | null>(document || null);

	const [formData, setFormData] = useState({
		title: "",
		description: "",
		file_type: "",
		vehicle_id: "",
		user_id: "",
	});

	const [selectedFile, setSelectedFile] = useState<File | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoadingData(true);

				// Fetch vehicles and users
				const [vehiclesResponse, usersResponse] = await Promise.all([vehiclesApi.getAll(), usersApi.getAll()]);

				setVehicles(vehiclesResponse.items || []);
				setUsers(usersResponse.items || []);

				// If we have a documentId, fetch the document data
				if (documentId) {
					const documentResponse = await documentsApi.getById(parseInt(documentId));
					setDocumentData(documentResponse);
					setFormData({
						title: documentResponse.title || "",
						description: documentResponse.description || "",
						file_type: documentResponse.file_type || "",
						vehicle_id: documentResponse.vehicle_id?.toString() || "",
						user_id: documentResponse.user_id?.toString() || "",
					});
				} else if (document) {
					setFormData({
						title: document.title || "",
						description: document.description || "",
						file_type: document.file_type || "",
						vehicle_id: document.vehicle_id?.toString() || "",
						user_id: document.user_id?.toString() || "",
					});
				}
			} catch (error) {
				console.error("Error fetching form data:", error);
				toast.error("Failed to load form data");
			} finally {
				setLoadingData(false);
			}
		};

		fetchData();
	}, [documentId, document]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.title || !formData.description || !formData.file_type || !formData.vehicle_id || !formData.user_id) {
			toast.error("Please fill in all required fields");
			return;
		}

		setLoading(true);

		try {
			const submissionData = {
				title: formData.title,
				description: formData.description,
				file_type: formData.file_type,
				vehicle_id: parseInt(formData.vehicle_id.toString()),
				user_id: parseInt(formData.user_id.toString()),
				...(selectedFile && { file: selectedFile }),
			};

			if (isEdit && (document || documentData)) {
				const docToUpdate = document || documentData;
				if (docToUpdate) {
					// For updates, we use the regular API call (no file upload for updates yet)
					const updateData = {
						title: formData.title,
						description: formData.description,
						file_type: formData.file_type,
						vehicle_id: parseInt(formData.vehicle_id.toString()),
						user_id: parseInt(formData.user_id.toString()),
					};
					await documentsApi.update(docToUpdate.id, updateData as UpdateDocumentForm);
					toast.success("Document updated successfully!");
				}
			} else {
				await documentsApi.create(submissionData as CreateDocumentForm & { file?: File });
				toast.success("Document created successfully!");
			}

			router.push("/documents");
		} catch (error: any) {
			console.error("Error submitting document:", error);
			if (error.response?.status === 400) {
				toast.error("Invalid document data. Please check your inputs.");
			} else if (error.response?.status === 403) {
				toast.error("You don't have permission to perform this action");
			} else {
				toast.error(`Failed to ${isEdit ? "update" : "create"} document`);
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
						<DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
						<div>
							<h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit Document" : "Create New Document"}</h2>
							<p className="text-gray-600">
								{isEdit ? "Update document details" : "Fill in the details to create a new document"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Title */}
						<div className="md:col-span-2">
							<label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
							<input
								type="text"
								value={formData.title}
								onChange={(e) => handleChange("title", e.target.value)}
								placeholder="Document title"
								className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								required
							/>
						</div>

						{/* Document Type */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
							<select
								value={formData.file_type}
								onChange={(e) => handleChange("file_type", e.target.value)}
								className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								required
							>
								<option value="">Select document type</option>
								{documentTypes.map((type) => (
									<option key={type.value} value={type.value}>
										{type.label}
									</option>
								))}
							</select>
						</div>

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
					</div>

					{/* Description */}
					<div className="mt-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
						<textarea
							value={formData.description}
							onChange={(e) => handleChange("description", e.target.value)}
							rows={4}
							placeholder="Document description..."
							className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							required
						/>
					</div>

					<div className="mt-6">
						<label className="block text-sm font-medium text-gray-700 mb-2">File Upload</label>
						<div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
							<div className="space-y-1 text-center">
								<svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
									<path
										d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
										strokeWidth={2}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								<div className="flex text-sm text-gray-600">
									<label
										htmlFor="file-upload"
										className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
									>
										<span>Upload a file</span>
										<input
											id="file-upload"
											name="file-upload"
											type="file"
											className="sr-only"
											onChange={(e) => {
												const file = e.target.files?.[0];
												if (file) {
													setSelectedFile(file);
												}
											}}
										/>
									</label>
									<p className="pl-1">or drag and drop</p>
								</div>
								<p className="text-xs text-gray-500">PDF, TXT, ZIP, RAR, and pictures up to 10MB</p>
								{selectedFile && <p className="text-sm text-green-600 mt-2">Selected: {selectedFile.name}</p>}
							</div>
						</div>
					</div>

					{/* Form Actions */}
					<div className="mt-8 flex justify-end space-x-4">
						<button
							type="button"
							onClick={() => router.push("/documents")}
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
							{isEdit ? "Update Document" : "Create Document"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
