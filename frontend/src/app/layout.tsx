


import type { Metadata } from "next";
import "./globals.css";
 
export const metadata: Metadata = {
  title: "CodeScan — AI Code Analyzer",
  description: "Analyze code quality, effort, and get AI-powered improvement suggestions",
};
 
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
 