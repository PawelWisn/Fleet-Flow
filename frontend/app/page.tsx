"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { TruckIcon, UsersIcon, CalendarIcon, ChartBarIcon } from "@heroicons/react/24/outline";

const stats = [
	{ name: "Total Vehicles", stat: "71", icon: TruckIcon, change: "12%", changeType: "increase" },
	{ name: "Active Users", stat: "58", icon: UsersIcon, change: "2.02%", changeType: "increase" },
	{ name: "Reservations Today", stat: "24", icon: CalendarIcon, change: "4.05%", changeType: "decrease" },
	{ name: "Available Vehicles", stat: "47", icon: ChartBarIcon, change: "12%", changeType: "increase" },
];

const recentActivity = [
	{
		id: 1,
		type: "reservation",
		title: "New reservation created",
		description: "John Doe reserved Toyota Camry for business trip",
		time: "2 hours ago",
	},
	{
		id: 2,
		type: "maintenance",
		title: "Vehicle maintenance completed",
		description: "BMW X5 - Regular service completed",
		time: "4 hours ago",
	},
	{
		id: 3,
		type: "fuel",
		title: "Fuel refill recorded",
		description: "Honda Civic - 45L diesel fuel added",
		time: "6 hours ago",
	},
];

function classNames(...classes: string[]) {
	return classes.filter(Boolean).join(" ");
}

export default function Dashboard() {
	return (
		<DashboardLayout>
			<div className="space-y-6">
				{/* Page header */}
				<div>
					<h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
					<p className="mt-2 text-sm text-gray-700">
						Welcome to FleetFlow. Here's what's happening with your fleet today.
					</p>
				</div>

				{/* Stats */}
				<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{stats.map((item) => (
						<div key={item.name} className="card">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<item.icon className="h-8 w-8 text-gray-400" aria-hidden="true" />
								</div>
								<div className="ml-5 w-0 flex-1">
									<dl>
										<dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
										<dd className="flex items-baseline">
											<div className="text-2xl font-semibold text-gray-900">{item.stat}</div>
											<div
												className={classNames(
													item.changeType === "increase" ? "text-green-600" : "text-red-600",
													"ml-2 flex items-baseline text-sm font-semibold",
												)}
											>
												{item.changeType === "increase" ? "+" : "-"}
												{item.change}
											</div>
										</dd>
									</dl>
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Two column layout */}
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					{/* Recent Activity */}
					<div className="card">
						<h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
						<div className="flow-root">
							<ul role="list" className="-mb-8">
								{recentActivity.map((event, eventIdx) => (
									<li key={event.id}>
										<div className="relative pb-8">
											{eventIdx !== recentActivity.length - 1 ? (
												<span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
											) : null}
											<div className="relative flex items-start space-x-3">
												<div className="relative">
													<div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center">
														<div className="h-2 w-2 bg-white rounded-full" />
													</div>
												</div>
												<div className="min-w-0 flex-1">
													<div>
														<div className="text-sm">
															<p className="font-medium text-gray-900">{event.title}</p>
														</div>
														<p className="mt-0.5 text-sm text-gray-500">{event.time}</p>
													</div>
													<div className="mt-2 text-sm text-gray-700">
														<p>{event.description}</p>
													</div>
												</div>
											</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* Quick Actions */}
					<div className="card">
						<h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
						<div className="grid grid-cols-1 gap-4">
							<button className="btn-primary w-full text-left flex items-center">
								<TruckIcon className="h-5 w-5 mr-3" />
								Add New Vehicle
							</button>
							<button className="btn-secondary w-full text-left flex items-center">
								<CalendarIcon className="h-5 w-5 mr-3" />
								Create Reservation
							</button>
							<button className="btn-secondary w-full text-left flex items-center">
								<UsersIcon className="h-5 w-5 mr-3" />
								Add New User
							</button>
							<button className="btn-secondary w-full text-left flex items-center">
								<ChartBarIcon className="h-5 w-5 mr-3" />
								View Reports
							</button>
						</div>
					</div>
				</div>
			</div>
		</DashboardLayout>
	);
}
