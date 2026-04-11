import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-transparent bg-destructive text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = ComponentProps<"div"> & VariantProps<typeof badgeVariants>;

const Badge: Component<BadgeProps> = props => {
  const [local, others] = splitProps(props, ["class", "variant"]);
  return <div class={cn(badgeVariants({ variant: local.variant }), local.class)} {...others} />;
};

export { Badge, badgeVariants };
