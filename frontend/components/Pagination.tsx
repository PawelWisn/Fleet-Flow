"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
}

export default function Pagination({
	currentPage,
	totalPages,
	totalItems,
	itemsPerPage,
	onPageChange,
	onPageSizeChange,
}: PaginationProps) {
	const getVisiblePages = () => {
		const delta = 2;
		const range = [];
		const rangeWithDots = [];

		for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
			range.push(i);
		}

		if (currentPage - delta > 2) {
			rangeWithDots.push(1, "...");
		} else {
			rangeWithDots.push(1);
		}

		rangeWithDots.push(...range);

		if (currentPage + delta < totalPages - 1) {
			rangeWithDots.push("...", totalPages);
		} else if (totalPages > 1) {
			rangeWithDots.push(totalPages);
		}

		return rangeWithDots;
	};

	const startItem = (currentPage - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPage * itemsPerPage, totalItems);

	if (totalPages <= 1) {
		return null;
	}

	return (
		<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
			<div className="flex-1 flex justify-between sm:hidden">
				<button
					onClick={() => onPageChange(currentPage - 1)}
					disabled={currentPage === 1}
					className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Previous
				</button>
				<button
					onClick={() => onPageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
					className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Next
				</button>
			</div>
			<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
				<div className="flex items-center space-x-4">
					<p className="text-sm text-gray-700">
						Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span>{" "}
						of <span className="font-medium">{totalItems}</span> results
					</p>
					<div className="flex items-center space-x-2">
						<label htmlFor="pageSize" className="text-sm text-gray-700">
							Items per page:
						</label>
						<select
							id="pageSize"
							value={itemsPerPage}
							onChange={(e) => onPageSizeChange(Number(e.target.value))}
							className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
						>
							<option value={10}>10</option>
							<option value={15}>15</option>
							<option value={25}>25</option>
							<option value={50}>50</option>
							<option value={100}>100</option>
						</select>
					</div>
				</div>
				<div>
					<nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
						<button
							onClick={() => onPageChange(currentPage - 1)}
							disabled={currentPage === 1}
							className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span className="sr-only">Previous</span>
							<ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
						</button>
						{getVisiblePages().map((page, index) => (
							<span key={index}>
								{page === "..." ? (
									<span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
										...
									</span>
								) : (
									<button
										onClick={() => onPageChange(page as number)}
										className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
											page === currentPage
												? "z-10 bg-blue-50 border-blue-500 text-blue-600"
												: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
										}`}
									>
										{page}
									</button>
								)}
							</span>
						))}
						<button
							onClick={() => onPageChange(currentPage + 1)}
							disabled={currentPage === totalPages}
							className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<span className="sr-only">Next</span>
							<ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
						</button>
					</nav>
				</div>
			</div>
		</div>
	);
}
