"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import CompanyForm from "@/components/CompanyForm";
import LoadingSpinner from "@/components/LoadingSpinner";
import { companiesApi } from "@/services/api";
import { Company, CreateCompanyForm } from "@/types";

export default function EditCompanyPage() {
	const router = useRouter();
	const params = useParams();
	const companyId = parseInt(params.id as string);

	const [company, setCompany] = useState<Company | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isInitialLoading, setIsInitialLoading] = useState(true);

	useEffect(() => {
		const fetchCompany = async () => {
			try {
				const companyData = await companiesApi.getById(companyId);
				setCompany(companyData);
			} catch (error) {
				console.error("Error fetching company:", error);
				toast.error("Failed to load company data");
				router.push("/companies");
			} finally {
				setIsInitialLoading(false);
			}
		};

		if (companyId) {
			fetchCompany();
		}
	}, [companyId, router]);

	const handleSubmit = async (data: CreateCompanyForm) => {
		setIsLoading(true);
		try {
			await companiesApi.update(companyId, data);
			toast.success("Company updated successfully");
			router.push("/companies");
		} catch (error) {
			console.error("Error updating company:", error);
			toast.error("Failed to update company");
			throw error;
		} finally {
			setIsLoading(false);
		}
	};

	if (isInitialLoading) {
		return (
			<DashboardLayout>
				<div className="flex justify-center items-center h-64">
					<LoadingSpinner />
				</div>
			</DashboardLayout>
		);
	}

	if (!company) {
		return (
			<DashboardLayout>
				<div className="text-center py-12">
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Company not found</h2>
					<p className="text-gray-600 mb-4">The company you're looking for doesn't exist.</p>
					<button onClick={() => router.push("/companies")} className="text-blue-600 hover:text-blue-500">
						Back to Companies
					</button>
				</div>
			</DashboardLayout>
		);
	}

	return (
		<DashboardLayout>
			<div className="space-y-6">
				<CompanyForm company={company} onSubmit={handleSubmit} isLoading={isLoading} />
			</div>
		</DashboardLayout>
	);
}
