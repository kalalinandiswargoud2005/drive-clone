import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Correct path
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { WebSocketProvider } from "@/providers/WebSocketProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Drive Clone",
  description: "A clone of Google Drive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <WebSocketProvider>
          <ThemeProvider>
            <Toaster position="top-center" />
            {children}
          </ThemeProvider>
        </WebSocketProvider>
      </body>
    </html>
  );
}