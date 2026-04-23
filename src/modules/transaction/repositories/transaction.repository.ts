import type { PoolClient } from 'pg';

import type {
  PaymentMethod,
  Transaction,
} from '../entities/transaction.entity';

interface CreateTransactionInput {
  id: string;
  amount: number;
  description: string;
  method: PaymentMethod;
  payerName: string;
  payerCpf: string;
  cardLast4: string | null;
}

export class TransactionRepository {
  async create(
    client: PoolClient,
    input: CreateTransactionInput,
  ): Promise<Transaction> {
    const result = await client.query<{
      id: string;
      amount: number;
      description: string;
      method: PaymentMethod;
      payer_name: string;
      payer_cpf: string;
      card_last4: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO transactions (
        id,
        amount,
        description,
        method,
        payer_name,
        payer_cpf,
        card_last4
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        amount,
        description,
        method,
        payer_name,
        payer_cpf,
        card_last4,
        created_at,
        updated_at`,
      [
        input.id,
        input.amount,
        input.description,
        input.method,
        input.payerName,
        input.payerCpf,
        input.cardLast4,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Falha ao criar transaction.');
    }

    return {
      id: row.id,
      amount: row.amount,
      description: row.description,
      method: row.method,
      payerName: row.payer_name,
      payerCpf: row.payer_cpf,
      cardLast4: row.card_last4,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
