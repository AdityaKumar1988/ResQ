import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed select-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 active:scale-[0.99]",
        primary:
          "bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 active:scale-[0.99]",
        emergency:
          "bg-p1 text-p1-foreground font-semibold shadow-sm hover:brightness-110 active:scale-[0.99]",
        secondary:
          "bg-surface-2 text-foreground border border-border hover:bg-surface-3 hover:text-foreground active:scale-[0.99]",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface-2 hover:text-foreground active:scale-[0.99]",
        ghost: "bg-transparent text-foreground hover:bg-surface-2 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.99]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 min-h-[36px] px-3.5 text-sm rounded-md [&_svg]:size-4",
        md: "h-9 min-h-[36px] px-3.5 text-sm rounded-md [&_svg]:size-4",
        sm: "h-7 min-h-[28px] px-2.5 text-xs rounded-md [&_svg]:size-3.5",
        lg: "h-12 min-h-[48px] px-5 text-base font-semibold rounded-lg [&_svg]:size-5",
        xl: "h-14 min-h-[56px] px-6 text-lg font-bold rounded-lg [&_svg]:size-6",
        icon: "h-9 w-9 min-h-[36px] min-w-[36px] rounded-md p-0 [&_svg]:size-4",
        "icon-sm": "h-7 w-7 min-h-[28px] min-w-[28px] rounded-md p-0 [&_svg]:size-3.5",
        "icon-lg": "h-12 w-12 min-h-[48px] min-w-[48px] rounded-lg p-0 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
