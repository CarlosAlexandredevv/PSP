import { db } from '../../../../lib/db';
import type { PoolClient } from 'pg';

import type { Payable, PayableStatus } from '../../entities/payable.entity';

interface CreatePayableInput {
  id: string;
  transactionId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  feePercentage: number;
  status: PayableStatus;
  paymentDate: Date;
}

export class PayableRepository {
  async create(
    client: PoolClient,
    input: CreatePayableInput,
  ): Promise<Payable> {
    const result = await client.query<{
      id: string;
      transaction_id: string;
      gross_amount: number;
      fee_amount: number;
      net_amount: number;
      fee_percentage: number;
      status: PayableStatus;
      payment_date: Date;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO payables (
        id,
        transaction_id,
        gross_amount,
        fee_amount,
        net_amount,
        fee_percentage,
        status,
        payment_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        transaction_id,
        gross_amount,
        fee_amount,
        net_amount,
        fee_percentage,
        status,
        payment_date,
        created_at,
        updated_at`,
      [
        input.id,
        input.transactionId,
        input.grossAmount,
        input.feeAmount,
        input.netAmount,
        input.feePercentage,
        input.status,
        input.paymentDate,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Falha ao criar payable.');
    }

    return {
      id: row.id,
      transactionId: row.transaction_id,
      grossAmount: row.gross_amount,
      feeAmount: row.fee_amount,
      netAmount: row.net_amount,
      feePercentage: Number(row.fee_percentage),
      status: row.status,
      paymentDate: new Date(row.payment_date),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async getBalanceSummary(): Promise<{ available: number; waitingFunds: number }> {
    const result = await db.query<{
      available: string;
      waiting_funds: string;
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount END), 0)::text AS available,
        COALESCE(SUM(CASE WHEN status = 'waiting_funds' THEN net_amount END), 0)::text AS waiting_funds
      FROM payables`,
    );

    return {
      available: Number(result.rows[0]?.available ?? '0'),
      waitingFunds: Number(result.rows[0]?.waiting_funds ?? '0'),
    };
  }
}
