import type { Comment, Company, Document, Event, Insurance, Refuel, Reservation, User, Vehicle } from "@/types";

export const page = <T,>(items: T[], overrides: Partial<{ total: number; page: number; size: number; pages: number }> = {}) => ({
	items,
	total: items.length,
	page: 1,
	size: 15,
	pages: items.length ? 1 : 0,
	...overrides,
});

export const company = (o: Partial<Company> = {}): Company => ({
	id: 1,
	name: "Alpha Logistics",
	description: "",
	phone: "",
	post_code: "00-001",
	address1: "Main St 1",
	address2: "",
	city: "Warsaw",
	country: "Poland",
	nip: "1111111111",
	is_internal: true,
	...o,
});

export const user = (o: Partial<User> = {}): User => ({
	id: 3,
	email: "worker@example.com",
	name: "Worker Alpha",
	role: "worker",
	company_id: 1,
	created_at: "2026-01-01T00:00:00",
	updated_at: "2026-01-01T00:00:00",
	...o,
});

export const vehicle = (o: Partial<Vehicle> = {}): Vehicle => ({
	id: 1,
	id_number: "FL001",
	vin: "WVWZZZ1JZXW000001",
	weight: 3500,
	registration_number: "AAA-111",
	brand: "Ford",
	model: "Transit",
	production_year: 2020,
	kilometrage: 45000,
	gearbox_type: "manual",
	availability: "available",
	tire_type: "all-season",
	company_id: 1,
	company: company(),
	...o,
});

export const document = (o: Partial<Document> = {}): Document => ({
	id: 5,
	title: "Registration card",
	description: "Official paper",
	file_type: "registration",
	file_path: "uploads/documents/abc.pdf",
	file_size: 2048,
	vehicle_id: 1,
	user_id: 3,
	vehicle: vehicle(),
	user: user(),
	created_at: "2026-02-01T10:00:00",
	updated_at: "2026-02-01T10:00:00",
	...o,
});

export const reservation = (o: Partial<Reservation> = {}): Reservation => ({
	id: 4,
	date_from: "2026-11-01T00:00:00",
	date_to: "2026-11-03T00:00:00",
	reservation_date: "2026-10-29T10:00:00",
	vehicle_id: 1,
	user_id: 3,
	vehicle: vehicle(),
	user: user(),
	...o,
});

export const refuel = (o: Partial<Refuel> = {}): Refuel => ({
	id: 8,
	date: "2026-03-10T08:00:00",
	fuel_amount: 40,
	price: 260,
	kilometrage_during_refuel: 12345,
	gas_station: "Orlen",
	vehicle_id: 1,
	document_id: 5,
	user_id: 3,
	vehicle: vehicle(),
	document: document(),
	user: user(),
	...o,
});

export const event = (o: Partial<Event> = {}): Event => ({
	id: 9,
	event_type: "maintenance",
	date: "2026-04-01T09:30:00",
	description: "Oil change",
	price: 150,
	vehicle_id: 1,
	document_id: 5,
	company_id: 1,
	vehicle: vehicle(),
	document: document(),
	company: company(),
	...o,
});

export const insurance = (o: Partial<Insurance> = {}): Insurance => ({
	id: 6,
	insurer: "PZU",
	policy_number: "POL-1",
	date_from: "2026-01-01T00:00:00",
	date_to: "2027-01-01T00:00:00",
	description: "Full cover",
	price: 1200,
	insurrance_type: "OC/AC",
	vehicle_id: 1,
	document_id: 5,
	company_id: 1,
	vehicle: vehicle(),
	document: document(),
	company: company(),
	...o,
});

export const comment = (o: Partial<Comment> = {}): Comment => ({
	id: 11,
	content: "Tyres need checking",
	date: "2026-05-05T12:00:00",
	vehicle_id: 1,
	user_id: 3,
	vehicle: vehicle(),
	user: user(),
	...o,
});
