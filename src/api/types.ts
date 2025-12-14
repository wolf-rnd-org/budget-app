export type GrossNet = 'gross' | 'net';
export type AuthUser = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  actions: string[];
};

export type CategoryRef = {
  id: string;
  name: string;
};

export type Expense = {
  id: string;
  budget: number;
  project: string;
  date: string;
  program_id: string;
  program_name?: string; // Program name for admin view
  // Server may return list of ids (legacy) or list of {id,name}
  categories: CategoryRef[] | string[] | string;
  amount: number;
  invoice_description: string;
  supplier_name: string;
  invoice_file: string | string[] | { url: string; name?: string }[];
  business_number: string;
  invoice_type: string;
  bank_details_file: string | string[] | { url: string; name?: string }[];
  receipt_file?: string | string[] | { url: string; name?: string }[];
  bank_name?: string;
  bank_branch?: string;
  bank_account?: string;
  beneficiary?: string;
  supplier_email: string;
  status: string;
  user_id: number | string;
  priority?: string;
  rejection_reason?: string | null;
  id_number?: string;      
  month?: string;          
is_gross?: GrossNet | boolean;
  rate?: number;          
  quantity?: number;        
  employer_cost?: number;   // עלות מעביד (חישוב שרת)
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
