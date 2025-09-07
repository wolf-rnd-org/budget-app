export type AuthUser = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  actions: string[];
};

export type Expense = {
  id: string;
  budget: number;
  project: string;
  date: string;
  categories: string[] | string;
  amount: number;
  invoice_description: string;
  supplier_name: string;
  invoice_file: string;
  business_number: string;
  invoice_type: string;
  bank_details_file: string;
  supplier_email: string;
  status: string;
  user_id: number | string;
  priority?: string;
};

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
}

export interface loginResponse {
  userId: number;
}

// src/api/types.ts (או כל מקום מרכזי לטיפוסים)
export interface MeResponse {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  actions: string[]; // לדוגמה: ["expenses.view","expenses.create","reports.view"]
}
