
# D'GRAU APOSTAS - REALTIME ARCHITECTURE

Sistema de apostas esportivas escalável com sincronização em tempo real.

## Arquitetura Obrigatória
- **Frontend/Backend**: Next.js 14 (Simulado via React SPA no protótipo).
- **Database**: Supabase (PostgreSQL).
- **Realtime**: Supabase Realtime (Postgres Changes).
- **Segurança**: Row Level Security (RLS) configurado.

## Como Conectar o Supabase
1. Crie um projeto em [supabase.com](https://supabase.com).
2. Execute o conteúdo de `schema.sql` no **SQL Editor**.
3. Obtenha as chaves em **Project Settings > API**.
4. Configure as variáveis de ambiente baseadas no `.env.example`.

## Como Rodar Localmente
1. Instale as dependências: `npm install`.
2. Configure o arquivo `.env.local` com suas chaves Supabase.
3. Inicie o projeto: `npm run dev`.

## Como funciona o Real Time
O componente `App.tsx` utiliza o hook `useEffect` para criar canais de escuta (`supabase.channel`). Quando o ADMIN altera o nome de um time ou o horário de um jogo no banco de dados, o Supabase emite um sinal capturado por todos os clientes conectados. O estado (`matches`, `users`, etc.) é atualizado instantaneamente, forçando o React a renderizar as novas informações sem recarregar a página.

## Deploy no Vercel
1. Conecte seu repositório GitHub ao Vercel.
2. Adicione as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas configurações de ambiente do projeto no Vercel.
3. Clique em **Deploy**.
