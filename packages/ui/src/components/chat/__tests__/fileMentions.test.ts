import { describe, expect, test } from 'bun:test';
import { buildMentionPath, extractInlineMentionAttachments } from '../fileMentions';

describe('buildMentionPath', () => {
  test('appends a trailing slash for directory mentions', () => {
    expect(buildMentionPath({
      name: 'src',
      path: '/repo/src',
      relativePath: 'src',
      type: 'directory',
    })).toBe('src/');
  });
});

describe('extractInlineMentionAttachments', () => {
  test('creates a directory attachment for folder mentions', () => {
    const result = extractInlineMentionAttachments('Check @src/components/ please', {
      root: '/repo',
      knownAgentNames: new Set<string>(),
      now: () => 123,
      random: () => 0.123456789,
    });

    expect(result.sanitizedText).toBe('Check @src/components/ please');
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]?.filename).toBe('components');
    expect(result.attachments[0]?.mimeType).toBe('application/x-directory');
    expect(result.attachments[0]?.source).toBe('server');
    expect(result.attachments[0]?.serverPath).toBe('/repo/src/components');
  });
});
