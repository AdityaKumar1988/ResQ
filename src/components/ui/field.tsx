import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldProps {
  label?: React.ReactNode;
  id?: string;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  id: explicitId,
  error,
  hint,
  required,
  className,
  labelClassName,
  children,
}: FieldProps) {
  const generatedId = React.useId();
  const id = explicitId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  // Clone single child to inject `id` and accessibility attributes if possible
  const childElement = React.isValidElement<Record<string, unknown>>(children)
    ? React.cloneElement(children, {
        id: (children.props?.id as string) || id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby":
          cn(
            error && errorId,
            hint && hintId,
            (children.props?.["aria-describedby"] as string) || undefined,
          ) || undefined,
      })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label
            htmlFor={id}
            className={cn("text-xs font-medium text-foreground/90 select-none", labelClassName)}
          >
            {label}
            {required && <span className="ml-1 text-p1 font-bold">*</span>}
          </Label>
        </div>
      )}
      {childElement}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive mt-1">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="text-xs text-muted-foreground mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
