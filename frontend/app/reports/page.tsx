"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { ChartBarIcon } from "@heroicons/react/24/outline";

export default function ReportsPage() {
	return (
		<DashboardLayout>
			<div className="text-center py-12">
				<ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-lg font-medium text-gray-900">Reports</h3>
				<p className="mt-1 text-sm text-gray-500">Analytics and reporting dashboard coming soon.</p>
			</div>
		</DashboardLayout>
	);
}
