# 🧾 MENTORIA_STATE — WindOps API

## Projeto

- Nome: WindOps API
- Stack: NestJS + TypeScript
- Fase atual: 14+ — Persistência com Prisma concluída (bônus)
- Nível do aluno: A (iniciante — nunca fez API com NestJS)
- Tutor: OpenCode / Antigravity
- Entrega: 14/09/2026 14:00

## Ambiente

- Node: v24.19.0
- npm: 11.17.0
- Nest CLI: 12.0.0
- Prisma: 6.19.3 (SQLite em dev / PostgreSQL em produção)
- Projeto criado: sim (windops-api/)
- Servidor validado: sim (GET / retorna 200 Hello World!)
- Build: ✅ sem erros
- Testes: ✅ 16 unit + 7 e2e passando
- Lint: ✅ 0 warnings / 0 errors

## Decisões

- Organização de módulos: pasta por módulo (src/assets/, src/alerts/)
- Dados: **Prisma** (SQLite em dev, PostgreSQL/Neon em produção)
- Local da regra de alerta: **função pura** em `src/domain/temperature.ts` (fora de HTTP)
- Estratégia de IDs: assets fornecidos pelo cliente; alertas gerados `AL-001...` via leitura do maior ID existente (evita colisão com dados persistidos)
- Summary sem dados: `samples: 0`, `averagePowerMw: 0`, `maxTemperatureC: null`
- Formato de respostas: telemetria retorna `{ ...telemetry, severity, alert }`
- 404: tratado dentro do Service via `NotFoundException` (idiomático NestJS)
- 409: ID duplicado em POST /assets
- AlertsModule é importado por AssetsModule (telemetria gera alertas)
- Controllers finos: só delegam ao Service
- Prisma 6 (em vez do 8 RC): CLI nova do 8 era instável/incompatível com fluxo `migrate dev` tradicional; 6 é estável e amplamente documentado
- Seed automático dos 3 ativos no primeiro boot (`ensureSeedData` no `onApplicationBootstrap`)

## ADRs leves

### ADR-001 — Estrutura de pastas: flat vs pasta por módulo

- Problema: onde colocar controllers, services e modules de cada domínio
- Opções: flat (tudo em src/) ou pasta por módulo (src/assets/, src/alerts/)
- Critérios: legibilidade, escalabilidade, padrão NestJS
- Recomendação: pasta por módulo
- Escolha: pasta por módulo
- Motivo: 3 domínios (assets, alerts, health) — flat viraria bagunça rapidamente
- Consequência: cada domínio tem sua própria pasta com controller + service + module
- Reversibilidade: alta (só mover arquivos)

### ADR-002 — Onde fica a regra de temperatura

- Problema: classificação NORMAL/WARNING/CRITICAL pode morar em várias camadas
- Opções: Controller, Service, DTO ou função pura
- Critério: testabilidade, reuso fora de HTTP, separação de responsabilidade
- Escolha: função pura `classifyTemperature()` em `src/domain/temperature.ts`
- Motivo: não depende de HTTP nem de NestJS; testável com exemplo trivial (70/80/90); pode ser chamada por fila/job/teste no futuro
- Reversibilidade: alta (mover import)

### ADR-003 — Onde o 404 é lançado

- Problema: recurso inexistente deve retornar 404
- Opções: controller checa existência vs service lança `NotFoundException`
- Escolha: service lança `NotFoundException` (idiomático no NestJS)
- Motivo: mantém controller fino e centraliza regra "recurso deve existir" em um só lugar
- Reversibilidade: alta

### ADR-004 — Prisma + SQLite (dev) / PostgreSQL (produção)

- Problema: persistir dados sem depender de uma conta externa durante o desenvolvimento
- Opções: (A) SQLite em dev + Postgres em produção, (B) Neon/Postgres direto
- Critério: validável imediatamente, didático, caminho claro para produção
- Escolha: A — SQLite local (`file:./dev.db`) com mesmo schema Prisma; em produção troca provider para `postgresql` + `DATABASE_URL` e roda `prisma migrate deploy`
- Motivo: mesmo código, sem bloquear em cadastro de conta; aluno roda tudo local
- Reversibilidade: alta (mudar provider + URL no deploy)

### ADR-005 — Geração de ID de alerta

- Problema: ID `AL-001` colidia com dados persistidos entre execuções
- Opções: `count()+1` vs ler IDs existentes e achar o maior
- Escolha: ler IDs existentes (`findMany select id`) e incrementar o maior
- Motivo: `count()` não reflete IDs apagados e quebrou no banco persistente (bug P2002)
- Reversibilidade: média (formato `AL-xxx` mantido)

## Conceitos consolidados

- API REST: ponto central de comunicação entre sistemas via HTTP
- Verbos HTTP: GET (busca), POST (cria), PATCH (altera parcialmente)
- Status HTTP: 200, 201, 400, 404, 409, 500 — significado de cada um compreendido
- Asset: ativo físico com status operacional próprio
- Telemetry: leitura de sensor que PERTENCE a um ativo (não existe sem ele)
- Alert: gerado INTERNAMENTE pela API ao processar telemetria; cliente não envia alerta
- severity ≠ status: são conceitos independentes
- Regra de classificação (<75 NORMAL, 75-85 WARNING, ≥85 CRITICAL) é calculada, não recebida
- Decorator (@Controller, @Get, @Module, @Injectable): anotam classes e métodos para o NestJS
- Module: agrupa controller + service; é o organograma do departamento
- Controller: recebe HTTP, delega ao Service, nunca faz o trabalho
- Service: contém a lógica; marcado com @Injectable()
- Injeção de Dependência: NestJS injeta o Service no Controller via constructor (sem new)
- main.ts: ponto de entrada; sobe servidor na porta 3000
- DTO: contrato de entrada do payload
- ValidationPipe: barra payload inválido (400) ANTES da regra de negócio
- Map: estrutura chave→valor usada para telemetria por ativo
- Função pura: sem efeitos colaterais, testável isoladamente
- import type: necessário em assinaturas decoradas (isolatedModules + emitDecoratorMetadata)
- Swagger/OpenAPI: contrato consumível por terceiros (GET /docs)

## Evidências

### Setup
- start:dev: ✅ npm run start:dev funcionando
- health: ✅ GET /health → 200 {"status":"ok"}
- build: ✅ npm run build sem erros
- lint: ✅ npm run lint 0 warnings / 0 errors

### Persistência (Prisma)
- schema: ✅ prisma/schema.prisma (Asset, Telemetry, Alert)
- migration: ✅ prisma/migrations/20260914131946_init aplicada
- dev.db: ✅ criado e usado em dev/testes
- POST telemetria 90°C → ✅ 201, severity CRITICAL, alerta AL-xxx gerado e PERSISTIDO
- summary após persistência: ✅ samples 1, critical 1, max 90
- 404: ✅ GET /assets/XYZ → 404
- prisma generate: ✅

### Assets
- lista: ✅ GET /assets → 200 (retorna 3 ativos)
- por ID: ✅ GET /assets/WT-001 → 200 (retorna asset)
- 404: ✅ GET /assets/XYZ → 404 com mensagem
- POST /assets: ✅ 201 (cria); 409 (duplicado)
- PATCH status: pendente de validar manualmente (testado via contrato)
- filtros: ✅ ?status= & ?type= implementados

### Telemetry
- POST válido: ✅ /assets/WT-001/telemetry com 90°C → 201, severity CRITICAL + alerta AL-001
- POST inválido: ✅ {"powerMw":"muito","temperatureC":"quente"} → 400 (mensagens de validação)
- GET: ✅ confirmado no teste e2e

### Alerts
- NORMAL: ✅ 70°C → NORMAL, sem alerta (unit)
- WARNING: ✅ 80°C → WARNING, alerta criado (unit)
- CRITICAL: ✅ 90°C → CRITICAL, alerta criado (unit + e2e)
- listagem: ✅ GET /alerts → 200 lista alertas; filtros ?severity= & ?assetId=

### Summary
- com dados: ✅ samples 1, averagePowerMw 2.7, maxTemperatureC 90, criticalAlerts 1
- sem dados: ✅ samples 0, averagePowerMw 0, maxTemperatureC null

### Swagger
- rota: ✅ GET /docs (HTML) e GET /docs-json (aberto.json)
- endpoints: ✅ todos documentados

### Testes
- regra: ✅ 7 casos (70/74/75/80/84/85/90)
- service: ✅ 9 casos (404, NORMAL/WARNING/CRITICAL, summary com/sem dados)
- e2e: ✅ 7 casos (health, assets, 404, 400, fluxo completo)

### Deploy
- GitHub Pages: documentação Swagger estática em docs/ (pendente de publicar)
- Render: blueprint render.yaml pronto (pendente de criar o serviço na conta do aluno)

## Bugs conhecidos

- Resolvido: colisão de ID de alerta (`AL-001`) com dados persistidos — corrigido lendo o maior ID existente (ADR-005). Nenhum pendente.

## Dívidas técnicas conscientes

- SQLite em dev em vez de PostgreSQL local (escolha didática, ADR-004)
- `npm audit` reporta vulnerabilidades em dependências dev (não críticas para o entregável)
- Geração de ID de alerta por leitura+scan não é ideal sob alta concorrência (ok para o objetivo didático)

## Próxima decisão

Opcional: logs estruturados; subir no Render com PostgreSQL.

## Último checkpoint

**Fase 14 — Persistência com Prisma concluída (bônus)** (2026-09-14)
- Prisma 6 + SQLite em dev; caminho documentado para PostgreSQL em produção
- PrismaService/Module global; AssetsService e AlertsService migrados para Prisma (async)
- Controllers praticamente inalterados (só `async`) — resposta à pergunta "o controller deveria mudar?"
- Bug P2002 de ID de alerta encontrado e corrigido via ADR-005
- Testes: 16 unit (Prisma mockado) + 7 e2e (SQLite real) verdes; build e lint verdes
- Swagger enriquecido (@ApiTags, @ApiOperation, @ApiQuery); openapi.json regenerado
- Próximo: subir API no Render (PostgreSQL) e/ou logs estruturados