import type { JSX } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

type TextFieldRootProps = JSX.HTMLAttributes<HTMLDivElement> & {
  class?: string | undefined;
};

const TextField = (props: TextFieldRootProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <div class={cn("flex flex-col gap-2", local.class)} {...others} />;
};

type TextFieldInputProps = JSX.InputHTMLAttributes<HTMLInputElement> & {
  class?: string | undefined;
  type?:
    | "button"
    | "checkbox"
    | "color"
    | "date"
    | "datetime-local"
    | "email"
    | "file"
    | "hidden"
    | "image"
    | "month"
    | "number"
    | "password"
    | "radio"
    | "range"
    | "reset"
    | "search"
    | "submit"
    | "tel"
    | "text"
    | "time"
    | "url"
    | "week";
};

const TextFieldInput = (rawProps: TextFieldInputProps) => {
  const props = mergeProps({ type: "text" as const }, rawProps);
  const [local, others] = splitProps(props, ["type", "class"]);

  return (
    <input
      type={local.type}
      class={cn(
        "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

type TextFieldTextAreaProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  class?: string | undefined;
};

const TextFieldTextArea = (props: TextFieldTextAreaProps) => {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <textarea
      class={cn(
        "flex min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

type TextFieldLabelProps = JSX.LabelHTMLAttributes<HTMLLabelElement> & {
  class?: string | undefined;
};

const TextFieldLabel = (props: TextFieldLabelProps) => {
  const [local, others] = splitProps(props, ["class"]);
  return <label class={cn("text-sm font-medium text-foreground", local.class)} {...others} />;
};

export { TextField, TextFieldInput, TextFieldLabel, TextFieldTextArea };
