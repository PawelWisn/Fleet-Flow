import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "FleetFlow - Vehicle Fleet Management",
	description: "Professional vehicle fleet management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<ErrorBoundary>
					{children}
					<Toaster
						position="top-right"
						toastOptions={{
							duration: 4000,
							style: {
								background: "#363636",
								color: "#fff",
							},
						}}
					/>
				</ErrorBoundary>
			</body>
		</html>
	);
}
