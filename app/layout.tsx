import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Khan AI",
  description: "Chat with AI and prepare video generation prompts."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}