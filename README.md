# Challenger API

PSP simplificado - processamento de transacoes e recebiveis.

## Stack

- Node.js
- Fastify
- TypeScript
- PostgreSQL
- Zod
- Jest
- Docker

## Pre-requisitos

- Node.js >= 18
- Docker e Docker Compose
- (Opcional) `psql` para inspecionar o banco

## Como rodar

Fluxo principal deste desafio: **subir o projeto apenas via containers (app + postgres)**.

### Atalho recomendado (setup completo)

O projeto possui bootstrap automatizado em `src/scripts/bootstrap.sh`:

```bash
# Instala dependencias, cria/atualiza .env, sobe banco, roda migracoes e inicia API
npm run setup

# Mesmo fluxo, sem iniciar a API no final
npm run setup:only
```

### Cenario A - subir containers (recomendado)

```bash
# 1. Subir app + postgres
npm run db:up

# 2. Aplicar migracao (primeira execucao)
npm run db:migrate
```

Servidor: `http://localhost:3001`
Documentacao Scalar: `http://localhost:3001/docs`

## Documentacao da API (Scalar)

A documentacao interativa foi adaptada para refletir os requisitos do desafio:

- Regras de `cash-in` no endpoint `POST /transaction`
- Validacoes de payload e erros `422` por campo invalido
- Regras de payable (`paid` em D+0 para `pix`; `waiting_funds` em D+15 para `credit_card`)
- Taxas de processamento (2,99% para `pix` e 8,99% para `credit_card`)
- Restricao PCI DSS (retorno apenas de `cardLast4`)
- Consulta de saldo consolidado em `GET /balance` (`available` e `waiting_funds`)

Logs dos containers:

```bash
npm run db:logs
```

### Cenario B - comandos Docker diretos (opcional)

```bash
docker compose up --build
```

Na primeira execucao, rode a migracao em outro terminal:

```bash
npm run db:migrate
```

Depois, a API fica disponivel em `http://localhost:3001`.

## Variaveis de ambiente

| Variavel | Padrao | Descricao |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/challenger` | String de conexao PostgreSQL |
| `PORT` | `3001` | Porta HTTP da aplicacao |
| `HOST` | `0.0.0.0` | Host de bind HTTP (necessario para acesso externo em container) |

Observacao:
- Para execucao em containers, a API usa `DATABASE_URL` com host `postgres`.

## Endpoints

### POST /transaction

Cria uma transacao e gera o payable correspondente.

**Payload PIX:**

```json
{
  "amount": 2099,
  "description": "Airpods",
  "method": "pix",
  "name": "John Doe",
  "cpf": "12345678900"
}
```

**Payload cartao de credito:**

```json
{
  "amount": 10000,
  "description": "Notebook",
  "method": "credit_card",
  "name": "Jane Doe",
  "cpf": "12345678900",
  "card_number": "4111111111111111",
  "valid": "1229",
  "cvv": "123"
}
```

**Response 201:**

```json
{
  "transaction": {
    "id": "4f1bfa49-a607-4698-b5e4-3f3a122d3f40",
    "amount": 10000,
    "description": "Notebook",
    "method": "credit_card",
    "payerName": "Jane Doe",
    "payerCpf": "12345678900",
    "cardLast4": "1111",
    "createdAt": "2026-04-24T10:00:00.000Z",
    "updatedAt": "2026-04-24T10:00:00.000Z"
  }
}
```

**Response 422 (validacao):**

```json
{
  "message": "Entidade nao processavel.",
  "errors": [
    {
      "field": "cpf",
      "message": "cpf deve conter 11 digitos numericos."
    }
  ]
}
```

### GET /transactions

Lista transacoes com paginacao e filtros opcionais.

**Query params:**

| Param | Tipo | Padrao | Descricao |
| --- | --- | --- | --- |
| `page` | number | 1 | Pagina atual |
| `limit` | number | 10 | Itens por pagina (max 100) |
| `method` | `pix` \| `credit_card` | - | Filtro por metodo |
| `cpf` | string (11 digitos) | - | Filtro por CPF do pagador |

**Response 200:**

```json
{
  "transactions": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

### GET /balance

Retorna o saldo consolidado do cliente.

**Response 200:**

```json
{
  "balance": {
    "available": 1940,
    "waiting_funds": 9101
  }
}
```

- `available`: soma de `net_amount` dos payables com status `paid`
- `waiting_funds`: soma de `net_amount` dos payables com status `waiting_funds`

## Regras de negocio

- PIX: payable criado com `status = paid`, `payment_date = D+0`, fee de 2,99%
- Cartao de credito: payable com `status = waiting_funds`, `payment_date = D+15`, fee de 8,99%
- Fee calculado sobre `amount` em centavos, com arredondamento (`Math.round`)
- Apenas os 4 ultimos digitos do cartao sao armazenados (`cardLast4`)
- Transacao e payable sao criados atomicamente em transacao SQL (`BEGIN/COMMIT/ROLLBACK`)

## Testes

```bash
# Unitarios e integracao
npm test

# Watch mode
npm run test:watch

# Com cobertura
npm run test:coverage
```

Os testes de integracao requerem banco disponivel na `DATABASE_URL` configurada. Os testes unitarios do service funcionam sem banco (mocks).

## Decisoes de arquitetura

- **Por que raw SQL com `pg` em vez de ORM?** Controle total sobre as queries, sem overhead de abstracao, alinhado com contexto de fintech onde performance e previsibilidade importam.
- **Por que Zod na borda HTTP e no contrato?** Validacao com erros padronizados e regras claras sem biblioteca adicional de validacao no service.
- **Por que transacao de banco explicita?** Garante consistencia entre `transactions` e `payables`, evitando registros orfaos em caso de falha.
