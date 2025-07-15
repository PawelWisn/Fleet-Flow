"use client";

import Link from "next/link";
import { useState } from "react";
import {
	TruckIcon,
	UsersIcon,
	BuildingOfficeIcon,
	CalendarIcon,
	DocumentTextIcon,
	ChartBarIcon,
	Cog6ToothIcon,
	Bars3Icon,
	XMarkIcon,
	BeakerIcon,
} from "@heroicons/react/24/outline";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/TopBar";

const allNavigation = [
	{ name: "Vehicles", href: "/vehicles", icon: TruckIcon, roles: ["worker", "manager", "admin"] },
	{ name: "Reservations", href: "/reservations", icon: CalendarIcon, roles: ["worker", "manager", "admin"] },
	{ name: "Refuels", href: "/refuels", icon: BeakerIcon, roles: ["worker", "manager", "admin"] },
	{ name: "Users", href: "/users", icon: UsersIcon, roles: ["manager", "admin"] },
	{ name: "Companies", href: "/companies", icon: BuildingOfficeIcon, roles: ["manager", "admin"] },
	{ name: "Documents", href: "/documents", icon: DocumentTextIcon, roles: ["worker", "manager", "admin"] },
	{ name: "Analytics", href: "/reports", icon: ChartBarIcon, roles: ["manager", "admin"] },
	{ name: "Settings", href: "/settings", icon: Cog6ToothIcon, roles: ["admin"] },
];

interface DashboardLayoutProps {
	children: React.ReactNode;
	title?: string;
	subtitle?: string;
}

function DashboardLayoutContent({ children, title, subtitle }: DashboardLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const { user, loading } = useAuth();

	// Filter navigation based on user role
	const navigation = allNavigation.filter((item) => {
		if (!user) return false;
		return item.roles.includes(user.role);
	});

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Mobile sidebar */}
			<div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
				<div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
				<div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
					<div className="absolute top-0 right-0 -mr-12 pt-2">
						<button
							type="button"
							className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
							onClick={() => setSidebarOpen(false)}
						>
							<XMarkIcon className="h-6 w-6 text-white" />
						</button>
					</div>
					<div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
						<div className="flex flex-shrink-0 items-center px-4">
							<Link href="/dashboard" className="hover:opacity-80 transition-opacity">
								<h1 className="text-xl font-bold text-primary-600 cursor-pointer">FleetFlow</h1>
							</Link>
						</div>
						<nav className="mt-5 space-y-1 px-2">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
								>
									<item.icon className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
									{item.name}
								</Link>
							))}
						</nav>
					</div>
				</div>
			</div>

			{/* Desktop sidebar */}
			<div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
				<div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
					<div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
						<div className="flex flex-shrink-0 items-center px-4">
							<Link href="/dashboard" className="hover:opacity-80 transition-opacity">
								<h1 className="text-2xl font-bold text-primary-600 cursor-pointer">FleetFlow</h1>
							</Link>
						</div>
						<nav className="mt-5 flex-1 space-y-1 bg-white px-2">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
								>
									<item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
									{item.name}
								</Link>
							))}
						</nav>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div className="lg:pl-64 flex flex-col flex-1">
				{/* Mobile menu button - only visible on mobile */}
				<div className="sticky top-0 z-40 bg-white border-b border-gray-200 pl-1 pt-1 pb-1 sm:pl-3 sm:pt-3 sm:pb-3 lg:hidden">
					<button
						type="button"
						className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
						onClick={() => setSidebarOpen(true)}
					>
						<Bars3Icon className="h-6 w-6" />
					</button>
				</div>

				{/* Top Bar - visible on all screen sizes */}
				<TopBar title={title} subtitle={subtitle} />

				{/* Page content */}
				<main className="flex-1">
					<div className="py-6">
						<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
					</div>
				</main>
			</div>
		</div>
	);
}

export default function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
	return (
		<AuthProvider>
			<DashboardLayoutContent title={title} subtitle={subtitle}>
				{children}
			</DashboardLayoutContent>
		</AuthProvider>
	);
}
