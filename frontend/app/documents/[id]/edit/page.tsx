"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import DocumentForm from "@/components/DocumentForm";

export default function EditDocumentPage() {
	const params = useParams();
	const documentId = params.id as string;

	return (
		<DashboardLayout>
			<div className="space-y-6">
				<DocumentForm documentId={documentId} isEdit={true} />
			</div>
		</DashboardLayout>
	);
}
