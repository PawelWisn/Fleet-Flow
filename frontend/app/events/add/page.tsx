"use client";

import AddPage from "@/components/AddPage";
import EventForm from "@/components/EventForm";

export default function AddEventPage() {
	return <AddPage title="Add New Event" subtitle="Record a vehicle event" render={(defaultVehicleId) => <EventForm defaultVehicleId={defaultVehicleId} />} />;
}
