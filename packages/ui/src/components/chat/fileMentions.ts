import type { AttachedFile } from '@/stores/types/sessionTypes';

type MentionableEntry = {
  name: string;
  path: string;
  relativePath?: string;
  type?: 'file' | 'directory';
};

type ExtractInlineMentionAttachmentsOptions = {
  root: string;
  knownAgentNames: Set<string>;
  now?: () => number;
  random?: () => number;
};

const normalizeMentionPath = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');

const buildServerFileUrl = (filepath: string): string => {
  const normalized = filepath.replace(/\\/g, '/').trim();
  if (normalized.toLowerCase().startsWith('file://')) {
    return normalized;
  }

  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${encodeURI(withLeadingSlash)}`;
};

export const buildMentionPath = (entry: MentionableEntry): string => {
  const basePath = (entry.relativePath && entry.relativePath.trim().length > 0)
    ? entry.relativePath.trim()
    : entry.name;

  if (entry.type === 'directory') {
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
  }

  return basePath;
};

export const extractInlineMentionAttachments = (
  rawText: string,
  options: ExtractInlineMentionAttachmentsOptions,
): { sanitizedText: string; attachments: AttachedFile[] } => {
  if (!rawText || !rawText.includes('@')) {
    return { sanitizedText: rawText, attachments: [] };
  }

  const root = options.root.replace(/\\/g, '/').replace(/\/+$/, '');
  const seenPaths = new Set<string>();
  const attachments: AttachedFile[] = [];
  const mentionRegex = /@([^\s]+)/g;
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;

  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(rawText)) !== null) {
    const rawMentionPath = match[1];
    const offset = match.index;
    const charBefore = offset > 0 ? rawText[offset - 1] : null;
    if (charBefore && !/(\s|\(|\)|\[|\]|\{|\}|"|'|`|,|\.|;|:)/.test(charBefore)) {
      continue;
    }

    const mentionPath = String(rawMentionPath || '')
      .trim()
      .replace(/^[`"'<(]+/, '')
      .replace(/[),.;:!?`"'>]+$/g, '');
    if (!mentionPath) {
      continue;
    }

    if (options.knownAgentNames.has(mentionPath.toLowerCase())) {
      continue;
    }

    const looksLikePath = mentionPath.includes('/') || mentionPath.includes('\\') || mentionPath.includes('.');
    if (!looksLikePath) {
      continue;
    }

    const isDirectory = mentionPath.endsWith('/');
    const normalizedMentionPath = normalizeMentionPath(isDirectory ? mentionPath.slice(0, -1) : mentionPath);
    if (!normalizedMentionPath) {
      continue;
    }

    const serverPath = mentionPath.startsWith('/')
      ? mentionPath.replace(/\\/g, '/').replace(/\/+$/, '')
      : root
        ? `${root}/${normalizedMentionPath}`
        : null;
    if (!serverPath) {
      continue;
    }

    const normalizedServerPath = serverPath.replace(/\/+/g, '/');
    if (seenPaths.has(normalizedServerPath)) {
      continue;
    }
    seenPaths.add(normalizedServerPath);

    const filename = normalizedMentionPath.split('/').filter(Boolean).pop() || normalizedMentionPath;
    const mimeType = isDirectory ? 'application/x-directory' : 'text/plain';
    attachments.push({
      id: `inline-server-${now()}-${random().toString(36).slice(2, 9)}`,
      file: new File([], filename, { type: mimeType }),
      filename,
      mimeType,
      size: 0,
      dataUrl: buildServerFileUrl(normalizedServerPath),
      source: 'server',
      serverPath: normalizedServerPath,
    });
  }

  return {
    sanitizedText: rawText,
    attachments,
  };
};
