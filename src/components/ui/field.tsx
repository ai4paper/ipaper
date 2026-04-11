import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const FieldGroup: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("flex flex-col gap-4", local.class)} {...others} />;
};

const Field: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "flex flex-col gap-2 [&[data-disabled]]:opacity-60 [&[data-invalid]_label]:text-destructive",
        local.class,
      )}
      {...others}
    />
  );
};

const FieldLabel: Component<ComponentProps<"label">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <label class={cn("text-sm font-medium text-foreground", local.class)} {...others} />;
};

const FieldDescription: Component<ComponentProps<"p">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <p class={cn("text-sm text-muted-foreground", local.class)} {...others} />;
};

export { Field, FieldDescription, FieldGroup, FieldLabel };
