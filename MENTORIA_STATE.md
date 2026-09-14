# 🧾 MENTORIA_STATE — WindOps API

## Projeto

- Nome: WindOps API
- Stack: NestJS + TypeScript
- Fase atual: 13+ — MVP completo (Fases 4–12 concluídas)
- Nível do aluno: A (iniciante — nunca fez API com NestJS)
- Tutor: OpenCode / Antigravity
- Entrega: 14/09/2026 14:00

## Ambiente

- Node: v24.19.0
- npm: 11.17.0
- Nest CLI: 12.0.0
- Projeto criado: sim (windops-api/)
- Servidor validado: sim (GET / retorna 200 Hello World!)
- Build: ✅ sem erros
- Testes: ✅ 17 unit + 7 e2e passando
- Lint: ✅ 0 warnings / 0 errors

## Decisões

- Organização de módulos: pasta por módulo (src/assets/, src/alerts/)
- Dados iniciais: memória
- Persistência posterior: pendente (Prisma + PostgreSQL/Neon)
- Local da regra de alerta: **função pura** em `src/domain/temperature.ts` (fora de HTTP)
- Estratégia de IDs: assets fornecidos pelo cliente; alertas gerados `AL-001, AL-002...`
- Summary sem dados: `samples: 0`, `averagePowerMw: 0`, `maxTemperatureC: null`
- Formato de respostas: telemetria retorna `{ ...telemetry, severity, alert }`
- 404: tratado dentro do Service via `NotFoundException` (idiomático NestJS)
- 409: ID duplicado em POST /assets
- AlertsModule é importado por AssetsModule (telemetria gera alertas)
- Controllers finos: só delegam ao Service

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

### ADR-003 — Where o 404 é lançado

- Problema: recurso inexistente deve retornar 404
- Opções: controller checa existência vs service lança `NotFoundException`
- Escolha: service lança `NotFoundException` (idiomático no NestJS)
- Motivo: mantém controller fino e centraliza regra "recurso deve existir" em um só lugar
- Reversibilidade: alta

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

Nenhum pendente. (No PowerShell 5.1, `-SkipHttpErrorCheck` não existe — usado try/catch; isso não afeta o projeto.)

## Dívidas técnicas conscientes

- Dados em memória (perdem-se ao reiniciar) — aceito até fase de persistência
- `npm audit` reporta vulnerabilidades em dependências dev (não críticas para o entregável)

## Próxima decisão

Deploy: criar serviço no Render a partir do blueprint + publicar GitHub Pages.

## Último checkpoint

**Fases 4–12 concluídas — MVP funcional** (2026-09-14)
- Regra pura NORMAL/WARNING/CRITICAL implementada e testada
- Telemetria gera alertas WARNING/CRITICAL automaticamente
- Summary, filtros, POST /assets e PATCH status implementados
- Swagger em /docs, testes unit + e2e, build e lint verdes
- Próxima fase: deploy (Render API + GitHub Pages docs) e bônus Prisma opcional