"use client";

import Link from "next/link";
import ResourceList from "@/components/ResourceList";
import { formatCurrency, formatDateTime } from "@/components/relationSearch";
import { eventsApi } from "@/services/api";
import { Event } from "@/types";

export default function EventsPage() {
	return (
		<ResourceList<Event>
			title="Events"
			subtitle="Maintenance, repairs and other vehicle events"
			basePath="/events"
			singularName="event"
			pluralName="events"
			fetchPage={({ page, size, vehicleId }) => eventsApi.getAll({ page, size, vehicle_id: vehicleId })}
			deleteItem={eventsApi.delete}
			renderCard={(event) => (
				<>
					<div className="mb-4">
						<h3 className="text-lg font-semibold text-gray-900 capitalize">{event.event_type}</h3>
						<p className="text-sm text-gray-500">
							{event.vehicle?.brand} {event.vehicle?.model} · {event.vehicle?.registration_number}
						</p>
					</div>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Date:</span>
							<span className="text-sm font-medium">{formatDateTime(event.date)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Price:</span>
							<span className="text-sm font-medium">{formatCurrency(event.price)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-gray-600">Document:</span>
							{event.document ? (
								<Link href={`/documents/${event.document.id}`} className="text-sm font-medium text-primary-600 hover:underline truncate ml-2">
									{event.document.title}
								</Link>
							) : (
								<span className="text-sm font-medium">-</span>
							)}
						</div>
						<p className="text-sm text-gray-600 line-clamp-2 pt-2">{event.description}</p>
					</div>
				</>
			)}
		/>
	);
}
