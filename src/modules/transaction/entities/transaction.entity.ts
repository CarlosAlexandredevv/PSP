export type PaymentMethod = 'pix' | 'credit_card';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  method: PaymentMethod;
  payerName: string;
  payerCpf: string;
  cardLast4: string | null;
  createdAt: Date;
  updatedAt: Date;
}
