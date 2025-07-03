# FleetFlow Frontend

A modern Next.js frontend for the FleetFlow vehicle fleet management system.

## Features

- **Dashboard**: Overview of fleet statistics and recent activity
- **Vehicle Management**: Add, edit, and track vehicle status
- **Reservations**: Manage vehicle bookings and scheduling
- **User Management**: Handle user accounts and permissions
- **Company Management**: Manage company information
- **Documents**: Upload and manage vehicle-related documents
- **Reports**: Analytics and reporting dashboard

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Heroicons** - Beautiful SVG icons
- **Axios** - HTTP client for API calls
- **React Hook Form** - Forms with validation
- **React Query** - Data fetching and caching

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:8080`.

### Docker Setup

The frontend can also be run using Docker. The Dockerfile is configured to work with the main docker-compose.yml in the project root.

```bash
# From the project root
docker-compose up frontend
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Dashboard page
│   ├── vehicles/          # Vehicle pages
│   ├── reservations/      # Reservation pages
│   └── ...
├── components/            # Reusable React components
│   └── DashboardLayout.tsx
├── lib/                   # Utility libraries
│   └── api.ts            # Axios configuration
├── services/              # API service functions
│   └── api.ts            # API endpoints
├── types/                 # TypeScript type definitions
│   └── index.ts          # API types
└── public/               # Static assets
```

## API Integration

The frontend communicates with the FastAPI backend via REST APIs. The API client is configured in `lib/api.ts` and service functions are defined in `services/api.ts`.

### Authentication

The frontend supports JWT-based authentication. Tokens are stored in localStorage and automatically included in API requests.

### Error Handling

- 401 responses automatically redirect to login
- Network errors are handled gracefully
- Form validation prevents invalid submissions

## Development

### Adding New Pages

1. Create a new page in the `app/` directory
2. Use the `DashboardLayout` component for consistent navigation
3. Add the page to the navigation array in `DashboardLayout.tsx`

### Making API Calls

Use the pre-configured service functions:

```tsx
import { vehiclesApi } from '@/services/api';

// Get all vehicles
const vehicles = await vehiclesApi.getAll();

// Create new vehicle
const newVehicle = await vehiclesApi.create(vehicleData);
```

### Styling

- Use Tailwind CSS classes for styling
- Custom components are defined in `globals.css`
- Follow the existing design patterns for consistency

## Building for Production

```bash
npm run build
npm run start
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (required)

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new data structures
3. Test new features thoroughly
4. Update documentation as needed
