# ⚡ WindOps API

Backend de Operação e Alertas para Ativos de Energia — **Desafio Individual #3** (NestJS + TypeScript).

API REST que centraliza informações operacionais de ativos de geração renovável: cadastro de ativos, telemetria, classificação de temperatura, alertas e resumos operacionais.

> ⚠️ **Contexto:** simulação de treinamento para o setor de energia. Não é o desafio oficial do Hackathon Proenergia Summit 2026. Os limites de temperatura são fictícios e didáticos.

---

## 📑 Índice

- [Stack](#-stack)
- [Modelo mental](#-%EF%B8%8F-modelo-mental)
- [Domínio](#-domínio)
- [Regra de negócio](#-regra-de-negócio)
- [Endpoints](#-endpoints)
- [Exemplos de uso](#-exemplos-de-uso)
- [Códigos de erro](#-códigos-de-erro)
- [Persistência](#-persistência)
- [Instalação](#%EF%B8%8F-instalação)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Roadmap](#-roadmap)

---

## 🧰 Stack

| Tecnologia | Uso |
|---|---|
| NestJS 12 | Framework backend |
| TypeScript | Linguagem |
| Prisma 6 + SQLite (dev) / PostgreSQL (prod) | ORM e persistência |
| class-validator / class-transformer | Validação de DTOs (ValidationPipe) |
| Swagger / OpenAPI | Documentação interativa em `/docs` |
| Vitest + Supertest | Testes unitários e e2e |

**Persistência atual:** Prisma em PostgreSQL (produção) e SQLite (desenvolvimento local).

---

## 🧠 Modelo mental

```text
HTTP Request
    ↓
Controller  (recebe HTTP, delega)
    ↓
DTO / ValidationPipe  (bloqueia payload inválido → 400)
    ↓
Service  (regra de negócio)
    ↓
Dados  (memória → depois PostgreSQL)
    ↓
HTTP Response
```

**Controller** conhece HTTP e **delega**. **Service** concentra a regra de negócio. **Regra de temperatura** é uma função pura em `src/domain/temperature.ts` — não depende de HTTP nem de NestJS, logo é trivial de testar e reutilizar.

---

## 🗂️ Domínio

### Asset
```json
{
  "id": "WT-001",
  "name": "Aerogerador 01",
  "type": "WIND_TURBINE",
  "status": "ONLINE",
  "ratedPowerMw": 3.2,
  "location": "Parque Demo A"
}
```
- `type`: `WIND_TURBINE` | `SOLAR_ARRAY`
- `status`: `ONLINE` | `ATTENTION` | `MAINTENANCE` | `OFFLINE`

### Telemetry
```json
{
  "assetId": "WT-001",
  "powerMw": 2.7,
  "windSpeedMs": 11.4,
  "temperatureC": 71,
  "timestamp": "2026-09-13T12:00:00.000Z"
}
```
Leitura de sensor que **pertence a um ativo** — não existe sem ele. O cliente envia `powerMw`, `temperatureC` e `timestamp` (`windSpeedMs` é opcional); `assetId`, `severity` e `alert` são **derivados pela API**.

### Alert
```json
{
  "id": "AL-001",
  "assetId": "WT-001",
  "severity": "CRITICAL",
  "type": "HIGH_TEMPERATURE",
  "message": "Temperatura em nível crítico.",
  "timestamp": "2026-09-13T12:00:00.000Z"
}
```
Alerta é **gerado internamente** pela API ao processar telemetria. O cliente **nunca** envia um alerta. `severity` (severidade do alerta) é independente de `status` (estado operacional do ativo).

---

## 📏 Regra de negócio

> Valores fictícios e educacionais — não representam limites reais de aerogeradores.

```text
temperatureC < 75          → NORMAL
75 <= temperatureC < 85    → WARNING
temperatureC >= 85         → CRITICAL
```

Quando `WARNING` ou `CRITICAL`, a API cria um alerta `HIGH_TEMPERATURE`. Classificação **antes** da persistência da leitura.

---

## 🔌 Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verifica se a API está no ar |
| `GET` | `/assets` | Lista ativos (aceita `?status=` e `?type=`) |
| `GET` | `/assets/:id` | Busca ativo por ID (404 se não existir) |
| `POST` | `/assets` | Cria ativo (409 se ID duplicado) |
| `PATCH` | `/assets/:id/status` | Atualiza status do ativo |
| `POST` | `/assets/:id/telemetry` | Registra leitura e classifica temperatura (201) |
| `GET` | `/assets/:id/telemetry` | Lista leituras do ativo |
| `GET` | `/assets/:id/summary` | Resumo operacional do ativo |
| `GET` | `/alerts` | Lista alertas (aceita `?severity=` e `?assetId=`) |

**Documentação interativa (Swagger):** `GET /docs`

---

## 🧪 Exemplos de uso

### 1. Listar ativos com filtro
```bash
curl "http://localhost:3000/assets?type=WIND_TURBINE&status=ONLINE"
```

### 2. Buscar ativo por ID
```bash
curl "http://localhost:3000/assets/WT-001"
```

### 3. Registrar telemetria (gera alerta em WARNING/CRITICAL)
```bash
curl -X POST "http://localhost:3000/assets/WT-001/telemetry" \
  -H "Content-Type: application/json" \
  -d '{
    "powerMw": 2.7,
    "temperatureC": 90,
    "windSpeedMs": 11.4,
    "timestamp": "2026-09-13T12:00:00.000Z"
  }'
```
Resposta (201):
```json
{
  "assetId": "WT-001",
  "powerMw": 2.7,
  "windSpeedMs": 11.4,
  "temperatureC": 90,
  "timestamp": "2026-09-13T12:00:00.000Z",
  "severity": "CRITICAL",
  "alert": {
    "id": "AL-001",
    "assetId": "WT-001",
    "severity": "CRITICAL",
    "type": "HIGH_TEMPERATURE",
    "message": "Temperatura em nível crítico.",
    "timestamp": "2026-09-13T12:00:00.000Z"
  }
}
```

### 4. Resumo do ativo
```bash
curl "http://localhost:3000/assets/WT-001/summary"
```
```json
{
  "assetId": "WT-001",
  "samples": 1,
  "averagePowerMw": 2.7,
  "maxTemperatureC": 90,
  "warningAlerts": 0,
  "criticalAlerts": 1
}
```
> Ativo sem telemetria retorna `samples: 0`, `averagePowerMw: 0` e `maxTemperatureC: null`.

### 5. Listar alertas com filtro
```bash
curl "http://localhost:3000/alerts?severity=CRITICAL"
```

---

## 🚦 Códigos de erro

| Status | Quando |
|---|---|
| `200` | Sucesso em leituras |
| `201` | Recurso criado (telemetria, asset) |
| `400` | Payload inválido — barrado pelo ValidationPipe antes da regra |
| `404` | Recurso inexistente (`asset` não encontrado) |
| `409` | Conflito (ID de asset duplicado) |
| `500` | Erro inesperado (não tratado) |

---

## 💾 Persistência

**ANTES (dados em memória):**
```text
Service
    ↓
Array em memória  ← reiniciou, perdeu
```

**DEPOIS (banco via Prisma):**
```text
Service
    ↓
PrismaService
    ↓
SQLite (dev) / PostgreSQL (produção)
```

### Modelos (schema em `prisma/schema.prisma`)
- **Asset** — ativo; o `id` é a chave primária.
- **Telemetry** — leitura; pertence a um Asset (relação `N:1`).
- **Alert** — alerta; pertence a um Asset (relação `N:1`), gerado na telemetria.

### Pergunta-chave da mentoria
> Se trocarmos o banco, o **Controller** deveria mudar?

Não. Os controllers continuam chamando `assetsService.addTelemetry(...)` como antes — só a implementação interna do Service mudou (de array para `prisma.telemetry.create`). A troca memória → banco ficou encapsulada atrás dos mesmos métodos.

### Desenvolvimento local (SQLite)
```bash
# .env contém: DATABASE_URL="file:./dev.db"
npx prisma migrate dev          # cria/atualiza o banco e aplica migrations
npm run start:dev
```

### Produção (PostgreSQL/Neon)
```bash
# 1. troque o provider no prisma/schema.prisma: sqlite → postgresql
# 2. defina a URL, ex.:
#    DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
# 3. gere a cli e aplique:
npx prisma generate
npx prisma migrate deploy
```

---

## 🛠️ Instalação

```bash
# 1. clone
git clone <seu-repo> windops-api
cd windops-api

# 2. dependências
npm install

# 3. preparar o banco (cria prisma/dev.db + cliente)
npx prisma migrate dev

# 4. desenvolvimento (watch mode)
npm run start:dev

# 5. produção
npm run build && npm run start:prod
```

A API sobe em `http://localhost:3000` (respeita `PORT` se definida). Os 3 ativos de exemplo (`WT-001`, `WT-002`, `PV-001`) são semeados automaticamente no primeiro boot.

---

## 🧪 Testes

```bash
# unitários (regra de temperatura, service de assets — Prisma mockado)
npm run test

# e2e (contratos HTTP completos com SQLite real)
npm run test:e2e

# build de produção
npm run build
```

Cobertura principal do comportamento:
| Caso | Resultado esperado |
|---|---|
| `temperatureC = 70` | `NORMAL`, sem alerta |
| `temperatureC = 80` | `WARNING`, alerta criado |
| `temperatureC = 90` | `CRITICAL`, alerta criado |
| `GET /assets/XYZ` | `404` |
| payload inválido | `400` |
| summary com/sem dados | métricas corretas / zeros + `null` |

---

## 🚀 Deploy

### API (Render) — deploy gratuito
1. Crie um repositório no GitHub com este código.
2. Acesse: `https://dashboard.render.com/blueprint?repo=SEU_USUARIO/SEU_REPO` (o blueprint `render.yaml` já está configurado).
3. Associe um banco PostgreSQL (New → PostgreSQL) e preencha a var `DATABASE_URL` no serviço.
4. Confirme o deploy. A API ficará em `https://windops-api.onrender.com`.

> O comando `npx prisma migrate deploy` já roda no `startCommand` e aplica as migrations automaticamente.

### Documentação (GitHub Pages)
A pasta `docs/` contém uma página Swagger UI estática (carregada por CDN) que consome `docs/openapi.json`.
- No GitHub: **Settings → Pages → Source: Deploy from a branch → `main` → `/docs`**.
- A página fica em `https://SEU_USUARIO.github.io/SEU_REPO/`.

---

## 🗃️ Estrutura do projeto

```text
src/
├── domain/
│   └── temperature.ts          # função pura da regra de classificação
├── prisma/
│   ├── prisma.service.ts       # cliente Prisma (conecta/desconecta)
│   └── prisma.module.ts        # módulo global que expõe o PrismaService
├── assets/
│   ├── dto/
│   │   ├── create-asset.dto.ts
│   │   ├── create-telemetry.dto.ts
│   │   └── update-asset-status.dto.ts
│   ├── assets.controller.ts
│   ├── assets.service.ts
│   └── assets.module.ts
├── alerts/
│   ├── alerts.controller.ts
│   ├── alerts.service.ts
│   └── alerts.module.ts
├── app.controller.ts           # GET /health
├── app.module.ts
└── main.ts                     # bootstrap + ValidationPipe + Swagger
prisma/
│   ├── schema.prisma            # modelos Asset, Telemetry, Alert
│   └── migrations/              # SQL de migração versionado
docs/                           # página estática do Swagger (GitHub Pages)
test/                           # testes e2e
render.yaml                     # blueprint de deploy no Render
```

**Fluxo de dependências (baby):**
```text
PrismaModule (@Global)  →  injeta PrismaService  →  usado por AssetsService e AlertsService
AssetsModule            →  importa AlertsModule   →  telemetria gera alertas
```

**Decisão de arquitetura:** a regra de classificação vive em função pura (fora de HTTP). Serviços usam Prisma e se tornaram `async` (o controller continua igual, só devolvendo Promises). Tudo encapsulado atrás dos mesmos métodos — pronta para trocar de banco sem tocar na camada HTTP.

---

## 🗺️ Roadmap

- [x] `GET /health`
- [x] `GET /assets`, `GET /assets/:id`, 404
- [x] `POST /assets/:id/telemetry` + `GET /assets/:id/telemetry`
- [x] DTOs + ValidationPipe (400)
- [x] Regra NORMAL/WARNING/CRITICAL + geração de alerta
- [x] `GET /alerts`
- [x] `GET /assets/:id/summary`
- [x] Swagger em `/docs`
- [x] Testes (unit + e2e)
- [x] Prisma + SQLite (dev) / PostgreSQL (produção) — persistência real
- [ ] Logs estruturados