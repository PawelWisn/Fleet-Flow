"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import LoadingSpinner from "./LoadingSpinner";

interface SearchableDropdownProps<T> {
	value: string;
	onChange: (value: string) => void;
	onSearch: (searchTerm: string, page: number) => Promise<{ items: T[]; hasMore: boolean }>;
	renderOption: (item: T) => { value: string; label: string };
	placeholder: string;
	label: string;
	icon?: React.ReactNode;
	required?: boolean;
}

export default function SearchableDropdown<T>({
	value,
	onChange,
	onSearch,
	renderOption,
	placeholder,
	label,
	icon,
	required = false,
}: SearchableDropdownProps<T>) {
	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
	const [items, setItems] = useState<T[]>([]);
	const [loading, setLoading] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(1);
	const [selectedLabel, setSelectedLabel] = useState("");

	const dropdownRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Debounce search term
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchTerm(searchTerm);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Reset and fetch when search term changes
	useEffect(() => {
		setPage(1);
		setItems([]);
		if (isOpen) {
			fetchItems(1, true);
		}
	}, [debouncedSearchTerm, isOpen]);

	// Update selected label when value changes
	useEffect(() => {
		if (value && items.length > 0) {
			const selectedItem = items.find((item) => renderOption(item).value === value);
			if (selectedItem) {
				setSelectedLabel(renderOption(selectedItem).label);
			}
		} else if (!value) {
			setSelectedLabel("");
		}
	}, [value, items, renderOption]);

	// Load initial item when value is set but not in current items
	useEffect(() => {
		if (value && !selectedLabel && !loading) {
			// If we have a value but no label, search for it specifically
			fetchItems(1, true);
		}
	}, [value, selectedLabel, loading]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const fetchItems = async (pageNum: number, reset = false) => {
		try {
			setLoading(true);
			const response = await onSearch(debouncedSearchTerm, pageNum);

			if (reset) {
				setItems(response.items);
			} else {
				setItems((prev) => [...prev, ...response.items]);
			}

			setHasMore(response.hasMore);
		} catch (error) {
			console.error("Error fetching items:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		if (scrollHeight - scrollTop === clientHeight && hasMore && !loading) {
			const nextPage = page + 1;
			setPage(nextPage);
			fetchItems(nextPage);
		}
	};

	const handleSelect = (item: T) => {
		const option = renderOption(item);
		onChange(option.value);
		setSelectedLabel(option.label);
		setIsOpen(false);
		setSearchTerm("");
	};

	const handleOpen = () => {
		setIsOpen(true);
		if (items.length === 0) {
			fetchItems(1, true);
		}
	};

	return (
		<div className="relative" ref={dropdownRef}>
			<label className="block text-sm font-medium text-gray-700 mb-2">
				{label} {required && <span className="text-red-500">*</span>}
			</label>
			<div className="relative">
				{icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">{icon}</div>}
				<button
					type="button"
					onClick={handleOpen}
					className={`${
						icon ? "pl-10" : "pl-3"
					} pr-10 w-full border border-gray-300 rounded-md shadow-sm py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
						!selectedLabel ? "text-gray-500" : "text-gray-900"
					}`}
				>
					{selectedLabel || placeholder}
				</button>
				<div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
					<ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
				</div>
			</div>

			{isOpen && (
				<div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
					{/* Search input */}
					<div className="p-2 border-b border-gray-200">
						<div className="relative">
							<MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
							<input
								type="text"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								placeholder="Search..."
								className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
					</div>

					{/* Options list */}
					<div ref={listRef} className="max-h-60 overflow-y-auto" onScroll={handleScroll}>
						{items.length === 0 && !loading ? (
							<div className="p-3 text-sm text-gray-500 text-center">
								{debouncedSearchTerm ? "No results found" : "No items available"}
							</div>
						) : (
							items.map((item, index) => {
								const option = renderOption(item);
								return (
									<button
										key={`${option.value}-${index}`}
										type="button"
										onClick={() => handleSelect(item)}
										className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
											option.value === value ? "bg-blue-50 text-blue-700" : "text-gray-900"
										}`}
									>
										{option.label}
									</button>
								);
							})
						)}
						{loading && (
							<div className="p-3 flex justify-center">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
