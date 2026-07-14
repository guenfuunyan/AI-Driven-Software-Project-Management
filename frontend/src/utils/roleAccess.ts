export type RoleName = 'admin' | 'pm' | 'developer' | 'viewer';

export type PageKey = 'dashboard' | 'projects' | 'sprint' | 'stories' | 'tasks' | 'risks' | 'forecast' | 'ai' | 'reports' | 'settings';

export interface PageAccess {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  label: string;
}

const ROLE_POLICY: Record<RoleName, PageAccess> = {
  admin: { canView: true, canEdit: true, canManage: true, label: 'Administrator' },
  pm: { canView: true, canEdit: true, canManage: true, label: 'Project Manager' },
  developer: { canView: true, canEdit: true, canManage: false, label: 'Developer' },
  viewer: { canView: true, canEdit: false, canManage: false, label: 'Viewer' },
};

const PAGE_RULES: Record<PageKey, { allowedRoles: RoleName[]; requireManage?: boolean }> = {
  dashboard: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  projects: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  sprint: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  stories: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  tasks: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  risks: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  forecast: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  ai: { allowedRoles: ['admin', 'pm', 'developer'] },
  reports: { allowedRoles: ['admin', 'pm', 'developer', 'viewer'] },
  settings: { allowedRoles: ['admin', 'pm'] },
};

export function getPageAccess(page: PageKey, role: RoleName | string | undefined): PageAccess {
  const normalizedRole = (role || 'viewer') as RoleName;
  const base = ROLE_POLICY[normalizedRole] || ROLE_POLICY.viewer;
  const pageRule = PAGE_RULES[page];
  const canView = pageRule.allowedRoles.includes(normalizedRole);

  if (!canView) {
    return { canView: false, canEdit: false, canManage: false, label: 'Restricted' };
  }

  if (page === 'settings' && normalizedRole === 'pm') {
    return { ...base, canEdit: true, canManage: false, label: base.label };
  }

  if (page === 'tasks' && normalizedRole === 'developer') {
    return { ...base, canEdit: true, canManage: false, label: base.label };
  }

  if (page === 'projects' && normalizedRole === 'viewer') {
    return { ...base, canEdit: false, canManage: false, label: base.label };
  }

  return base;
}

export function getRoleLabel(role: RoleName | string | undefined): string {
  return (ROLE_POLICY[(role || 'viewer') as RoleName] || ROLE_POLICY.viewer).label;
}

export function getReadOnlyNotice(page: PageKey, role: RoleName | string | undefined): string {
  const label = getRoleLabel(role);
  const messages: Record<PageKey, string> = {
    dashboard: 'Bạn chỉ có thể xem tổng quan và theo dõi tiến độ.',
    projects: 'Bạn chỉ có thể xem danh sách dự án và theo dõi tiến độ.',
    sprint: 'Bạn chỉ có thể xem sprint board và trạng thái công việc.',
    stories: 'Bạn chỉ có thể xem user stories và kết quả AI, không thể chỉnh sửa.',
    tasks: 'Bạn chỉ có thể xem board công việc và theo dõi tiến độ.',
    risks: 'Bạn chỉ có thể xem rủi ro và phân tích, không thể cập nhật.',
    forecast: 'Bạn chỉ có thể xem dự báo và xu hướng.',
    ai: 'Bạn chỉ có thể xem các công cụ AI nhưng không thể kích hoạt hành động.',
    reports: 'Bạn chỉ có thể xem báo cáo và số liệu.',
    settings: 'Bạn chỉ có thể xem thông tin hồ sơ cơ bản.'
  };

  return `${label} • Chỉ xem • ${messages[page]}`;
}
