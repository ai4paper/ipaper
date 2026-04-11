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
  return <TextFieldPrimitive.Root class={cn("flex flex-col gap-1.5", local.class)} {...others} />;
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
        "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50",
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
        "w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus-visible:border-sky-400/40 focus-visible:ring-2 focus-visible:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-50",
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
      class={cn("text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400", local.class)}
      {...others}
    />
  );
};

export { TextField, TextFieldInput, TextFieldLabel, TextFieldTextArea };
