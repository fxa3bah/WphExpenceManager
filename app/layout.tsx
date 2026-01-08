import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WPH Expense Manager",
  description: "Fast and efficient expense tracking for Westpoint Home",
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased pb-16">
        {children}
      </body>
    </html>
  );
}
