import type { Component, ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const Separator: Component<ComponentProps<"div">> = props => {
  const [local, others] = splitProps(props, ["class"]);
  return <div role="separator" class={cn("h-px w-full bg-border", local.class)} {...others} />;
};

export { Separator };
