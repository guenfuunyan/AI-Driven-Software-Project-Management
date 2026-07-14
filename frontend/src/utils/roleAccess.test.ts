import { describe, expect, it } from 'vitest';
import { getPageAccess, getReadOnlyNotice } from './roleAccess';

describe('role access policy', () => {
  it('gives viewers read-only access to projects and tasks', () => {
    const projects = getPageAccess('projects', 'viewer');
    const tasks = getPageAccess('tasks', 'viewer');

    expect(projects.canView).toBe(true);
    expect(projects.canEdit).toBe(false);
    expect(projects.canManage).toBe(false);

    expect(tasks.canView).toBe(true);
    expect(tasks.canEdit).toBe(false);
  });

  it('lets developers edit tasks but not settings', () => {
    const tasks = getPageAccess('tasks', 'developer');
    const settings = getPageAccess('settings', 'developer');

    expect(tasks.canEdit).toBe(true);
    expect(settings.canView).toBe(false);
  });

  it('lets admin manage settings and projects', () => {
    const projects = getPageAccess('projects', 'admin');
    const settings = getPageAccess('settings', 'admin');

    expect(projects.canManage).toBe(true);
    expect(settings.canManage).toBe(true);
  });

  it('returns a clear read-only notice for viewers', () => {
    const notice = getReadOnlyNotice('tasks', 'viewer');

    expect(notice).toContain('Chỉ xem');
    expect(notice).toContain('Viewer');
  });
});
