import type { PolymorphicProps } from "@kobalte/core";
import * as TextFieldPrimitive from "@kobalte/core/text-field";
import type { ValidComponent } from "solid-js";
import { mergeProps, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

type TextFieldRootProps<T extends ValidComponent = "div"> = TextFieldPrimitive.TextFieldRootProps<T> & {
  class?: string | undefined;
};

const TextField = <T extends ValidComponent = "div">(props: PolymorphicProps<T, TextFieldRootProps<T>>) => {
  const [local, others] = splitProps(props as TextFieldRootProps, ["class"]);
  return <TextFieldPrimitive.Root class={cn("flex flex-col gap-2", local.class)} {...others} />;
};

type TextFieldInputProps<T extends ValidComponent = "input"> = TextFieldPrimitive.TextFieldInputProps<T> & {
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

const TextFieldInput = <T extends ValidComponent = "input">(
  rawProps: PolymorphicProps<T, TextFieldInputProps<T>>,
) => {
  const props = mergeProps<TextFieldInputProps<T>[]>({ type: "text" }, rawProps);
  const [local, others] = splitProps(props as TextFieldInputProps, ["type", "class"]);

  return (
      <TextFieldPrimitive.Input
        type={local.type}
        class={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          local.class,
        )}
        {...others}
      />
  );
};

type TextFieldTextAreaProps<T extends ValidComponent = "textarea"> =
  TextFieldPrimitive.TextFieldTextAreaProps<T> & { class?: string | undefined };

const TextFieldTextArea = <T extends ValidComponent = "textarea">(
  props: PolymorphicProps<T, TextFieldTextAreaProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldTextAreaProps, ["class"]);

  return (
    <TextFieldPrimitive.TextArea
      class={cn(
        "flex min-h-24 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
};

type TextFieldLabelProps<T extends ValidComponent = "label"> = TextFieldPrimitive.TextFieldLabelProps<T> & {
  class?: string | undefined;
};

const TextFieldLabel = <T extends ValidComponent = "label">(
  props: PolymorphicProps<T, TextFieldLabelProps<T>>,
) => {
  const [local, others] = splitProps(props as TextFieldLabelProps, ["class"]);
  return (
    <TextFieldPrimitive.Label
      class={cn("text-sm font-medium text-foreground", local.class)}
      {...others}
    />
  );
};

export { TextField, TextFieldInput, TextFieldLabel, TextFieldTextArea };
