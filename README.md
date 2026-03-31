# Predictus - Cadastro Multi-Etapas

Sistema de cadastro em etapas sequenciais com persistência incremental, verificação MFA por e-mail e consulta automática de CEP.

## Requisitos

- **Node.js** 20+
- **Docker** e **Docker Compose** (para PostgreSQL)
- Conta no [Resend](https://resend.com) (para envio de e-mails)

## Estrutura do Projeto

```
├── backend/          # Nest.js + TypeORM + PostgreSQL
├── frontend/         # Next.js + TailwindCSS
├── docker-compose.yml
└── README.md
```

## Passo a Passo para Rodar

### 1. Subir o Banco de Dados

```bash
docker-compose up -d
```

Isso cria um container PostgreSQL na porta `5432` com:
- Usuário: `predictus`
- Senha: `predictus123`
- Banco: `predictus`

### 2. Configurar Variáveis de Ambiente

Copie os arquivos de exemplo e ajuste os valores se necessário:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**Backend** (`backend/.env`):
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=predictus
DATABASE_PASSWORD=predictus123
DATABASE_NAME=predictus

RESEND_API_KEY=re_SUA_CHAVE_AQUI
EMAIL_FROM=onboarding@resend.dev

ABANDONMENT_MINUTES=30
FRONTEND_URL=http://localhost:3000
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3. Instalar Dependências e Rodar o Backend

```bash
cd backend
npm install
npm run start:dev
```

O backend roda em **http://localhost:3001**. O banco é sincronizado automaticamente (TypeORM `synchronize: true`).

### 4. Instalar Dependências e Rodar o Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend roda em **http://localhost:3000**.

### 5. Acessar o Sistema

Abra **http://localhost:3000** no navegador e clique em "Iniciar Cadastro".

## Fluxo de Cadastro

| Etapa | Descrição |
|-------|-----------|
| 1. Identificação | Nome + E-mail |
| 2. Verificação MFA | Código de 6 dígitos enviado por e-mail, com opção de reenvio |
| 3. Documento | CPF ou CNPJ (com validação) |
| 4. Contato | Telefone celular (formato brasileiro) |
| 5. Endereço | CEP (auto-preenchido via ViaCEP) + campos manuais |
| 6. Revisão | Resumo dos dados + botão "Concluir Cadastro" |

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/registrations` | Cria registro (nome + e-mail), envia MFA |
| POST | `/api/registrations/:id/verify-mfa` | Verifica código MFA |
| POST | `/api/registrations/:id/resend-mfa` | Reenvia um novo código MFA |
| PATCH | `/api/registrations/:id/step/document` | Atualiza CPF/CNPJ |
| PATCH | `/api/registrations/:id/step/contact` | Atualiza telefone |
| PATCH | `/api/registrations/:id/step/address` | Atualiza endereço |
| PATCH | `/api/registrations/:id/complete` | Conclui cadastro |
| GET | `/api/registrations/:id` | Consulta registro |
| GET | `/api/cep/:cep` | Consulta CEP via ViaCEP |

## Testes

```bash
cd backend
npm test
```

A suíte do backend cobre:
- Validação de CPF, CNPJ e telefone
- Fluxo do `RegistrationService`, incluindo MFA, etapas do cadastro e finalização
- Provider `ViaCepProvider` (com mock)

## Arquitetura

- **Separação de responsabilidades:** toda regra de negócio no backend; frontend apenas consome serviços.
- **Componentização:** inputs, botões e formulários são componentes reutilizáveis.
- **Mobile-first:** layout responsivo com TailwindCSS.
- **Abstração de providers:** interfaces `EmailProvider` e `CepProvider` permitem trocar fornecedores sem impacto na lógica.
- **Persistência incremental:** cada etapa persiste no banco imediatamente e reutiliza o mesmo rascunho incompleto para o mesmo e-mail, preservando os dados já preenchidos.
- **Fluxo sequencial no backend:** as etapas são validadas no servidor para impedir avanço fora de ordem, mantendo o frontend apenas como consumidor dos serviços.
- **Cron de abandono:** a cada 10 minutos verifica registros sem atualização, envia e-mail de lembrete com link de retomada para `/cadastro?id=<registrationId>` e marca o rascunho como abandonado até nova interação.

## Tecnologias

- **Frontend:** Next.js 14, React 18, TailwindCSS, Lucide Icons, Axios, react-input-mask
- **Backend:** Nest.js 10, TypeORM, PostgreSQL, class-validator, Resend SDK
- **Testes:** Jest
- **Infra:** Docker Compose (PostgreSQL)
