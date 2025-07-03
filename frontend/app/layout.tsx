import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "FleetFlow - Vehicle Fleet Management",
	description: "Professional vehicle fleet management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<ErrorBoundary>{children}</ErrorBoundary>
			</body>
		</html>
	);
}
