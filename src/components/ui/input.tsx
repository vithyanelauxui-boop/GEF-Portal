import * as React from "react";

import { cn } from "@/lib/utils";

// Shopify Polaris text field: ~40px tall, 8px radius, hairline border with a
// slightly darker bottom edge, 14px body. Focus lifts to a 2px ring.
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "p-field flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-[14px] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-0 focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-80 disabled:bg-secondary disabled:shadow-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
