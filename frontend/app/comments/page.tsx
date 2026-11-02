"use client";

import ResourceList from "@/components/ResourceList";
import { formatDateTime } from "@/components/relationSearch";
import { commentsApi } from "@/services/api";
import { Comment } from "@/types";

export default function CommentsPage() {
	return (
		<ResourceList<Comment>
			title="Comments"
			subtitle="Notes your team left about vehicles"
			basePath="/comments"
			singularName="comment"
			pluralName="comments"
			fetchPage={({ page, size, vehicleId }) => commentsApi.getAll({ page, size, vehicle_id: vehicleId })}
			deleteItem={commentsApi.delete}
			renderCard={(comment) => (
				<>
					<div className="mb-3">
						<h3 className="text-lg font-semibold text-gray-900">
							{comment.vehicle?.brand} {comment.vehicle?.model}
						</h3>
						<p className="text-sm text-gray-500">{comment.vehicle?.registration_number}</p>
					</div>
					<p className="text-sm text-gray-800 whitespace-pre-wrap wrap-break-word line-clamp-4 flex-1">{comment.content}</p>
					<p className="text-xs text-gray-500 mt-4">
						{comment.user?.name} · {formatDateTime(comment.date)}
					</p>
				</>
			)}
		/>
	);
}
