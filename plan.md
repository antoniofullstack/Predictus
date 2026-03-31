# Plano: Fluxo de Cadastro Multi-Etapas (Predictus)

Construir um sistema de cadastro em etapas sequenciais com persistência incremental, verificação por e-mail (MFA) e consulta automática de CEP, usando Next.js, Nest.js, PostgreSQL/TypeORM.

---

## 1. Setup Inicial do Projeto

- **Backend (Nest.js):** Inicializar projeto com `@nestjs/cli`, configurar TypeORM com PostgreSQL, ESLint, e estrutura de pastas (modules, services, controllers, entities, providers).
- **Frontend (Next.js):** Inicializar projeto com `create-next-app`, configurar TailwindCSS, ESLint, e estrutura de componentes reutilizáveis.
- **Docker Compose:** Criar `docker-compose.yml` com serviço PostgreSQL para facilitar o ambiente local.
- **Variáveis de ambiente:** `.env` e `.env.example` com chaves de banco, Resend/SendGrid, etc.

## 2. Backend — Modelagem e Banco de Dados

- **Entidade `Registration`:** Campos: `id`, `name`, `email`, `document` (CPF/CNPJ), `documentType`, `phone`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `currentStep` (enum: IDENTIFICATION, DOCUMENT, CONTACT, ADDRESS, REVIEW), `status` (enum: IN_PROGRESS, COMPLETED, ABANDONED), `mfaCode`, `mfaVerified`, `startedAt`, `completedAt`, `updatedAt`.
- **Migration:** Gerar e rodar migration inicial via TypeORM CLI.

## 3. Backend — API REST (Endpoints)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/registrations` | Cria registro (etapa 1: nome + e-mail). Envia MFA por e-mail. |
| POST | `/registrations/:id/verify-mfa` | Verifica código MFA recebido por e-mail. |
| PATCH | `/registrations/:id/step/document` | Atualiza documento (CPF/CNPJ). |
| PATCH | `/registrations/:id/step/contact` | Atualiza telefone celular. |
| PATCH | `/registrations/:id/step/address` | Atualiza endereço completo. |
| PATCH | `/registrations/:id/complete` | Marca cadastro como concluído. |
| GET | `/registrations/:id` | Retorna dados atuais do registro (para retomada). |
| GET | `/cep/:cep` | Consulta CEP via provider externo. |

## 4. Backend — Regras de Negócio (Services)

- **RegistrationService:**
  - Criar registro com persistência incremental por etapa.
  - Se o e-mail já existir com status `IN_PROGRESS`, **substituir** o registro anterior.
  - Gerar e enviar código MFA (6 dígitos) por e-mail ao iniciar.
  - Registrar timestamps: `startedAt`, `updatedAt`, `completedAt`.
- **Validações:**
  - CPF/CNPJ válido (algoritmo de dígitos verificadores).
  - Telefone celular (formato brasileiro, 11 dígitos, DDD + 9xxxx-xxxx).
  - CEP válido (8 dígitos).
- **Abandono:** Job/cron que detecta registros `IN_PROGRESS` sem atualização por X minutos e envia e-mail convidando a retomar.

## 5. Backend — Providers / Abstração de Fornecedores

- **`EmailProvider` (interface):** Métodos `sendMfaCode(email, code)` e `sendAbandonmentReminder(email, link)`. Implementações: `ResendEmailProvider` ou `SendGridEmailProvider`, selecionável via config.
- **`CepProvider` (interface):** Método `lookup(cep)`. Implementação: `ViaCepProvider` (https://viacep.com.br/).
- Injeção de dependência via módulos Nest.js, permitindo troca de fornecedor sem impacto na lógica.

## 6. Frontend — Componentes Reutilizáveis

- **`TextInput`** — campo de texto genérico com label, máscara, erro.
- **`MaskedInput`** — extensão para CPF/CNPJ, telefone, CEP.
- **`Button`** — botão primário/secundário com loading state.
- **`StepIndicator`** — indicador de progresso das etapas.
- **`FormStep`** — wrapper de layout para cada etapa (título, campos, botão avançar).
- **`SuccessScreen`** — tela final de conclusão.

## 7. Frontend — Páginas / Fluxo (Mobile-First)

- **Página única `/cadastro`** com estado controlado por step:
  1. **Identificação** — Nome + E-mail → POST `/registrations` → Tela de verificação MFA.
  2. **Documento** — CPF ou CNPJ (toggle) → PATCH `/step/document`.
  3. **Contato** — Telefone celular com máscara → PATCH `/step/contact`.
  4. **Endereço** — CEP (auto-preenche via GET `/cep/:cep`) + campos manuais → PATCH `/step/address`.
  5. **Revisão** — Exibe todos os dados + botão "Concluir cadastro" → PATCH `/complete` → `SuccessScreen`.
- **Layout responsivo mobile-first** com TailwindCSS. Max-width para desktop.

## 8. Testes Unitários (Jest)

- **Backend:**
  - `RegistrationService` — fluxo completo, substituição de registro, validações.
  - Validadores de CPF/CNPJ, telefone.
  - `ViaCepProvider` — mock de resposta.
  - `EmailProvider` — mock de envio.
- **Frontend (opcional):** Testes de componentes com React Testing Library.

## 9. Documentação e Entrega

- **README.md** com passo a passo para rodar o projeto (backend, frontend, banco).
- **`.env.example`** com todas as variáveis necessárias.
- Publicar em repositório Git público.

---

## Ordem de Execução Sugerida

1. Setup dos projetos (backend + frontend + docker-compose)
2. Entidade + migration do banco
3. Providers (CEP + E-mail)
4. Service + Controller do backend (endpoints)
5. Cron de abandono
6. Componentes reutilizáveis do frontend
7. Páginas do fluxo step-by-step
8. Testes unitários
9. README e documentação final
