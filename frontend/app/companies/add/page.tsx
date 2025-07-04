"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import CompanyForm from "@/components/CompanyForm";
import { companiesApi } from "@/services/api";
import { CreateCompanyForm } from "@/types";

export default function AddCompanyPage() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (data: CreateCompanyForm) => {
		setIsLoading(true);
		try {
			await companiesApi.create(data);
			toast.success("Company created successfully");
			router.push("/companies");
		} catch (error) {
			console.error("Error creating company:", error);
			toast.error("Failed to create company");
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<DashboardLayout>
			<div className="space-y-6">
				<CompanyForm onSubmit={handleSubmit} isLoading={isLoading} />
			</div>
		</DashboardLayout>
	);
}
