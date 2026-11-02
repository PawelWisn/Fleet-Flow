"use client";

import Link from "next/link";
import ResourceDetail, { DetailCard, DetailField } from "@/components/ResourceDetail";
import { formatDateTime } from "@/components/relationSearch";
import { commentsApi } from "@/services/api";
import { Comment } from "@/types";

export default function CommentDetailsPage() {
	return (
		<ResourceDetail<Comment>
			title="Comment Details"
			subtitle="View comment"
			basePath="/comments"
			singularName="comment"
			pluralName="Comments"
			fetchItem={commentsApi.getById}
			deleteItem={commentsApi.delete}
		>
			{(comment) => (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<DetailCard title="Comment">
						<DetailField label="Content">{comment.content}</DetailField>
						<DetailField label="Posted">{formatDateTime(comment.date)}</DetailField>
					</DetailCard>
					<DetailCard title="Related Records">
						<DetailField label="Vehicle">
							{comment.vehicle && (
								<Link href={`/vehicles/${comment.vehicle.id}`} className="text-primary-600 hover:underline">
									{comment.vehicle.brand} {comment.vehicle.model} ({comment.vehicle.registration_number})
								</Link>
							)}
						</DetailField>
						<DetailField label="Author">{comment.user && `${comment.user.name} (${comment.user.email})`}</DetailField>
					</DetailCard>
				</div>
			)}
		</ResourceDetail>
	);
}
