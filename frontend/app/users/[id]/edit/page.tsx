"use client";

import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import RoleGuard from "@/components/RoleGuard";
import UserForm from "@/components/UserForm";

export default function EditUserPage() {
	const params = useParams();
	const userId = params.id as string;

	return (
		<DashboardLayout>
			<RoleGuard allowedRoles={["manager", "admin"]}>
				<div className="space-y-6">
					<UserForm userId={userId} isEdit={true} />
				</div>
			</RoleGuard>
		</DashboardLayout>
	);
}
