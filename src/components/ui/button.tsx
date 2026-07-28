import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Shopify Polaris buttons: 8px radius, compact, with Polaris's signature
// inset "depth" shadow on the primary/secondary fills.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        // Primary: near-black brand fill with inset highlight
        default:
          "bg-primary text-primary-foreground shadow-[0_-1px_0_0_rgba(0,0,0,0.8)_inset,0_1px_0_0_rgba(0,0,0,0.05)] hover:bg-[hsl(var(--primary-hover))]",
        // Secondary (default Polaris button): white with hairline + faint depth
        secondary:
          "bg-card text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.08)_inset,0_-1px_0_0_#b5b5b5_inset,0_1px_0_0_rgba(0,0,0,0.04)] hover:bg-[#fafafa]",
        outline:
          "bg-card text-foreground border border-[hsl(var(--border-strong))] hover:bg-secondary",
        // Tertiary / plain text button
        plain: "bg-transparent text-foreground hover:bg-secondary rounded-lg",
        ghost: "bg-transparent text-foreground hover:bg-secondary rounded-lg",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_-1px_0_0_rgba(0,0,0,0.25)_inset] hover:brightness-95",
        link: "text-[hsl(var(--info-text))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5 text-[13px]",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-10 px-4 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
