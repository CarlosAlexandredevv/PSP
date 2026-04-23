import { describe, expect, it } from '@jest/globals';

import { createTransactionBodySchema } from './create-transaction.dto';

describe('createTransactionBodySchema', () => {
  it('aceita payload pix válido', () => {
    const result = createTransactionBodySchema.safeParse({
      amount: 2_099,
      description: 'Cafe',
      method: 'pix',
      name: 'John Doe',
      cpf: '12345678900',
    });

    expect(result.success).toBe(true);
  });

  it('rejeita amount com ponto flutuante', () => {
    const result = createTransactionBodySchema.safeParse({
      amount: 20.99,
      description: 'Cafe',
      method: 'pix',
      name: 'John Doe',
      cpf: '12345678900',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('inteiro');
    }
  });

  it('rejeita amount string', () => {
    const result = createTransactionBodySchema.safeParse({
      amount: '1000',
      description: 'Cafe',
      method: 'pix',
      name: 'John Doe',
      cpf: '12345678900',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita CPF fora de 11 dígitos', () => {
    const result = createTransactionBodySchema.safeParse({
      amount: 1000,
      description: 'Cafe',
      method: 'pix',
      name: 'John Doe',
      cpf: '123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('11 dígitos');
    }
  });

  it('exige campos de cartão para credit_card', () => {
    const result = createTransactionBodySchema.safeParse({
      amount: 1000,
      description: 'Cafe',
      method: 'credit_card',
      name: 'John Doe',
      cpf: '12345678900',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toEqual(expect.arrayContaining(['card_number', 'valid', 'cvv']));
    }
  });

  it('rejeita campos de cartão quando method for pix', () => {
    const result = createTransactionBodySchema.safeParse({
      amount: 1000,
      description: 'Cafe',
      method: 'pix',
      name: 'John Doe',
      cpf: '12345678900',
      card_number: '4111111111111111',
      valid: '1229',
      cvv: '123',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'method')).toBe(
        true,
      );
    }
  });
});
