import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "secondary";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-primary/20 bg-primary/10 text-primary",
  outline: "bg-background",
  secondary: "border-secondary bg-secondary text-secondary-foreground"
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}
