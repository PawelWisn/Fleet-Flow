"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { BuildingOfficeIcon } from "@heroicons/react/24/outline";
import { Company, CreateCompanyForm } from "@/types";

interface CompanyFormProps {
	company?: Company;
	onSubmit: (data: CreateCompanyForm) => Promise<void>;
	isLoading?: boolean;
}

export default function CompanyForm({ company, onSubmit, isLoading = false }: CompanyFormProps) {
	const router = useRouter();
	const [formData, setFormData] = useState<CreateCompanyForm>({
		name: company?.name || "",
		post_code: company?.post_code || "",
		address1: company?.address1 || "",
		address2: company?.address2 || "",
		city: company?.city || "",
		country: company?.country || "",
		nip: company?.nip || "",
	});

	const [errors, setErrors] = useState<Partial<CreateCompanyForm>>({});

	const validateForm = (): boolean => {
		const newErrors: Partial<CreateCompanyForm> = {};

		if (!formData.name.trim()) {
			newErrors.name = "Company name is required";
		}

		if (!formData.post_code.trim()) {
			newErrors.post_code = "Post code is required";
		} else if (formData.post_code.length > 8) {
			newErrors.post_code = "Post code must be 8 characters or less";
		}

		if (!formData.address1.trim()) {
			newErrors.address1 = "Address line 1 is required";
		} else if (formData.address1.length > 128) {
			newErrors.address1 = "Address line 1 must be 128 characters or less";
		}

		if (formData.address2.length > 128) {
			newErrors.address2 = "Address line 2 must be 128 characters or less";
		}

		if (!formData.city.trim()) {
			newErrors.city = "City is required";
		} else if (formData.city.length > 128) {
			newErrors.city = "City must be 128 characters or less";
		}

		if (!formData.country.trim()) {
			newErrors.country = "Country is required";
		} else if (formData.country.length > 128) {
			newErrors.country = "Country must be 128 characters or less";
		}

		if (!formData.nip.trim()) {
			newErrors.nip = "NIP (Tax ID) is required";
		} else if (formData.nip.length !== 10) {
			newErrors.nip = "NIP must be exactly 10 characters";
		} else if (!/^\d+$/.test(formData.nip)) {
			newErrors.nip = "NIP must contain only digits";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			toast.error("Please fix the errors in the form");
			return;
		}

		try {
			await onSubmit(formData);
		} catch (error) {
			console.error("Error submitting form:", error);
			toast.error("Failed to save company");
		}
	};

	const handleInputChange = (field: keyof CreateCompanyForm, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<div className="max-w-2xl mx-auto">
			<div className="bg-white shadow-sm rounded-lg">
				<div className="px-6 py-4 border-b border-gray-200">
					<div className="flex items-center">
						<BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-3" />
						<h1 className="text-2xl font-bold text-gray-900">{company ? "Edit Company" : "Add New Company"}</h1>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{/* Company Name */}
					<div>
						<label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
							Company Name *
						</label>
						<input
							type="text"
							id="name"
							value={formData.name}
							onChange={(e) => handleInputChange("name", e.target.value)}
							className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.name ? "border-red-300" : "border-gray-300"
							}`}
							placeholder="Enter company name"
							maxLength={128}
						/>
						{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
					</div>

					{/* NIP */}
					<div>
						<label htmlFor="nip" className="block text-sm font-medium text-gray-700 mb-2">
							NIP (Tax ID) *
						</label>
						<input
							type="text"
							id="nip"
							value={formData.nip}
							onChange={(e) => handleInputChange("nip", e.target.value.replace(/\D/g, "").slice(0, 10))}
							className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
								errors.nip ? "border-red-300" : "border-gray-300"
							}`}
							placeholder="Enter 10-digit tax ID"
							maxLength={10}
						/>
						{errors.nip && <p className="mt-1 text-sm text-red-600">{errors.nip}</p>}
					</div>

					{/* Address Section */}
					<div className="space-y-4">
						<h3 className="text-lg font-medium text-gray-900">Address Information</h3>

						{/* Address Line 1 */}
						<div>
							<label htmlFor="address1" className="block text-sm font-medium text-gray-700 mb-2">
								Address Line 1 *
							</label>
							<input
								type="text"
								id="address1"
								value={formData.address1}
								onChange={(e) => handleInputChange("address1", e.target.value)}
								className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
									errors.address1 ? "border-red-300" : "border-gray-300"
								}`}
								placeholder="Enter street address"
								maxLength={128}
							/>
							{errors.address1 && <p className="mt-1 text-sm text-red-600">{errors.address1}</p>}
						</div>

						{/* Address Line 2 */}
						<div>
							<label htmlFor="address2" className="block text-sm font-medium text-gray-700 mb-2">
								Address Line 2
							</label>
							<input
								type="text"
								id="address2"
								value={formData.address2}
								onChange={(e) => handleInputChange("address2", e.target.value)}
								className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
									errors.address2 ? "border-red-300" : "border-gray-300"
								}`}
								placeholder="Apartment, suite, etc. (optional)"
								maxLength={128}
							/>
							{errors.address2 && <p className="mt-1 text-sm text-red-600">{errors.address2}</p>}
						</div>

						{/* City and Post Code */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
									City *
								</label>
								<input
									type="text"
									id="city"
									value={formData.city}
									onChange={(e) => handleInputChange("city", e.target.value)}
									className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
										errors.city ? "border-red-300" : "border-gray-300"
									}`}
									placeholder="Enter city"
									maxLength={128}
								/>
								{errors.city && <p className="mt-1 text-sm text-red-600">{errors.city}</p>}
							</div>

							<div>
								<label htmlFor="post_code" className="block text-sm font-medium text-gray-700 mb-2">
									Post Code *
								</label>
								<input
									type="text"
									id="post_code"
									value={formData.post_code}
									onChange={(e) => handleInputChange("post_code", e.target.value)}
									className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
										errors.post_code ? "border-red-300" : "border-gray-300"
									}`}
									placeholder="Enter post code"
									maxLength={8}
								/>
								{errors.post_code && <p className="mt-1 text-sm text-red-600">{errors.post_code}</p>}
							</div>
						</div>

						{/* Country */}
						<div>
							<label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
								Country *
							</label>
							<input
								type="text"
								id="country"
								value={formData.country}
								onChange={(e) => handleInputChange("country", e.target.value)}
								className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
									errors.country ? "border-red-300" : "border-gray-300"
								}`}
								placeholder="Enter country"
								maxLength={128}
							/>
							{errors.country && <p className="mt-1 text-sm text-red-600">{errors.country}</p>}
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
						<button
							type="button"
							onClick={() => router.back()}
							className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
							disabled={isLoading}
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Saving..." : company ? "Update Company" : "Create Company"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
