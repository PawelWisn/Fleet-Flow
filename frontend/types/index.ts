// API types based on backend models
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'worker';
  company_id?: number;
  company?: Company;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: number;
  name: string;
  description?: string;
  phone?: string;
  post_code: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
  nip: string;
  is_internal: boolean;
  vehicles?: Vehicle[];
  users?: User[];
}

export interface Vehicle {
  id: number;
  id_number: string;
  vin: string;
  weight: number;
  registration_number: string;
  brand: string;
  model: string;
  production_year: number;
  kilometrage: number;
  gearbox_type: 'automatic' | 'manual' | 'semi-automatic';
  availability: 'in use' | 'service' | 'available' | 'decommissioned' | 'booked';
  tire_type: 'summer' | 'winter' | 'all-season';
  company_id?: number;
  company?: Company;
  documents?: unknown[];
  refuels?: unknown[];
  events?: unknown[];
  reservations?: unknown[];
  insurrances?: unknown[];
  comments?: unknown[];
}

export interface Reservation {
  id: number;
  date_from: string;
  date_to: string;
  reservation_date: string;
  vehicle_id: number;
  user_id: number;
  vehicle?: Vehicle;
  user?: User;
}

export interface Refuel {
  id: number;
  date: string;
  fuel_amount: number;
  price: number;
  kilometrage_during_refuel: number;
  gas_station: string;
  vehicle_id: number;
  document_id: number;
  user_id: number;
  vehicle?: Vehicle;
  document?: Document;
  user?: User;
}

export interface RefuelStat {
  month_year: string;
  total_fuel: number;
}

export interface Event {
  id: number;
  event_type: string;
  date: string;
  description: string;
  price?: number | null;
  vehicle_id: number;
  document_id: number;
  company_id: number;
  vehicle?: Vehicle;
  document?: Document | null;
  company?: Company | null;
}

export type InsurranceType = 'OC' | 'AC' | 'OC/AC';

export interface Insurance {
  id: number;
  insurer: string;
  policy_number: string;
  date_from: string;
  date_to: string;
  description: string;
  price: number;
  insurrance_type: InsurranceType;
  vehicle_id: number;
  document_id: number;
  company_id: number;
  vehicle?: Vehicle;
  document?: Document;
  company?: Company | null;
}

export interface Document {
  id: number;
  title: string;
  description: string;
  file_path?: string;
  file_type: string;
  file_size?: number;
  vehicle_id: number;
  user_id: number;
  vehicle?: Vehicle;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  content: string;
  date: string;
  vehicle_id: number;
  user_id: number;
  vehicle?: Vehicle;
  user?: User;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface CreateVehicleForm {
  id_number: string;
  vin: string;
  weight: number;
  registration_number: string;
  brand: string;
  model: string;
  production_year: number;
  kilometrage: number;
  gearbox_type: 'automatic' | 'manual' | 'semi-automatic';
  availability: 'in use' | 'service' | 'available' | 'decommissioned' | 'booked';
  tire_type: 'summer' | 'winter' | 'all-season';
  company_id?: number;
}

export interface CreateReservationForm {
  date_from: string;
  date_to: string;
  vehicle_id: number;
  user_id: number;
}

export interface UpdateReservationForm {
  date_from?: string;
  date_to?: string;
  vehicle_id?: number;
  user_id?: number;
}

export interface CreateRefuelForm {
  date: string;
  fuel_amount: number;
  price: number;
  kilometrage_during_refuel: number;
  gas_station: string;
  vehicle_id: number;
  document_id: number;
  user_id: number;
}

export interface CreateCompanyForm {
  name: string;
  /** Not editable in the form, but sent back on update: the backend resets omitted fields to their defaults */
  description?: string;
  phone?: string;
  is_internal?: boolean;
  post_code: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
  nip: string;
}

export interface CreateDocumentForm {
  title: string;
  description: string;
  file_type: string;
  vehicle_id: number;
  user_id: number;
}

export interface UpdateDocumentForm {
  title?: string;
  description?: string;
  file_type?: string;
  vehicle_id?: number;
  user_id?: number;
}

export interface CreateUserForm {
  email: string;
  name: string;
  password1: string;
  password2: string;
  role: 'admin' | 'manager' | 'worker';
  company_id?: number;
}

export interface UpdateUserForm {
  email?: string;
  name?: string;
  password1?: string;
  password2?: string;
  role?: 'admin' | 'manager' | 'worker';
  company_id?: number;
}

export interface CreateEventForm {
  event_type: string;
  date: string;
  description: string;
  price?: number | null;
  vehicle_id: number;
  document_id: number;
  company_id: number;
}

export interface CreateInsuranceForm {
  insurer: string;
  policy_number: string;
  date_from: string;
  date_to: string;
  description: string;
  price: number;
  insurrance_type: InsurranceType;
  vehicle_id: number;
  document_id: number;
  company_id: number;
}

export interface CreateCommentForm {
  content: string;
  /** Sent back unchanged on edit; the backend would otherwise reset it to "now" */
  date?: string;
  vehicle_id: number;
  user_id: number;
}
