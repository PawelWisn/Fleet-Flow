"use client";

import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import UserForm from "@/components/UserForm";

export default function AddUserPage() {
	return (
		<DashboardLayout>
			<RoleGuard allowedRoles={["manager", "admin"]}>
				<div className="space-y-6">
					<UserForm />
				</div>
			</RoleGuard>
		</DashboardLayout>
	);
}
