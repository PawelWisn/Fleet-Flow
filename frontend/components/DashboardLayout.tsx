"use client";

import Link from "next/link";
import { useState } from "react";
import {
	HomeIcon,
	TruckIcon,
	UsersIcon,
	BuildingOfficeIcon,
	CalendarIcon,
	DocumentTextIcon,
	ChartBarIcon,
	Cog6ToothIcon,
	Bars3Icon,
	XMarkIcon,
} from "@heroicons/react/24/outline";

const navigation = [
	{ name: "Dashboard", href: "/", icon: HomeIcon },
	{ name: "Vehicles", href: "/vehicles", icon: TruckIcon },
	{ name: "Reservations", href: "/reservations", icon: CalendarIcon },
	{ name: "Users", href: "/users", icon: UsersIcon },
	{ name: "Companies", href: "/companies", icon: BuildingOfficeIcon },
	{ name: "Documents", href: "/documents", icon: DocumentTextIcon },
	{ name: "Reports", href: "/reports", icon: ChartBarIcon },
	{ name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

interface DashboardLayoutProps {
	children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Mobile sidebar */}
			<div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? "block" : "hidden"}`}>
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
							<h1 className="text-xl font-bold text-primary-600">FleetFlow</h1>
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
							<h1 className="text-2xl font-bold text-primary-600">FleetFlow</h1>
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
				{/* Top bar */}
				<div className="sticky top-0 z-10 bg-white border-b border-gray-200 pl-1 pt-1 pb-1 sm:pl-3 sm:pt-3 sm:pb-3 lg:hidden">
					<button
						type="button"
						className="-ml-0.5 -mt-0.5 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
						onClick={() => setSidebarOpen(true)}
					>
						<Bars3Icon className="h-6 w-6" />
					</button>
				</div>

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
