"use client";

import React from "react";

export function ThemeProvider({
  children
}: {
  children: React.ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}) {
  return children;
}