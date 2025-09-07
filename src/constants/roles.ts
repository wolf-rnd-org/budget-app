export interface Role {
  id: string;
  englishLabel: string;
  hebrewLabel: string;
}

// Allowed role IDs in the system
export type RoleId = 'assistant' | 'global_user' | 'accountan' | 'regular_user' | 'admin';

export const ROLES: Role[] = [
  { id: 'assistant', englishLabel: 'assistant', hebrewLabel: 'assistant' },
  { id: 'global_user', englishLabel: 'global_user', hebrewLabel: 'global_user' },
  { id: 'accountan', englishLabel: 'accountan', hebrewLabel: 'accountan' },
  { id: 'regular_user', englishLabel: 'regular_user', hebrewLabel: 'regular_user' },
  { id: 'admin', englishLabel: 'admin', hebrewLabel: 'admin' },
];

export function getRoleDisplayName(roleId?: string): string {
  const role = ROLES.find(r => r.id === roleId);
  return role?.hebrewLabel || roleId || 'לא צוין';
}

export function getRoleByLabel(label: string): Role | undefined {
  return ROLES.find(r => r.englishLabel === label || r.hebrewLabel === label);
}

