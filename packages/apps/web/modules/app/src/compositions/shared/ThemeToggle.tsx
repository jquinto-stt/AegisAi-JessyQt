import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={`relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-gray-500 transition-colors hover:bg-slate-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex-none ${className}`}
      title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
    >
      {isDarkMode ? (
        <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20 transition-transform duration-300 transform rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform duration-300 transform rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
}
