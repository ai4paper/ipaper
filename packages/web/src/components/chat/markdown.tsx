import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

const components: Components = {
  p: ({ node, ...props }) => (
    <p className="my-3 first:mt-0 last:mb-0 leading-7" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a
      className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground"
      target="_blank"
      rel="noreferrer noopener"
      {...props}
    />
  ),
  ul: ({ node, ...props }) => (
    <ul className="my-3 list-disc space-y-1 pl-6" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-7" {...props} />,
  h1: ({ node, ...props }) => (
    <h1
      className="mt-6 mb-3 text-2xl font-semibold tracking-tight first:mt-0"
      {...props}
    />
  ),
  h2: ({ node, ...props }) => (
    <h2
      className="mt-6 mb-3 text-xl font-semibold tracking-tight first:mt-0"
      {...props}
    />
  ),
  h3: ({ node, ...props }) => (
    <h3
      className="mt-5 mb-2 text-lg font-semibold tracking-tight first:mt-0"
      {...props}
    />
  ),
  h4: ({ node, ...props }) => (
    <h4
      className="mt-4 mb-2 text-base font-semibold tracking-tight first:mt-0"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-3 border-l-2 border-border pl-4 text-foreground/70 italic"
      {...props}
    />
  ),
  hr: ({ node, ...props }) => (
    <hr className="my-6 border-border/60" {...props} />
  ),
  table: ({ node, ...props }) => (
    <div className="my-4 overflow-x-auto">
      <table
        className="w-full border-collapse text-sm [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5"
        {...props}
      />
    </div>
  ),
  code: ({ node, className, children, ...props }) => {
    const isInline = !/language-/.test(className ?? "");
    if (isInline) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={cn("font-mono text-[13px]", className)} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ node, ...props }) => (
    <pre
      className="my-3 overflow-x-auto rounded-lg border border-border/60 bg-muted/60 p-3 leading-relaxed"
      {...props}
    />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,
};

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "text-[15px] text-foreground/90 break-words",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
