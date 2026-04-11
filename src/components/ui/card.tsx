import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const Card: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <div
      class={cn(
        "rounded-3xl border border-white/10 bg-slate-950/55 text-slate-100 shadow-xl shadow-slate-950/20 backdrop-blur",
        local.class,
      )}
      {...others}
    />
  );
};

const CardHeader: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("p-4 sm:p-5", local.class)} {...others} />;
};

const CardTitle: Component<ComponentProps<"h3">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <h3 class={cn("text-base font-semibold text-white", local.class)} {...others} />;
};

const CardDescription: Component<ComponentProps<"p">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <p class={cn("text-sm text-slate-400", local.class)} {...others} />;
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
