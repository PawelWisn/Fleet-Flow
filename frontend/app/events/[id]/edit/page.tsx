"use client";

import EditLoader from "@/components/EditLoader";
import EventForm from "@/components/EventForm";
import { eventsApi } from "@/services/api";
import { Event } from "@/types";

export default function EditEventPage() {
	return (
		<EditLoader<Event> title="Edit Event" subtitle="Update event information" resourceName="Event" fetchItem={eventsApi.getById}>
			{(event) => <EventForm event={event} isEdit />}
		</EditLoader>
	);
}
