import { randomUUID } from 'node:crypto';

import { db } from '../../../lib/db';
import { UnprocessableEntityError } from '../../../shared/errors/unprocessable-entity.error';
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

interface ListTransactionsRequest {
  page?: number;
  limit?: number;
  method?: PaymentMethod;
  cpf?: string;
}

interface ListTransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

  async list(input: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 10;

    const filters = {
      ...(input.method ? { method: input.method } : {}),
      ...(input.cpf ? { cpf: input.cpf } : {}),
    };

    const [transactions, total] = await Promise.all([
      this.transactionRepository.list(filters, page, limit),
      this.transactionRepository.count(filters),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private validateCardFields(input: CreateTransactionRequest) {
    if (input.method === 'credit_card') {
      const issues = [];
      if (!input.cardNumber) {
        issues.push({
          field: 'card_number',
          message: 'card_number é obrigatório para credit_card.',
        });
      }
      if (!input.valid) {
        issues.push({
          field: 'valid',
          message: 'valid é obrigatório para credit_card.',
        });
      }
      if (!input.cvv) {
        issues.push({
          field: 'cvv',
          message: 'cvv é obrigatório para credit_card.',
        });
      }

      if (issues.length > 0) {
        throw new UnprocessableEntityError('Entidade não processável.', issues);
      }
      return;
    }

    const issues = [];
    if (input.cardNumber) {
      issues.push({
        field: 'card_number',
        message: 'card_number não deve ser enviado para pix.',
      });
    }
    if (input.valid) {
      issues.push({
        field: 'valid',
        message: 'valid não deve ser enviado para pix.',
      });
    }
    if (input.cvv) {
      issues.push({
        field: 'cvv',
        message: 'cvv não deve ser enviado para pix.',
      });
    }

    if (issues.length > 0) {
      throw new UnprocessableEntityError('Entidade não processável.', issues);
    }
  }
}
