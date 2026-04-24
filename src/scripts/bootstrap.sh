
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="$ROOT_DIR/.env"
DEFAULT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/challenger"

echo "==> Validando pre-requisitos..."
command -v npm >/dev/null 2>&1 || {
  echo "Erro: npm não encontrado no PATH."
  exit 1
}
command -v docker >/dev/null 2>&1 || {
  echo "Erro: docker não encontrado no PATH."
  exit 1
}

echo "==> Instalando dependências..."
npm install

if [ ! -f "$ENV_FILE" ]; then
  echo "==> Criando .env com DATABASE_URL padrão..."
  cat > "$ENV_FILE" <<EOF
DATABASE_URL=$DEFAULT_DATABASE_URL
PORT=3001
EOF
else
  echo "==> .env já existe, mantendo arquivo atual."
  CURRENT_DATABASE_URL="$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d'=' -f2- || true)"
  if [ -z "$CURRENT_DATABASE_URL" ]; then
    echo "==> DATABASE_URL ausente no .env. Adicionando valor padrão..."
    {
      echo "DATABASE_URL=$DEFAULT_DATABASE_URL"
      cat "$ENV_FILE"
    } > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
  elif [ "$CURRENT_DATABASE_URL" = "postgresql://postgres:postgres@localhost:5432/pagouia" ]; then
    echo "==> Atualizando DATABASE_URL legada para banco challenger..."
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=$DEFAULT_DATABASE_URL|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"
  fi
fi

echo "==> Reiniciando banco para garantir ambiente limpo..."
docker compose down -v --remove-orphans >/dev/null 2>&1 || true

echo "==> Subindo banco com Docker..."
npm run db:up

echo "==> Aguardando Postgres ficar pronto..."
for i in {1..30}; do
  if docker exec challenger-postgres pg_isready -U postgres -d challenger >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if docker exec challenger-postgres pg_isready -U postgres -d challenger >/dev/null 2>&1; then
  true
else
  echo "Erro: Postgres não ficou pronto a tempo."
  exit 1
fi

echo "==> Aplicando migrações..."
npm run db:migrate

if [ "${1:-}" = "--no-start" ]; then
  echo "==> Setup concluído. API não iniciada (--no-start)."
  exit 0
fi

echo "==> Iniciando API em modo desenvolvimento..."
npm run dev
