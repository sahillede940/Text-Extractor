"use client";

import React from "react";
import { ThemeProvider } from "./(components)/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="dark min-h-screen bg-background font-sans">{children}</div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
