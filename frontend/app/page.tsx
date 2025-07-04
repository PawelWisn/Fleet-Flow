"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

interface LoginForm {
	email: string;
	password: string;
}

export default function LoginPage() {
	const [formData, setFormData] = useState<LoginForm>({ email: "", password: "" });
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.email || !formData.password) {
			toast.error("Please fill in all fields");
			return;
		}

		setLoading(true);

		try {
			// Send JSON login data to the backend
			const response = await api.post("/users/login/", {
				email: formData.email,
				password: formData.password,
			});

			const { user } = response.data;

			// Store only user info in localStorage (token is in HTTP-only cookie)
			localStorage.setItem("userData", JSON.stringify(user));

			toast.success("Login successful!");

			// Redirect to dashboard
			router.push("/dashboard");
		} catch (error: any) {
			console.error("Login error:", error);

			if (error.response?.status === 401) {
				toast.error("Invalid email or password");
			} else if (error.response?.status === 422) {
				toast.error("Please check your email and password format");
			} else {
				toast.error("Login failed. Please try again.");
			}
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (field: keyof LoginForm, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				{/* Header */}
				<div className="text-center">
					<h1 className="text-4xl font-bold text-primary-600 mb-2">FleetFlow</h1>
					<h2 className="text-2xl font-semibold text-gray-900">Welcome back</h2>
					<p className="mt-2 text-sm text-gray-600">Sign in to your fleet management account</p>
				</div>

				{/* Login Form */}
				<div className="bg-white py-8 px-6 shadow-lg rounded-lg">
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700">
								Email address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="input-field mt-1"
								placeholder="Enter your email"
								value={formData.email}
								onChange={(e) => handleInputChange("email", e.target.value)}
								disabled={loading}
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-gray-700">
								Password
							</label>
							<div className="mt-1 relative">
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									autoComplete="current-password"
									required
									className="input-field pr-10"
									placeholder="Enter your password"
									value={formData.password}
									onChange={(e) => handleInputChange("password", e.target.value)}
									disabled={loading}
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeSlashIcon className="h-5 w-5 text-gray-400" />
									) : (
										<EyeIcon className="h-5 w-5 text-gray-400" />
									)}
								</button>
							</div>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center">
								<input
									id="remember-me"
									name="remember-me"
									type="checkbox"
									className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
								/>
								<label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
									Remember me
								</label>
							</div>

							<div className="text-sm">
								<a href="#" className="font-medium text-primary-600 hover:text-primary-500">
									Forgot your password?
								</a>
							</div>
						</div>

						<div>
							<button
								type="submit"
								disabled={loading}
								className="w-full btn-primary flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												className="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												strokeWidth="4"
											></circle>
											<path
												className="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Signing in...
									</>
								) : (
									"Sign in"
								)}
							</button>
						</div>
					</form>
				</div>

				{/* Demo credentials */}
				<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
					<h3 className="text-sm font-medium text-gray-900 mb-2">Demo Credentials</h3>
					<div className="text-xs text-gray-600 space-y-1">
						<p>
							<strong>Admin:</strong> admin@fleetflow.com / admin123
						</p>
						<p>
							<strong>Manager:</strong> manager@fleetflow.com / manager123
						</p>
						<p>
							<strong>Worker:</strong> worker@fleetflow.com / worker123
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center">
					<p className="text-xs text-gray-500">© 2025 FleetFlow. Professional vehicle fleet management.</p>
				</div>
			</div>
		</div>
	);
}
