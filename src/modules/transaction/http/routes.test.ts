import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { app } from '../../../app';
import { db } from '../../../lib/db';
import { UnprocessableEntityError } from '../../../shared/errors/unprocessable-entity.error';
import { resetDatabaseSchema } from '../../../test/helpers/database';
import { TransactionService } from '../services/transaction.service';

describe('transaction routes', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      await db.query('SELECT 1');
      dbAvailable = true;
      await resetDatabaseSchema();
    } catch {
      dbAvailable = false;
    }
    await app.ready();
  });

  beforeEach(async () => {
    if (!dbAvailable) return;
    await db.query('DELETE FROM payables');
    await db.query('DELETE FROM transactions');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await app.close();
    if (dbAvailable) {
      await db.end();
    }
  });

  it('retorna 201 ao criar transação pix válida', async () => {
    if (!dbAvailable) return;

    const response = await app.inject({
      method: 'POST',
      url: '/transaction',
      payload: {
        amount: 2_099,
        description: 'Cafe',
        method: 'pix',
        name: 'John Doe',
        cpf: '12345678900',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json() as {
      transaction: { id: string; method: string; cardLast4: string | null };
    };
    expect(body.transaction.id).toBeTruthy();
    expect(body.transaction.method).toBe('pix');
    expect(body.transaction.cardLast4).toBeNull();
  });

  it('retorna 422 com field/message quando body é inválido', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/transaction',
      payload: {
        amount: '1000',
        description: '',
        method: 'pix',
        name: '',
        cpf: '123',
      },
    });

    expect(response.statusCode).toBe(422);
    const body = response.json() as {
      message: string;
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.message).toBe('Entidade não processável.');
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(body.errors[0]).toEqual(
      expect.objectContaining({
        field: expect.any(String),
        message: expect.any(String),
      }),
    );
  });

  it('retorna 200 no health check', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('retorna 422 quando regra de negócio lança erro de entidade não processável', async () => {
    jest
      .spyOn(TransactionService.prototype, 'create')
      .mockRejectedValueOnce(
        new UnprocessableEntityError('Entidade não processável.', [
          {
            field: 'card_number',
            message: 'card_number não deve ser enviado para pix.',
          },
        ]),
      );

    const response = await app.inject({
      method: 'POST',
      url: '/transaction',
      payload: {
        amount: 1_000,
        description: 'Cafe',
        method: 'pix',
        name: 'John Doe',
        cpf: '12345678900',
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      message: 'Entidade não processável.',
      errors: [
        {
          field: 'card_number',
          message: 'card_number não deve ser enviado para pix.',
        },
      ],
    });
  });
});
