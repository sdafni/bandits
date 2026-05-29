"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormFieldProps = {
  id: string;
  label: ReactNode;
  error?: string;
  optional?: boolean | string;
  required?: boolean;
  children: ReactElement<{ id?: string; className?: string; "aria-invalid"?: boolean; "aria-describedby"?: string }>;
};

export function FormField({ id, label, error, optional, required, children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-2" data-field={id}>
      <label className="block space-y-2" htmlFor={id}>
        <span className="form-label">
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
          {optional ? <span className="font-normal text-slate-500"> ({optional === true ? "optional" : optional})</span> : null}
        </span>
        {children}
      </label>
      {error ? (
        <p className="text-sm font-medium text-rose-700" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function fieldControlClassName(hasError: boolean, className?: string) {
  return cn("input", hasError && "input--error", className);
}
