export function getThreadIdParam() {
  if (typeof window === "undefined") return undefined;

  return new URLSearchParams(window.location.search).get("threadId") ?? undefined;
}

export function setThreadIdParam(threadId?: string) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (threadId === undefined) {
    url.searchParams.delete("threadId");
  } else {
    url.searchParams.set("threadId", threadId);
  }

  window.history.replaceState({}, "", url.toString());
}
