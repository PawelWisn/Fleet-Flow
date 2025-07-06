"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { UserIcon, BuildingOfficeIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { usersApi, companiesApi } from "@/services/api";
import { User, CreateUserForm, UpdateUserForm, Company } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

interface UserFormProps {
	user?: User;
	userId?: string;
	isEdit?: boolean;
}

const roleOptions = [
	{ value: "worker", label: "Worker", description: "Basic access to assigned vehicles" },
	{ value: "manager", label: "Manager", description: "Manage company vehicles and workers" },
	{ value: "admin", label: "Admin", description: "Full system access" },
];

export default function UserForm({ user, userId, isEdit = false }: UserFormProps) {
	const router = useRouter();
	const { user: currentUser, canManageAdmins } = useAuth();
	const [loading, setLoading] = useState(false);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [loadingData, setLoadingData] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [userData, setUserData] = useState<User | null>(user || null);

	// Filter role options based on current user's permissions
	const availableRoleOptions = roleOptions.filter((role) => {
		// If current user is not an admin, hide admin role option
		if (role.value === "admin" && !canManageAdmins()) {
			return false;
		}
		return true;
	});

	const [formData, setFormData] = useState({
		email: "",
		name: "",
		password1: "",
		password2: "",
		role: "worker" as "worker" | "manager" | "admin",
		company_id: "",
	});

	const [errors, setErrors] = useState<{
		email?: string;
		name?: string;
		password1?: string;
		password2?: string;
		role?: string;
		company_id?: string;
	}>({});

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoadingData(true);

				// Fetch companies
				const companiesResponse = await companiesApi.getAll();
				setCompanies(companiesResponse.items || []);

				// If we have a userId, fetch the user data
				if (userId) {
					const userResponse = await usersApi.getById(parseInt(userId));
					setUserData(userResponse);
					setFormData({
						email: userResponse.email || "",
						name: userResponse.name || "",
						password1: "",
						password2: "",
						role: userResponse.role || "worker",
						company_id: userResponse.company_id?.toString() || "",
					});
				} else if (user) {
					setFormData({
						email: user.email || "",
						name: user.name || "",
						password1: "",
						password2: "",
						role: user.role || "worker",
						company_id: user.company_id?.toString() || "",
					});
				}
				setCompanies(companiesResponse.items || []);
			} catch (error) {
				console.error("Error fetching form data:", error);
				toast.error("Failed to load form data");
			} finally {
				setLoadingData(false);
			}
		};

		fetchData();
	}, [userId, user]);

	const validateForm = (): boolean => {
		const newErrors: {
			email?: string;
			name?: string;
			password1?: string;
			password2?: string;
			role?: string;
			company_id?: string;
		} = {};

		if (!formData.email.trim()) {
			newErrors.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			newErrors.email = "Please enter a valid email address";
		}

		if (!formData.name.trim()) {
			newErrors.name = "Name is required";
		}

		if (!isEdit || formData.password1) {
			if (!formData.password1) {
				newErrors.password1 = "Password is required";
			} else if (formData.password1.length < 8) {
				newErrors.password1 = "Password must be at least 8 characters";
			}

			if (formData.password1 !== formData.password2) {
				newErrors.password2 = "Passwords do not match";
			}
		}

		if (!formData.role) {
			newErrors.role = "Role is required";
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

		setLoading(true);

		try {
			const submissionData: any = {
				email: formData.email,
				name: formData.name,
				role: formData.role,
				company_id: formData.company_id ? parseInt(formData.company_id.toString()) : undefined,
			};

			// Only include password fields if they're provided
			if (formData.password1) {
				submissionData.password1 = formData.password1;
				submissionData.password2 = formData.password2;
			}

			if (isEdit && (user || userData)) {
				const userToUpdate = user || userData;
				if (userToUpdate) {
					await usersApi.update(userToUpdate.id, submissionData as UpdateUserForm);
					toast.success("User updated successfully!");
				}
			} else {
				await usersApi.create(submissionData as CreateUserForm);
				toast.success("User created successfully!");
			}

			router.push("/users");
		} catch (error: any) {
			console.error("Error submitting user:", error);
			if (error.response?.status === 400) {
				const errorData = error.response.data;
				if (errorData.detail?.includes("email")) {
					toast.error("Email already exists");
				} else {
					toast.error("Invalid user data. Please check your inputs.");
				}
			} else if (error.response?.status === 403) {
				toast.error("You don't have permission to perform this action");
			} else {
				toast.error(`Failed to ${isEdit ? "update" : "create"} user`);
			}
		} finally {
			setLoading(false);
		}
	};

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field as keyof CreateUserForm]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
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
						<UserIcon className="h-8 w-8 text-blue-600 mr-3" />
						<div>
							<h2 className="text-xl font-bold text-gray-900">{isEdit ? "Edit User" : "Create New User"}</h2>
							<p className="text-gray-600">
								{isEdit ? "Update user details" : "Fill in the details to create a new user"}
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Name */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
							<input
								type="text"
								value={formData.name}
								onChange={(e) => handleChange("name", e.target.value)}
								placeholder="Enter full name"
								className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
									errors.name ? "border-red-300" : "border-gray-300"
								}`}
								required
							/>
							{errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
						</div>

						{/* Email */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) => handleChange("email", e.target.value)}
								placeholder="user@example.com"
								className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
									errors.email ? "border-red-300" : "border-gray-300"
								}`}
								required
							/>
							{errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
						</div>

						{/* Password */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Password {!isEdit && "*"}
								{isEdit && <span className="text-gray-500">(leave blank to keep current)</span>}
							</label>
							<div className="relative">
								<input
									type={showPassword ? "text" : "password"}
									value={formData.password1}
									onChange={(e) => handleChange("password1", e.target.value)}
									placeholder={isEdit ? "New password (optional)" : "Enter password"}
									className={`w-full border rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors.password1 ? "border-red-300" : "border-gray-300"
									}`}
									required={!isEdit}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
								>
									{showPassword ? (
										<EyeSlashIcon className="h-4 w-4 text-gray-400" />
									) : (
										<EyeIcon className="h-4 w-4 text-gray-400" />
									)}
								</button>
							</div>
							{errors.password1 && <p className="mt-1 text-sm text-red-600">{errors.password1}</p>}
						</div>

						{/* Confirm Password */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password {!isEdit && "*"}</label>
							<div className="relative">
								<input
									type={showConfirmPassword ? "text" : "password"}
									value={formData.password2}
									onChange={(e) => handleChange("password2", e.target.value)}
									placeholder={isEdit ? "Confirm new password" : "Confirm password"}
									className={`w-full border rounded-md shadow-sm py-2 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors.password2 ? "border-red-300" : "border-gray-300"
									}`}
									required={!isEdit || !!formData.password1}
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
								>
									{showConfirmPassword ? (
										<EyeSlashIcon className="h-4 w-4 text-gray-400" />
									) : (
										<EyeIcon className="h-4 w-4 text-gray-400" />
									)}
								</button>
							</div>
							{errors.password2 && <p className="mt-1 text-sm text-red-600">{errors.password2}</p>}
						</div>

						{/* Role */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
							<select
								value={formData.role}
								onChange={(e) => handleChange("role", e.target.value)}
								className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
									errors.role ? "border-red-300" : "border-gray-300"
								}`}
								required
							>
								{availableRoleOptions.map((role) => (
									<option key={role.value} value={role.value}>
										{role.label}
									</option>
								))}
							</select>
							{errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
						</div>

						{/* Company */}
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
							<div className="relative">
								<BuildingOfficeIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<select
									value={formData.company_id}
									onChange={(e) => handleChange("company_id", e.target.value)}
									className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="">Select a company (optional)</option>
									{companies.map((company) => (
										<option key={company.id} value={company.id}>
											{company.name}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>

					{/* Role descriptions */}
					<div className="mt-6 bg-gray-50 rounded-lg p-4">
						<h4 className="text-sm font-medium text-gray-900 mb-2">Role Permissions:</h4>
						<div className="space-y-2">
							{availableRoleOptions.map((role) => (
								<div key={role.value} className="flex items-start">
									<div
										className={`w-2 h-2 rounded-full mt-2 mr-3 ${
											formData.role === role.value ? "bg-blue-500" : "bg-gray-300"
										}`}
									/>
									<div>
										<span className="text-sm font-medium text-gray-900">{role.label}:</span>
										<span className="text-sm text-gray-600 ml-1">{role.description}</span>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Form Actions */}
					<div className="mt-8 flex justify-end space-x-4">
						<button
							type="button"
							onClick={() => router.push("/users")}
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
							{isEdit ? "Update User" : "Create User"}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
