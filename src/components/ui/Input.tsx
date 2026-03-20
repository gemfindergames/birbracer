"use client";

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`input-field ${
          error
            ? "!border-red-500 !ring-red-500/50 focus:!border-red-500 focus:!ring-red-500/50"
            : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400 animate-slide-up">
          {error}
        </p>
      )}
    </div>
  );
}
