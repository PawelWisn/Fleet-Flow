"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

export default function SettingsPage() {
	return (
		<DashboardLayout>
			<div className="text-center py-12">
				<Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
				<h3 className="mt-2 text-lg font-medium text-gray-900">Settings</h3>
				<p className="mt-1 text-sm text-gray-500">Application settings and configuration coming soon.</p>
			</div>
		</DashboardLayout>
	);
}
