import { api } from '@/lib/api';
import {
  User,
  Vehicle,
  Company,
  Reservation,
  Refuel,
  Event,
  Insurance,
  Document,
  Comment,
  Contractor,
  PaginatedResponse,
  CreateVehicleForm,
  CreateReservationForm,
  CreateRefuelForm
} from '@/types';

// Users API
export const usersApi = {
  getAll: (): Promise<PaginatedResponse<User>> => api.get('/users').then(res => res.data),
  getById: (id: number): Promise<User> => api.get(`/users/${id}`).then(res => res.data),
  create: (data: Partial<User>): Promise<User> => api.post('/users', data).then(res => res.data),
  update: (id: number, data: Partial<User>): Promise<User> => api.put(`/users/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/users/${id}`).then(res => res.data),
};

// Vehicles API
export const vehiclesApi = {
  getAll: (): Promise<PaginatedResponse<Vehicle>> => api.get('/vehicles').then(res => res.data),
  getById: (id: number): Promise<Vehicle> => api.get(`/vehicles/${id}`).then(res => res.data),
  create: (data: CreateVehicleForm): Promise<Vehicle> => api.post('/vehicles', data).then(res => res.data),
  update: (id: number, data: Partial<Vehicle>): Promise<Vehicle> => api.put(`/vehicles/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/vehicles/${id}`).then(res => res.data),
  getAvailable: (): Promise<Vehicle[]> => api.get('/vehicles?availability=available').then(res => res.data),
};

// Companies API
export const companiesApi = {
  getAll: (): Promise<PaginatedResponse<Company>> => api.get('/companies').then(res => res.data),
  getById: (id: number): Promise<Company> => api.get(`/companies/${id}`).then(res => res.data),
  create: (data: Partial<Company>): Promise<Company> => api.post('/companies', data).then(res => res.data),
  update: (id: number, data: Partial<Company>): Promise<Company> => api.put(`/companies/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/companies/${id}`).then(res => res.data),
};

// Reservations API
export const reservationsApi = {
  getAll: (): Promise<PaginatedResponse<Reservation>> => api.get('/reservations').then(res => res.data),
  getById: (id: number): Promise<Reservation> => api.get(`/reservations/${id}`).then(res => res.data),
  create: (data: CreateReservationForm): Promise<Reservation> => api.post('/reservations', data).then(res => res.data),
  update: (id: number, data: Partial<Reservation>): Promise<Reservation> => api.put(`/reservations/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/reservations/${id}`).then(res => res.data),
  getByUser: (userId: number): Promise<Reservation[]> => api.get(`/reservations?user_id=${userId}`).then(res => res.data),
  getByVehicle: (vehicleId: number): Promise<Reservation[]> => api.get(`/reservations?vehicle_id=${vehicleId}`).then(res => res.data),
};

// Refuels API
export const refuelsApi = {
  getAll: (): Promise<PaginatedResponse<Refuel>> => api.get('/refuels').then(res => res.data),
  getById: (id: number): Promise<Refuel> => api.get(`/refuels/${id}`).then(res => res.data),
  create: (data: CreateRefuelForm): Promise<Refuel> => api.post('/refuels', data).then(res => res.data),
  update: (id: number, data: Partial<Refuel>): Promise<Refuel> => api.put(`/refuels/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/refuels/${id}`).then(res => res.data),
  getByVehicle: (vehicleId: number): Promise<Refuel[]> => api.get(`/refuels?vehicle_id=${vehicleId}`).then(res => res.data),
};

// Events API
export const eventsApi = {
  getAll: (): Promise<PaginatedResponse<Event>> => api.get('/events').then(res => res.data),
  getById: (id: number): Promise<Event> => api.get(`/events/${id}`).then(res => res.data),
  create: (data: Partial<Event>): Promise<Event> => api.post('/events', data).then(res => res.data),
  update: (id: number, data: Partial<Event>): Promise<Event> => api.put(`/events/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/events/${id}`).then(res => res.data),
  getByVehicle: (vehicleId: number): Promise<Event[]> => api.get(`/events?vehicle_id=${vehicleId}`).then(res => res.data),
};

// Insurance API
export const insuranceApi = {
  getAll: (): Promise<PaginatedResponse<Insurance>> => api.get('/insurances').then(res => res.data),
  getById: (id: number): Promise<Insurance> => api.get(`/insurances/${id}`).then(res => res.data),
  create: (data: Partial<Insurance>): Promise<Insurance> => api.post('/insurances', data).then(res => res.data),
  update: (id: number, data: Partial<Insurance>): Promise<Insurance> => api.put(`/insurances/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/insurances/${id}`).then(res => res.data),
  getByVehicle: (vehicleId: number): Promise<Insurance[]> => api.get(`/insurances?vehicle_id=${vehicleId}`).then(res => res.data),
};

// Documents API
export const documentsApi = {
  getAll: (): Promise<PaginatedResponse<Document>> => api.get('/documents').then(res => res.data),
  getById: (id: number): Promise<Document> => api.get(`/documents/${id}`).then(res => res.data),
  create: (data: FormData): Promise<Document> => api.post('/documents', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(res => res.data),
  update: (id: number, data: Partial<Document>): Promise<Document> => api.put(`/documents/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/documents/${id}`).then(res => res.data),
  getByVehicle: (vehicleId: number): Promise<Document[]> => api.get(`/documents?vehicle_id=${vehicleId}`).then(res => res.data),
  download: (id: number): Promise<Blob> => api.get(`/documents/${id}/download`, { responseType: 'blob' }).then(res => res.data),
};

// Comments API
export const commentsApi = {
  getAll: (): Promise<PaginatedResponse<Comment>> => api.get('/comments').then(res => res.data),
  getById: (id: number): Promise<Comment> => api.get(`/comments/${id}`).then(res => res.data),
  create: (data: Partial<Comment>): Promise<Comment> => api.post('/comments', data).then(res => res.data),
  update: (id: number, data: Partial<Comment>): Promise<Comment> => api.put(`/comments/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/comments/${id}`).then(res => res.data),
  getByVehicle: (vehicleId: number): Promise<Comment[]> => api.get(`/comments?vehicle_id=${vehicleId}`).then(res => res.data),
};

// Contractors API
export const contractorsApi = {
  getAll: (): Promise<PaginatedResponse<Contractor>> => api.get('/contractors').then(res => res.data),
  getById: (id: number): Promise<Contractor> => api.get(`/contractors/${id}`).then(res => res.data),
  create: (data: Partial<Contractor>): Promise<Contractor> => api.post('/contractors', data).then(res => res.data),
  update: (id: number, data: Partial<Contractor>): Promise<Contractor> => api.put(`/contractors/${id}`, data).then(res => res.data),
  delete: (id: number): Promise<void> => api.delete(`/contractors/${id}`).then(res => res.data),
};
