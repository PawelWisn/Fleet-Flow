"use client";

import DashboardLayout from "@/components/DashboardLayout";
import DocumentForm from "@/components/DocumentForm";

export default function AddDocumentPage() {
	return (
		<DashboardLayout>
			<div className="space-y-6">
				<DocumentForm />
			</div>
		</DashboardLayout>
	);
}
