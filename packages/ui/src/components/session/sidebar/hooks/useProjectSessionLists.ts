import React from 'react';
import type { Session } from '@opencode-ai/sdk/v2';
import { dedupeSessionsById, isSessionRelatedToProject, normalizePath } from '../utils';

type WorktreeMeta = { path: string };
type ProjectScope = { normalizedPath: string };

type Args = {
  isVSCode: boolean;
  sessions: Session[];
  archivedSessions: Session[];
  availableWorktreesByProject: Map<string, WorktreeMeta[]>;
  projects: ProjectScope[];
};

const getProjectDirectories = (
  project: ProjectScope,
  availableWorktreesByProject: Map<string, WorktreeMeta[]>,
  isVSCode: boolean,
): Set<string> => {
  const worktreesForProject = isVSCode ? [] : (availableWorktreesByProject.get(project.normalizedPath) ?? []);
  return new Set([
    project.normalizedPath,
    ...worktreesForProject
      .map((meta) => normalizePath(meta.path) ?? meta.path)
      .filter((value): value is string => Boolean(value)),
  ]);
};

export const getOwningProjectPath = (
  session: Session,
  projects: ProjectScope[],
  availableWorktreesByProject: Map<string, WorktreeMeta[]>,
  isVSCode: boolean,
): string | null => {
  let owner: string | null = null;
  let ownerLength = -1;

  projects.forEach((project) => {
    const projectDirectories = getProjectDirectories(project, availableWorktreesByProject, isVSCode);
    if (!isSessionRelatedToProject(session, project.normalizedPath, projectDirectories)) {
      return;
    }

    if (project.normalizedPath.length > ownerLength) {
      owner = project.normalizedPath;
      ownerLength = project.normalizedPath.length;
    }
  });

  return owner;
};

export const useProjectSessionLists = (args: Args) => {
  const {
    isVSCode,
    sessions,
    archivedSessions,
    availableWorktreesByProject,
    projects,
  } = args;

  const getSessionOwner = React.useCallback(
    (session: Session) => getOwningProjectPath(session, projects, availableWorktreesByProject, isVSCode),
    [availableWorktreesByProject, isVSCode, projects],
  );

  const sessionsByDirectory = React.useMemo(() => {
    const next = new Map<string, Session[]>();
    sessions.forEach((session) => {
      const directory = normalizePath((session as Session & { directory?: string | null }).directory ?? null)
        ?? normalizePath((session as Session & { project?: { worktree?: string | null } | null }).project?.worktree ?? null);
      if (!directory) {
        return;
      }

      const collection = next.get(directory) ?? [];
      collection.push(session);
      next.set(directory, collection);
    });
    return next;
  }, [sessions]);

  const getSessionsForProject = React.useCallback(
    (project: { normalizedPath: string }) => {
      const directories = [...getProjectDirectories(project, availableWorktreesByProject, isVSCode)];

      const seen = new Set<string>();
      const collected: Session[] = [];

      directories.forEach((directory) => {
        const sessionsForDirectory = sessionsByDirectory.get(directory) ?? [];
        sessionsForDirectory.forEach((session) => {
          if (seen.has(session.id) || getSessionOwner(session) !== project.normalizedPath) {
            return;
          }
          seen.add(session.id);
          collected.push(session);
        });
      });

      return collected;
    },
    [availableWorktreesByProject, getSessionOwner, isVSCode, sessionsByDirectory],
  );

  const getArchivedSessionsForProject = React.useCallback(
    (project: { normalizedPath: string }) => {
      if (isVSCode) {
        const archived = archivedSessions.filter((session) => {
          const sessionDirectory = normalizePath((session as Session & { directory?: string | null }).directory ?? null);
          const projectWorktree = normalizePath((session as Session & { project?: { worktree?: string | null } | null }).project?.worktree ?? null);

          if (sessionDirectory) {
            return sessionDirectory === project.normalizedPath;
          }

          return projectWorktree === project.normalizedPath;
        });

        const unassignedLive = sessions.filter((session) => {
          if (session.time?.archived) {
            return false;
          }
          const sessionDirectory = normalizePath((session as Session & { directory?: string | null }).directory ?? null);
          if (sessionDirectory) {
            return false;
          }
          const projectWorktree = normalizePath((session as Session & { project?: { worktree?: string | null } | null }).project?.worktree ?? null);
          return projectWorktree === project.normalizedPath;
        });

        return dedupeSessionsById([...archived, ...unassignedLive]);
      }

      const worktreesForProject = isVSCode ? [] : (availableWorktreesByProject.get(project.normalizedPath) ?? []);
      const validDirectories = new Set<string>([
        project.normalizedPath,
        ...worktreesForProject
          .map((meta) => normalizePath(meta.path) ?? meta.path)
          .filter((value): value is string => Boolean(value)),
      ]);

      const collect = (input: Session[]): Session[] => input.filter((session) =>
        getSessionOwner(session) === project.normalizedPath
        && isSessionRelatedToProject(session, project.normalizedPath, validDirectories),
      );

      const archived = collect(archivedSessions);
      const unassignedLive = sessions.filter((session) => {
        if (session.time?.archived) {
          return false;
        }
        const sessionDirectory = normalizePath((session as Session & { directory?: string | null }).directory ?? null);
        if (sessionDirectory) {
          return false;
        }
        const projectWorktree = normalizePath((session as Session & { project?: { worktree?: string | null } | null }).project?.worktree ?? null);
        if (!projectWorktree) {
          return false;
        }
        return getSessionOwner(session) === project.normalizedPath
          && (projectWorktree === project.normalizedPath || projectWorktree.startsWith(`${project.normalizedPath}/`));
      });

      return dedupeSessionsById([...archived, ...unassignedLive]);
    },
    [archivedSessions, availableWorktreesByProject, getSessionOwner, isVSCode, sessions],
  );

  return {
    getSessionsForProject,
    getArchivedSessionsForProject,
  };
};
