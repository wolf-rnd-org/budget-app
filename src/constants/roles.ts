export interface Role {
  id: string;
  englishLabel: string;
  hebrewLabel: string;
}

export const ROLES: Role[] = [
  { id: 'assistant', englishLabel: 'assistant', hebrewLabel: 'משתמש עזר' },
  { id: 'operator', englishLabel: 'operator', hebrewLabel: 'מפעילה' },
  { id: 'manager', englishLabel: 'manager', hebrewLabel: 'מנהל' },
  { id: 'accountant', englishLabel: 'accountant', hebrewLabel: 'נהל"ח' },
];

export function getRoleDisplayName(roleId?: string): string {
  const role = ROLES.find(r => r.id === roleId);
  return role?.hebrewLabel || roleId || 'לא צוין';
}

export function getRoleByLabel(label: string): Role | undefined {
  return ROLES.find(r => r.englishLabel === label || r.hebrewLabel === label);
}