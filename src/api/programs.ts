// src/api/programs.ts
import { programsApi, isMockMode } from './http';

export interface Program {
  id: string;
  name: string;
  [key: string]: any;
}

// שליפת כל התוכניות
export async function getPrograms(): Promise<Program[]> {
  const endpoint = isMockMode() ? '/mocks/programs/programs.json' : '/programs';

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
    ? '/mocks/programs/getProgramById.json'
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
    : `/programs/${uid}`;
  const response = await programsApi.get(endpoint, {
    // במוק זה קובץ סטטי; בפרודקשן אין צורך בפרמטרים כי ה-id בנתיב
    params: isMockMode() ? undefined : undefined,
    headers: { Accept: 'application/json' },
  });
  
  const data = response.data;
  return data as Program[];
}
