import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const Card: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "rounded-xl border border-border/70 bg-card/95 text-card-foreground shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85",
        local.class,
      )}
      {...others}
    />
  );
};

const CardHeader: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("flex flex-col gap-1.5 p-4 sm:p-5", local.class)} {...others} />;
};

const CardTitle: Component<ComponentProps<"h3">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <h3 class={cn("text-base font-semibold leading-none tracking-tight", local.class)} {...others} />;
};

const CardDescription: Component<ComponentProps<"p">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <p class={cn("text-sm text-muted-foreground", local.class)} {...others} />;
};

const CardContent: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("p-4 pt-0 sm:p-5 sm:pt-0", local.class)} {...others} />;
};

const CardFooter: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("p-4 pt-0 sm:p-5 sm:pt-0", local.class)} {...others} />;
};

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
