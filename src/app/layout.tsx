import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "protolint — Protocol Buffer Validator",
  description:
    "Validate your .proto files against the Google Protocol Buffer style guide. Free, fast, and open source.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
