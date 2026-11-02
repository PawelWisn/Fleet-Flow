"use client";

import Link from "next/link";
import ResourceDetail, { DetailCard, DetailField } from "@/components/ResourceDetail";
import { formatCurrency, formatDateTime } from "@/components/relationSearch";
import { eventsApi } from "@/services/api";
import { Event } from "@/types";

export default function EventDetailsPage() {
	return (
		<ResourceDetail<Event>
			title="Event Details"
			subtitle="View event information"
			basePath="/events"
			singularName="event"
			pluralName="Events"
			fetchItem={eventsApi.getById}
			deleteItem={eventsApi.delete}
		>
			{(event) => (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<DetailCard title="Event">
						<DetailField label="Type">{event.event_type}</DetailField>
						<DetailField label="Date">{formatDateTime(event.date)}</DetailField>
						<DetailField label="Price">{formatCurrency(event.price)}</DetailField>
						<DetailField label="Description">{event.description}</DetailField>
					</DetailCard>
					<DetailCard title="Related Records">
						<DetailField label="Vehicle">
							{event.vehicle && (
								<Link href={`/vehicles/${event.vehicle.id}`} className="text-primary-600 hover:underline">
									{event.vehicle.brand} {event.vehicle.model} ({event.vehicle.registration_number})
								</Link>
							)}
						</DetailField>
						<DetailField label="Document">
							{event.document && (
								<Link href={`/documents/${event.document.id}`} className="text-primary-600 hover:underline">
									{event.document.title}
								</Link>
							)}
						</DetailField>
						<DetailField label="Company">{event.company?.name}</DetailField>
					</DetailCard>
				</div>
			)}
		</ResourceDetail>
	);
}
