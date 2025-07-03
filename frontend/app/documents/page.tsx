"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { DocumentTextIcon } from "@heroicons/react/24/outline";

export default function DocumentsPage() {
	return (
		<DashboardLayout>
			<div className="text-center py-12">
				<DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-lg font-medium text-gray-900">Documents</h3>
				<p className="mt-1 text-sm text-gray-500">Document management feature coming soon.</p>
			</div>
		</DashboardLayout>
	);
}
