// src/api/programs.ts
import { programsApi, isMockMode } from './http';

export interface Program {
  id: string;
  name: string;
  [key: string]: any;
}

// שליפת כל התוכניות
export async function getPrograms(): Promise<Program[]> {
  const endpoint = isMockMode() ? '/programs.json' : '/';

  const response = await programsApi.get(endpoint, {
    // במוק זה קובץ סטטי - אין פרמטרים
    params: isMockMode() ? undefined : undefined,
    headers: { Accept: 'application/json' },
  });

  return response.data as Program[];
}

// שליפת תוכנית לפי מזהה
export async function getProgramById(programId: string | number): Promise<Program> {
  const endpoint = isMockMode()
    ? '/getProgramById.json'
    : `/programs/${programId}`;

  const response = await programsApi.get(endpoint, {
    // אם תרצי: בפרודקשן אפשר להעביר params, אבל לרוב אין צורך כאן
    params: isMockMode() ? undefined : undefined,
    headers: { Accept: 'application/json' },
  });

  // במוק: הקובץ יכול להיות אובייקט של התוכנית/או אוסף שמצריך סינון.
  const data = response.data;
  if (isMockMode()) {
    // תמיכה בשני פורמטים אפשריים:
    // 1) אובייקט של תוכנית בודדת
    if (data && !Array.isArray(data) && data.id) return data as Program;
    // 2) מערך תוכניות -> נחפש לפי id
    if (Array.isArray(data)) {
      const found = data.find((p: any) => String(p.id) === String(programId));
      if (!found) throw new Error('Program not found');
      return found as Program;
    }
  }

  return data as Program;
}

// עדכון תוכנית
export async function updateProgram(programId: string | number, payload: any): Promise<Program> {
  const endpoint = `/programs/${programId}`;
  const response = await programsApi.put(endpoint, payload, { headers: { Accept: 'application/json' } });
  return response.data as Program;
}

// שליפת תוכניות לפי מזהה משתמש
export async function getProgramsByUserId(userId: string | number): Promise<Program[]> {
  const uid = String(userId);
  const endpoint = isMockMode()
    ? '/getProgramsByUserId.json'
    : `/${uid}`;
  const response = await programsApi.get(endpoint, {
    // במוק זה קובץ סטטי; בפרודקשן אין צורך בפרמטרים כי ה-id בנתיב
    params: isMockMode() ? undefined : undefined,
    headers: { Accept: 'application/json' },
  });
  
  const data = response.data;
  return data as Program[];
}

// ---------------- NEW FUNCTION ----------------
export interface ProgramSummary {
  program_id: string;
  // Total budget should include base + extra + income
  total_budget: number;
  total_expenses: number;
  remaining_balance: number;
  // Optional breakdown fields
  base_budget?: number | null;
  extra_budget?: number | null;
  income?: number | null;
  income_details?: string | null;
}
export async function getProgramSummary(
  programId: string | number
): Promise<ProgramSummary> {
  // ⚠️ גם כאן: ב־mock לקרוא לקובץ, בפרודקשן לאנדפוינט
  const endpoint = isMockMode() ? '/summary.json' : '/summary';
  const response = await programsApi.get(endpoint, {
    params: isMockMode() ? undefined : { program_id: programId },
    headers: { Accept: 'application/json' },
  });

    return response.data as ProgramSummary;
}