export interface Role {
  id: string;
  englishLabel: string;
  hebrewLabel: string;
}

// Allowed role IDs in the system
export type RoleId = 'assistant' | 'global_user' | 'accountant' | 'regular_user' | 'admin';

export const ROLES: Role[] = [
  { id: 'assistant', englishLabel: 'assistant', hebrewLabel: 'assistant' },
  { id: 'global_user', englishLabel: 'global_user', hebrewLabel: 'משתמש גלובלי' },
  { id: 'accountant', englishLabel: 'accountant', hebrewLabel: 'הנה"ח' },
  { id: 'regular_user', englishLabel: 'regular_user', hebrewLabel: 'מפעילה' },
  { id: 'admin', englishLabel: 'admin', hebrewLabel: 'מנהל' },
];

export function getRoleDisplayName(roleId?: string): string {
  const role = ROLES.find(r => r.id === roleId);
  return role?.hebrewLabel || roleId || 'לא צוין';
}

export function getRoleByLabel(label: string): Role | undefined {
  return ROLES.find(r => r.englishLabel === label || r.hebrewLabel === label);
}

