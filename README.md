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

### Atalho recomendado (setup completo)

O projeto possui bootstrap automatizado em `src/scripts/bootstrap.sh`:

```bash
# Instala dependencias, cria/atualiza .env, sobe banco, roda migracoes e inicia API
npm run setup

# Mesmo fluxo, sem iniciar a API no final
npm run setup:only
```

### Cenario A - banco via Docker e app local

```bash
# 1. Subir banco
npm run db:up

# 2. Configurar variaveis de ambiente
cp .env.example .env
# Edite DATABASE_URL se necessario

# 3. Aplicar migracao
npm run db:migrate

# 4. Iniciar servidor
npm run dev
```

Servidor: `http://localhost:3001`

### Cenario B - tudo via Docker Compose (previsto na spec)

```bash
docker compose up --build
```

Observacao: no estado atual, o `docker-compose.yml` versiona apenas o servico de PostgreSQL. Para executar a API localmente hoje, use o Cenario A ou `npm run setup`.

## Variaveis de ambiente

| Variavel | Padrao | Descricao |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/challenger` | String de conexao PostgreSQL |
| `PORT` | `3001` | Porta HTTP da aplicacao |

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
