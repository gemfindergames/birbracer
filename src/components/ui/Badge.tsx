"use client";

import React from "react";

interface BadgeProps {
  variant?: "brand" | "green" | "red" | "yellow";
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function Badge({
  variant = "brand",
  children,
  className = "",
  pulse = false,
}: BadgeProps) {
  const variantClasses = {
    brand: "badge-brand",
    green: "badge-green",
    red: "badge-red",
    yellow: "badge-yellow",
  };

  return (
    <span className={`${variantClasses[variant]} ${className}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
