export type AuthUser = {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  features: string[];
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
};