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
  post_code: string;
  address1: string;
  address2: string;
  city: string;
  country: string;
  nip: string;
  vehicles?: Vehicle[];
  contractors?: any[];
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
  created_at: string;
  updated_at: string;
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
  amount: number;
  cost: number;
  odometer: number;
  location: string;
  vehicle_id: number;
  user_id: number;
  vehicle?: Vehicle;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
  vehicle_id: number;
  user_id: number;
  vehicle?: Vehicle;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Insurance {
  id: number;
  policy_number: string;
  provider: string;
  start_date: string;
  end_date: string;
  coverage_amount: number;
  premium: number;
  vehicle_id: number;
  vehicle?: Vehicle;
  created_at: string;
  updated_at: string;
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
  vehicle_id: number;
  user_id: number;
  vehicle?: Vehicle;
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  specialization: string;
  company_id?: number;
  company?: Company;
  created_at: string;
  updated_at: string;
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
  amount: number;
  cost: number;
  odometer: number;
  location: string;
  vehicle_id: number;
}

export interface CreateCompanyForm {
  name: string;
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
