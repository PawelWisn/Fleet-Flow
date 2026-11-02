"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { TruckIcon, UserIcon } from "@heroicons/react/24/outline";
import { commentsApi } from "@/services/api";
import { getErrorMessage } from "@/services/errors";
import { useAuth } from "@/contexts/AuthContext";
import { Comment, CreateCommentForm, User, Vehicle } from "@/types";
import LoadingSpinner from "@/components/LoadingSpinner";
import SearchableDropdown from "@/components/SearchableDropdown";
import { searchUsers, searchVehicles, userLabel, vehicleLabel } from "@/components/relationSearch";

interface CommentFormProps {
	comment?: Comment;
	isEdit?: boolean;
	defaultVehicleId?: number;
}

const MAX_LENGTH = 1000;

export default function CommentForm({ comment, isEdit = false, defaultVehicleId }: CommentFormProps) {
	const router = useRouter();
	const { user: currentUser } = useAuth();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<{ content?: string; vehicle_id?: string; user_id?: string }>({});
	const [formData, setFormData] = useState({
		content: comment?.content || "",
		vehicle_id: (comment?.vehicle_id ?? defaultVehicleId)?.toString() || "",
		user_id: (comment?.user_id ?? currentUser?.id)?.toString() || "",
	});
	const [labels, setLabels] = useState({
		vehicle: comment?.vehicle ? vehicleLabel(comment.vehicle) : "",
		user: comment?.user ? userLabel(comment.user) : currentUser && !comment ? userLabel(currentUser) : "",
	});

	// Workers can only comment as themselves (enforced by the backend as well)
	const canChooseUser = currentUser?.role !== "worker";

	const handleChange = (field: keyof typeof formData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		setErrors((prev) => ({ ...prev, [field]: undefined }));
	};

	const validate = (): boolean => {
		const newErrors: typeof errors = {};
		if (!formData.content.trim()) newErrors.content = "Comment cannot be empty";
		if (formData.content.length > MAX_LENGTH) newErrors.content = `Comment must be at most ${MAX_LENGTH} characters`;
		if (!formData.vehicle_id) newErrors.vehicle_id = "Vehicle is required";
		if (!formData.user_id) newErrors.user_id = "User is required";
		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validate()) return;

		const payload: CreateCommentForm = {
			content: formData.content.trim(),
			...(isEdit && comment && { date: comment.date }),
			vehicle_id: parseInt(formData.vehicle_id),
			user_id: parseInt(formData.user_id),
		};

		setLoading(true);
		try {
			if (isEdit && comment) {
				await commentsApi.update(comment.id, payload);
				toast.success("Comment updated successfully");
			} else {
				await commentsApi.create(payload);
				toast.success("Comment created successfully");
			}
			router.push("/comments");
		} catch (error: any) {
			console.error("Error saving comment:", error);
			toast.error(getErrorMessage(error, isEdit ? "Failed to update comment" : "Failed to create comment"));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-3xl mx-auto">
			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="card">
					<div className="mb-6">
						<h2 className="text-xl font-semibold text-gray-900">{isEdit ? "Edit Comment" : "Add New Comment"}</h2>
						<p className="text-sm text-gray-600">Leave a note about a vehicle for your team.</p>
					</div>

					<div className="form-group">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<SearchableDropdown<Vehicle>
									value={formData.vehicle_id}
									valueLabel={labels.vehicle}
									onChange={(value, label) => {
										handleChange("vehicle_id", value);
										setLabels((prev) => ({ ...prev, vehicle: label }));
									}}
									onSearch={searchVehicles}
									renderOption={(vehicle) => ({ value: vehicle.id.toString(), label: vehicleLabel(vehicle) })}
									placeholder="Select a vehicle"
									label="Vehicle"
									icon={<TruckIcon className="h-5 w-5" />}
									required
								/>
								{errors.vehicle_id && <p className="error">{errors.vehicle_id}</p>}
							</div>
							<div>
								{canChooseUser ? (
									<SearchableDropdown<User>
										value={formData.user_id}
										valueLabel={labels.user}
										onChange={(value, label) => {
											handleChange("user_id", value);
											setLabels((prev) => ({ ...prev, user: label }));
										}}
										onSearch={searchUsers}
										renderOption={(user) => ({ value: user.id.toString(), label: userLabel(user) })}
										placeholder="Select a user"
										label="Author"
										icon={<UserIcon className="h-5 w-5" />}
										required
									/>
								) : (
									<>
										<label className="block text-sm font-medium text-gray-700 mb-2">Author</label>
										<p className="py-2 text-sm text-gray-900">{labels.user || currentUser?.name}</p>
									</>
								)}
								{errors.user_id && <p className="error">{errors.user_id}</p>}
							</div>
							<div className="md:col-span-2">
								<label className="label-required">Comment</label>
								<textarea
									rows={5}
									maxLength={MAX_LENGTH}
									value={formData.content}
									onChange={(e) => handleChange("content", e.target.value)}
									className={`input ${errors.content ? "border-red-500" : ""}`}
									placeholder="Write your comment..."
								/>
								<p className="text-xs text-gray-500 mt-1 text-right">
									{formData.content.length}/{MAX_LENGTH}
								</p>
								{errors.content && <p className="error">{errors.content}</p>}
							</div>
						</div>
					</div>

					<div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
						<button type="button" onClick={() => router.push("/comments")} disabled={loading} className="btn-secondary">
							Cancel
						</button>
						<button type="submit" disabled={loading} className="btn-primary">
							{loading ? (
								<>
									<LoadingSpinner />
									{isEdit ? "Updating..." : "Creating..."}
								</>
							) : isEdit ? (
								"Update Comment"
							) : (
								"Add Comment"
							)}
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
