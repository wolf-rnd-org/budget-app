export type Money = number;

export type BaseExpensePayload = {
  type: 'petty_cash' | 'salary' | 'check' | 'expected';
  categoryId?: string | number | null;
};

export type PettyCashPayload = BaseExpensePayload & {
  type: 'petty_cash';
  amount: Money;
  name: string;
};

export type SalaryPayload = BaseExpensePayload & {
  type: 'salary';
  payee: string;
  is_gross: boolean; // true => gross, false => net
  rate: Money;
  quantity: number; // default 1
  amount: Money; // can be overridden, defaults to rate * quantity
};

export type CheckPayload = BaseExpensePayload & {
  type: 'check';
  payee: string;
  checkNumber: string;
  issueDate: string; // ISO date (yyyy-mm-dd)
  amount: Money;
  memo?: string;
};

export type ExpectedExpensePayload = {
  type: 'expected';
  name: string;
  amount: Money;
};

export type MoreActionsPayload = PettyCashPayload | SalaryPayload | CheckPayload | ExpectedExpensePayload;

export type CategoryOption = {
  id: string | number;
  name: string;
};

