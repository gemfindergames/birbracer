"use client";

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  className = "",
  hover = false,
  glow = false,
  onClick,
}: CardProps) {
  return (
    <div
      className={`rounded-2xl p-6 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 shadow-sm transition-all duration-300 ${
        hover
          ? "hover:shadow-lg hover:border-brand-500/30 hover:-translate-y-0.5 cursor-pointer"
          : ""
      } ${glow ? "glow-brand" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
