import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        // Semantic-status variants render as subtle badges (Architecture 01 §9).
        positive:
          "border-transparent bg-[hsl(var(--positive)/0.14)] text-[hsl(var(--positive))]",
        attention:
          "border-transparent bg-[hsl(var(--attention)/0.14)] text-[hsl(var(--attention))]",
        negative:
          "border-transparent bg-[hsl(var(--negative)/0.14)] text-[hsl(var(--negative))]",
        progress:
          "border-transparent bg-[hsl(var(--progress)/0.14)] text-[hsl(var(--progress))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
