export type PayableStatus = 'paid' | 'waiting_funds';

export interface Payable {
  id: string;
  transactionId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feePercentage: number;
  status: PayableStatus;
  paymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
