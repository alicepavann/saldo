# saldo. — painel de finanças pessoais

Painel pessoal com gastos, orçamento, cartões, investimentos, metas e análise com IA. Os dados vêm das suas contas via Open Finance (Meu Pluggy). A spec completa está no doc "Spec — Painel de Finanças Pessoais".

> **Estado atual: protótipo (Fase 1).** Todas as telas funcionam com **dados de exemplo** gerados localmente. Ainda não há conexão com Pluggy, Supabase ou Claude API.

## Rodar no localhost

Pré-requisito: Node.js 20.9 ou mais novo (`node -v`).

```bash
npm install
npm run dev
```

Abra http://localhost:3333. A tela de login (`/login`) é só visual por enquanto; o painel abre direto.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Build de produção (o mesmo que a Vercel roda) |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários dos cálculos (Vitest) |

## Estrutura

```
src/
  app/
    (app)/            telas do painel (com sidebar): início, transações, orçamento,
                      cartões, investimentos, metas, análise, configurações
    login/            tela de login (magic link)
    api/cron/daily/   rota chamada pela Vercel Cron (stub até a Fase 2)
  components/         shell, gráficos, primitivas de UI, modo "ocultar valores"
  lib/
    compute.ts        cálculos puros (resumo do mês, orçamento, assinaturas,
                      carteira × CDI, reserva, metas) + testes
    data.ts           ponto único de acesso a dados (mock agora, Supabase depois)
    mock.ts           dados de exemplo determinísticos
supabase/migrations/  schema com as 17 tabelas, RLS e views
```

## Design

- Tema escuro com neutros levemente quentes; **rosa `#f2689c`** só como cor de detalhe (item ativo, dado em destaque, foco, alertas suaves).
- Tipografia Geist com números tabulares; sem gradientes chamativos nem sombras pesadas.
- Gráficos em rosa + cinzas (sem arco-íris), feitos com Recharts.
- Botão de olho no topo esconde todos os valores (fica salvo no navegador).
- Responsivo: sidebar no desktop e barra inferior no celular.

## Publicar na Vercel

1. Suba o projeto para um repositório **privado** no GitHub.
2. Em vercel.com › Add New › Project, importe o repositório (o framework Next.js é detectado sozinho).
3. Em Settings › Environment Variables, cadastre: `DATA_SOURCE=pluggy`, `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_IDS`, `GROQ_API_KEY`, `APP_PASSWORD`, `AUTH_SECRET` e `CRON_SECRET`.
4. Deploy. Sem `APP_PASSWORD` o site responde 503 de propósito: ele nunca fica aberto sem senha.

O `vercel.json` coloca as funções em São Paulo (`gru1`) e agenda o cron diário às 06:00 (horário de Brasília).

## Atalhos

| Tecla | O que faz |
| --- | --- |
| `Ctrl K` ou `/` | Busca: transações, telas e ações |
| `←` `→` | Mês anterior / próximo (Início, Transações, Orçamento) |

## Próximas fases

1. **Fase 2 — Sync Pluggy:** implementar `DATA_SOURCE=supabase` em `src/lib/data.ts`, o cliente Pluggy e a rota `/api/cron/daily`.
2. Login real com Supabase Auth (magic link restrito ao `OWNER_EMAIL`) via `src/proxy.ts`.
3. Relatório mensal com a Claude API usando os mesmos agregados que a tela Análise já mostra em "O que é enviado para a IA".

Copie `.env.example` para `.env.local` quando chegar a hora de conectar os serviços.
