"use client";

import CommentForm from "@/components/CommentForm";
import EditLoader from "@/components/EditLoader";
import { commentsApi } from "@/services/api";
import { Comment } from "@/types";

export default function EditCommentPage() {
	return (
		<EditLoader<Comment> title="Edit Comment" subtitle="Update your comment" resourceName="Comment" fetchItem={commentsApi.getById}>
			{(comment) => <CommentForm comment={comment} isEdit />}
		</EditLoader>
	);
}
