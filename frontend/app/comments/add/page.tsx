"use client";

import AddPage from "@/components/AddPage";
import CommentForm from "@/components/CommentForm";

export default function AddCommentPage() {
	return <AddPage title="Add New Comment" subtitle="Leave a note about a vehicle" render={(defaultVehicleId) => <CommentForm defaultVehicleId={defaultVehicleId} />} />;
}
