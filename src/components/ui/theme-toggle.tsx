import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "segmented" | "menu";
  size?: "sm" | "md";
}

export function ThemeToggle({ className, variant = "icon", size = "md" }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    return (
      <div
        role="group"
        aria-label="Theme mode selector"
        className={cn(
          "inline-flex items-center rounded-lg border border-border bg-surface-2 p-0.5 text-xs",
          className,
        )}
      >
        {(
          [
            { id: "dark", label: "Dark", icon: Moon },
            { id: "light", label: "Light", icon: Sun },
            { id: "system", label: "System", icon: Monitor },
          ] as const
        ).map(({ id, label, icon: Icon }) => {
          const active = theme === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTheme(id as Theme)}
              aria-pressed={active}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer",
                active
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface/50",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default: accessible single-button toggle
  const isDark = resolvedTheme === "dark";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonDimensions = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-surface-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer",
        buttonDimensions,
        className,
      )}
    >
      {isDark ? (
        <Sun
          className={cn(
            iconSize,
            "text-amber-400 transition-transform duration-200 hover:rotate-45",
          )}
        />
      ) : (
        <Moon
          className={cn(
            iconSize,
            "text-sky-600 transition-transform duration-200 hover:-rotate-12",
          )}
        />
      )}
    </button>
  );
}
