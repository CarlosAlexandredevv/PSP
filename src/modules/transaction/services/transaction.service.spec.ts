import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { db } from '../../../lib/db';
import { TransactionService } from './transaction.service';

function makeClientMock() {
  return {
    query: jest.fn(async (_sql: string) => undefined),
    release: jest.fn(),
  };
}

describe('TransactionService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('cria payable paid com fee de pix e D+0', async () => {
    const client = makeClientMock();
    jest.spyOn(db, 'connect').mockResolvedValueOnce(client as never);

    const createdAt = new Date('2026-04-23T10:00:00.000Z');
    const transactionCreateMock = jest.fn(async (_client: unknown, _input: unknown) => ({
      id: 'tx-1',
      amount: 2_099,
      description: 'Airpods',
      method: 'pix',
      payerName: 'John Doe',
      payerCpf: '12345678900',
      cardLast4: null,
      createdAt,
      updatedAt: createdAt,
    }));
    const payableCreateMock = jest.fn(async (_client: unknown, _input: unknown) => ({
      id: 'pay-1',
    }));
    const transactionRepo = {
      create: transactionCreateMock,
    };
    const payableRepo = {
      create: payableCreateMock,
    };
    const service = new TransactionService(
      transactionRepo as unknown as ConstructorParameters<typeof TransactionService>[0],
      payableRepo as unknown as ConstructorParameters<typeof TransactionService>[1],
    );

    await service.create({
      amount: 2_099,
      description: 'Airpods',
      method: 'pix',
      name: 'John Doe',
      cpf: '12345678900',
    });

    expect(payableRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        status: 'paid',
        feePercentage: 2.99,
        feeAmount: Math.round((2_099 * 2.99) / 100),
        netAmount: 2_099 - Math.round((2_099 * 2.99) / 100),
        paymentDate: createdAt,
      }),
    );
    expect(transactionRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ cardLast4: null }),
    );
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('cria payable waiting_funds com fee de credit_card e D+15', async () => {
    const client = makeClientMock();
    jest.spyOn(db, 'connect').mockResolvedValueOnce(client as never);

    const createdAt = new Date('2026-04-10T12:00:00.000Z');
    const transactionCreateMock = jest.fn(async (_client: unknown, _input: unknown) => ({
      id: 'tx-2',
      amount: 10_000,
      description: 'Notebook',
      method: 'credit_card',
      payerName: 'Jane Doe',
      payerCpf: '12345678900',
      cardLast4: '1111',
      createdAt,
      updatedAt: createdAt,
    }));
    const payableCreateMock = jest.fn(async (_client: unknown, _input: unknown) => ({
      id: 'pay-2',
    }));
    const transactionRepo = {
      create: transactionCreateMock,
    };
    const payableRepo = {
      create: payableCreateMock,
    };
    const service = new TransactionService(
      transactionRepo as unknown as ConstructorParameters<typeof TransactionService>[0],
      payableRepo as unknown as ConstructorParameters<typeof TransactionService>[1],
    );

    await service.create({
      amount: 10_000,
      description: 'Notebook',
      method: 'credit_card',
      name: 'Jane Doe',
      cpf: '12345678900',
      cardNumber: '4111111111111111',
      valid: '1229',
      cvv: '123',
    });

    const expectedFee = Math.round((10_000 * 8.99) / 100);
    const expectedPaymentDate = new Date('2026-04-25T12:00:00.000Z');

    expect(payableRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({
        status: 'waiting_funds',
        feePercentage: 8.99,
        feeAmount: expectedFee,
        netAmount: 10_000 - expectedFee,
        paymentDate: expectedPaymentDate,
      }),
    );
    expect(transactionRepo.create).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ cardLast4: '1111' }),
    );
  });

  it('faz rollback quando criação de payable falha', async () => {
    const client = makeClientMock();
    jest.spyOn(db, 'connect').mockResolvedValueOnce(client as never);

    const transactionCreateMock = jest.fn(async (_client: unknown, _input: unknown) => ({
        id: 'tx-3',
        amount: 1_000,
        description: 'Produto',
        method: 'pix',
        payerName: 'John Doe',
        payerCpf: '12345678900',
        cardLast4: null,
        createdAt: new Date('2026-04-23T10:00:00.000Z'),
        updatedAt: new Date('2026-04-23T10:00:00.000Z'),
      }));
    const transactionRepo = {
      create: transactionCreateMock,
    };
    const payableRepo = {
      create: jest.fn(async (_client: unknown, _input: unknown) => {
        throw new Error('erro-payable');
      }),
    };
    const service = new TransactionService(
      transactionRepo as unknown as ConstructorParameters<typeof TransactionService>[0],
      payableRepo as unknown as ConstructorParameters<typeof TransactionService>[1],
    );

    await expect(
      service.create({
        amount: 1_000,
        description: 'Produto',
        method: 'pix',
        name: 'John Doe',
        cpf: '12345678900',
      }),
    ).rejects.toThrow('erro-payable');

    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.query).not.toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });
});
