import { randomUUID } from 'node:crypto';

import { db } from '../../../lib/db';
import type { PayableStatus } from '../entities/payable.entity';
import type {
  PaymentMethod,
  Transaction,
} from '../entities/transaction.entity';
import { PayableRepository } from '../repositories/payable.repository';
import { TransactionRepository } from '../repositories/transaction.repository';

interface CreateTransactionRequest {
  amount: number;
  description: string;
  method: PaymentMethod;
  name: string;
  cpf: string;
  cardNumber?: string;
  valid?: string;
  cvv?: string;
}

interface CreateTransactionResponse {
  transaction: Transaction;
}

const PIX_FEE_PERCENTAGE = 2.99;
const CREDIT_CARD_FEE_PERCENTAGE = 8.99;

export class TransactionService {
  constructor(
    private readonly transactionRepository = new TransactionRepository(),
    private readonly payableRepository = new PayableRepository(),
  ) {}

  async create(
    input: CreateTransactionRequest,
  ): Promise<CreateTransactionResponse> {
    this.validateCardFields(input);

    const feePercentage =
      input.method === 'pix' ? PIX_FEE_PERCENTAGE : CREDIT_CARD_FEE_PERCENTAGE;

    const feeAmount = Math.round((input.amount * feePercentage) / 100);
    const netAmount = input.amount - feeAmount;

    const payableStatus: PayableStatus =
      input.method === 'pix' ? 'paid' : 'waiting_funds';

    const cardLast4 =
      input.method === 'credit_card' ? input.cardNumber!.slice(-4) : null;

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const transaction = await this.transactionRepository.create(client, {
        id: randomUUID(),
        amount: input.amount,
        description: input.description.trim(),
        method: input.method,
        payerName: input.name.trim(),
        payerCpf: input.cpf,
        cardLast4,
      });

      const paymentDate = new Date(transaction.createdAt);
      if (input.method === 'credit_card') {
        paymentDate.setDate(paymentDate.getDate() + 15);
      }

      await this.payableRepository.create(client, {
        id: randomUUID(),
        transactionId: transaction.id,
        grossAmount: input.amount,
        feeAmount,
        netAmount,
        feePercentage,
        status: payableStatus,
        paymentDate,
      });

      await client.query('COMMIT');

      return { transaction };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private validateCardFields(input: CreateTransactionRequest) {
    if (input.method === 'credit_card') {
      if (!input.cardNumber || !input.valid || !input.cvv) {
        throw new Error(
          'Campos card_number, valid e cvv são obrigatórios para credit_card.',
        );
      }
      return;
    }

    if (input.cardNumber || input.valid || input.cvv) {
      throw new Error('Campos de cartão não devem ser enviados para pix.');
    }
  }
}
