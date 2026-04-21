"use client";

import { useEffect } from "react";

export function ThemeSync({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return null;
}
