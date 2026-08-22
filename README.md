# SELVA+

> A rede social dos aventureiros. Explore. Registre. Compartilhe. Preserve.

MVP responsivo/PWA para trilhas, trekking, montanhismo, cachoeiras, camping e colaboração ambiental. Usa Next.js, React, TypeScript, Tailwind, MapLibre/OpenFreeMap e Supabase/PostGIS.

## Estado do MVP

- Interface inicial virgem: sem usuários, fotos, estatísticas, trilhas, posts, grupos ou eventos fictícios.
- Sessão Supabase persistente, cadastro, login, recuperação de senha e OAuth preparado para Google/Apple.
- Feed real paginado com atividades, mapas, fotos privadas por URL assinada, curtidas, comentários e salvos.
- Mapa MapLibre/OpenFreeMap com localização consentida e descoberta de trilhas por proximidade via PostGIS.
- Atividade GPS real com cronômetro, pausa, distância, ritmo, elevação, retomada e fila offline em IndexedDB.
- Finalização e publicação sincronizam atividade, pontos GPS em lotes, post e fotos no Supabase.
- Perfil, resumo semanal, estatísticas, grupos, eventos, pesquisa global e ocorrências ambientais conectados ao banco.
- Migrations PostgreSQL/PostGIS com índices geoespaciais, contadores transacionais, RLS e Storage privado.
- Manifest PWA e experiência responsiva de 360 px a desktop.

## Instalação e execução

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. `NEXT_PUBLIC_SUPABASE_ANON_KEY` permanece aceito apenas por compatibilidade. Nunca exponha uma service-role/secret key no frontend.

## Configuração Supabase

1. Crie um projeto exclusivo para o SELVA+.
2. Aplique, nesta ordem, todas as migrations em `supabase/migrations/`.
3. Opcionalmente aplique `supabase/seed.sql`; ele cadastra somente a definição das conquistas, sem criar usuários ou conteúdo social.
4. Configure URL e chave pública em `.env.local`.
5. Habilite Google/Apple em Authentication quando tiver as credenciais OAuth.
6. Adicione os domínios de produção e preview às redirect URLs do Auth.
7. Mantenha `activity-photos` privado; o app entrega fotos conforme a visibilidade por URLs temporárias.

## Deploy Vercel

O arquivo `vercel.json` mantém um build Next.js dedicado ao Vercel sem alterar o build Vinext usado pelo Sites.

1. Importe o repositório do GitHub no Vercel.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Opcionalmente configure `NEXT_PUBLIC_MAP_TOKEN` caso troque o mapa padrão por Mapbox.
4. Faça o deploy com o preset Next.js; o comando de build já está definido.

O backend continuará sendo o Supabase quando o app Expo for criado.

## Evolução mobile

Mover `app/types` e `app/services` para `packages/types` e `packages/api`, criando `apps/web` e `apps/mobile` (Expo Router). Para GPS em background, use consentimento explícito e armazenamento transacional. O SELVA+ não substitui serviços oficiais de emergência.

## Scripts

- `npm run dev`: ambiente local Vinext/Vite.
- `npm run build`: build verificado da versão Sites.
- `npx next build`: build Next.js usado pelo Vercel.
- `npm run lint`: análise estática.
- `npm test`: build e teste do HTML renderizado.

## Segurança

- Todas as tabelas do Supabase possuem Row Level Security.
- Funções de trigger usam `search_path` fixo e não ficam executáveis pelo cliente.
- Papéis administrativos de grupos não podem ser autoatribuídos.
- Fotos de atividades respeitam a visibilidade pública, seguidores ou privada.
- A service-role key não é usada no frontend nem faz parte das variáveis públicas.
- Localização precisa, pontos inicial/final e visibilidade ficam sob controle do usuário.
- O SELVA+ não substitui serviços oficiais de emergência.
