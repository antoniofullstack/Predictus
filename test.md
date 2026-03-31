Requisitos técnicos
Frontend: Next.js
Backend: Nest.js
Banco de Dados: PostgreSQL (utilizar typeORM)
Node.js: versão 20+
Eslint para ajuste automático de indentação no código
Teste unitário (opcional) com jest
Objetivo
Construir um fluxo de cadastro dividido em etapas sequenciais, onde:
A cada etapa concluída, os dados devem ser persistidos no banco de dados.
Se o usuário abandonar o processo, deve ir substituindo o registro novamente se ficar sem concluir, o fluxo deve-se enviar MFA (código de verificação por e-mail para o usuário, pelo Resend ou Sendgrid), e ao abandonar o fluxo deve-se enviar um e-mail convidando a continuar o cadastro.

O sistema deve armazenar informações importantes para geração de relatório como: em que momento iniciou, que momento finalizou e qual última atualização.
Ao finalizar todas as etapas, o usuário deve visualizar uma mensagem de sucesso de cadastro concluído.

Do fluxo (Step by Step)
Identificação → Nome e E-mail
Documento → CPF ou CNPJ
Contato → Telefone (somente celular)
Endereço → CEP (consulta automática via provider, preenchendo os demais campos), todos campos que compõem um endereço
Revisão e Conclusão → Tela com todos os dados + botão “Concluir cadastro” exibindo mensagem de sucesso

Sobre a Arquitetura
Separação de responsabilidades:
Toda a regra de negócio deve ser implementada exclusivamente no backend. O frontend deve apenas consumir os serviços.

Reuso e componentização no frontend:
Os elementos de interface (inputs, botões, formulários, etc.) devem ser componentes e reutilizados em todas as etapas.

Experiência mobile-first:
O fluxo deve ser pensado desde o início para funcionar de forma fluida em dispositivos móveis.

Abstração de fornecedores externos
Qualquer integração com APIs externas (ex.: consulta de CEP) deve ser feita através de interfaces/providers, garantindo que a troca de fornecedor não impacte regras de negócio nem a lógica central do sistema.

Persistência incremental:
Cada etapa deve atualizar o cadastro parcial do usuário no banco, mantendo campos já preenchidos mesmo em caso de abandono.

Testes unitários:
Devem cobrir os principais fluxos no backend (serviços e regras).

Fornecedor gratuito de CEP: https://viacep.com.br/
Fornecedor gratuito para envio de e-mail: https://resend.com/login ou sendgrid.com

Assim que finalizar o projeto, publicar em um git público e me enviar as chaves de uso de fornecedores no .env como resposta neste e-mail para que consiga fazer os testes e analisar, lembrar sempre em documentar passo a passo para utilização e "rodar" o projeto nesse momento.