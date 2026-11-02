import { companiesApi, documentsApi, usersApi, vehiclesApi } from "@/services/api";
import { Company, Document, User, Vehicle } from "@/types";

type SearchResult<T> = { items: T[]; hasMore: boolean };

const PAGE_SIZE = 20;

const buildParams = (searchTerm: string, page: number) => ({ page, size: PAGE_SIZE, ...(searchTerm && { search: searchTerm }) });

export const searchVehicles = async (searchTerm: string, page: number): Promise<SearchResult<Vehicle>> => {
	const response = await vehiclesApi.getAll(buildParams(searchTerm, page));
	return { items: response.items || [], hasMore: response.page < response.pages };
};

export const searchUsers = async (searchTerm: string, page: number): Promise<SearchResult<User>> => {
	const response = await usersApi.getAll(buildParams(searchTerm, page));
	return { items: response.items || [], hasMore: response.page < response.pages };
};

export const searchDocuments = async (searchTerm: string, page: number): Promise<SearchResult<Document>> => {
	const response = await documentsApi.getAll(buildParams(searchTerm, page));
	return { items: response.items || [], hasMore: response.page < response.pages };
};

export const searchCompanies = async (searchTerm: string, page: number): Promise<SearchResult<Company>> => {
	const response = await companiesApi.getAll(buildParams(searchTerm, page));
	return { items: response.items || [], hasMore: response.page < response.pages };
};

export const vehicleLabel = (vehicle: Pick<Vehicle, "registration_number" | "brand" | "model">) =>
	`${vehicle.registration_number} - ${vehicle.brand} ${vehicle.model}`;

export const userLabel = (user: Pick<User, "name" | "email">) => `${user.name} (${user.email})`;

export const formatDate = (value?: string | null) =>
	value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-";

export const formatDateTime = (value?: string | null) =>
	value
		? new Date(value).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
		: "-";

export const formatCurrency = (amount?: number | null) =>
	amount === null || amount === undefined ? "-" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

/** Value for <input type="datetime-local"> from an API datetime string */
export const toDateTimeInput = (value?: string | null) => (value ? value.slice(0, 16) : "");
