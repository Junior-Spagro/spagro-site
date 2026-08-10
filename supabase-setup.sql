-- SP Agro — blog. Rodar UMA vez no SQL Editor do Supabase.
--
-- ORDEM DOS PASSOS (nao pular o 1):
--   1. Authentication > Providers > Email: DESLIGAR "Allow new users to sign up".
--      A anon key fica publica em js/sb-config.js (por design). Com signup aberto,
--      qualquer visitante cria conta, vira "authenticated" e passa a poder escrever
--      e APAGAR posts. Desligar o signup e o primeiro cadeado.
--   2. Rodar este arquivo no SQL Editor.
--   3. Authentication > Users > Add user (e-mail + senha do Junio).
--   4. Copiar o UID do usuario criado e rodar:
--        insert into public.blog_admins (user_id) values ('COLE-O-UID-AQUI');
--      Sem esse passo ninguem escreve — nem o Junio. E de proposito: as policies
--      exigem estar nesta tabela, entao "estar logado" sozinho nao basta (2o cadeado).

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  -- o slug vira nome de arquivo (blog/<slug>.html) no gerador de paginas. Sem esta
  -- restricao, um slug com "/" ou ".." escreveria fora da pasta do blog e podia
  -- sobrescrever a home. Barrar aqui vale pra qualquer coisa que escreva na tabela.
  slug        text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title       text not null,
  excerpt     text default '',
  cover_url   text,
  content     text not null default '',
  published   boolean not null default false,
  author      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists posts_published_idx on public.posts (published, created_at desc);

-- quem pode publicar. Fora desta tabela, logado nao significa nada.
create table if not exists public.blog_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.blog_admins enable row level security;
-- ninguem le nem escreve esta tabela pelo navegador: sem policy = sem acesso via anon key.
-- (a funcao abaixo e security definer, entao ela enxerga a tabela mesmo assim)

create or replace function public.e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blog_admins where user_id = auth.uid());
$$;

alter table public.posts enable row level security;

-- leitura publica: so post publicado
drop policy if exists "posts publicos" on public.posts;
create policy "posts publicos" on public.posts
  for select using (published = true);

-- admin do blog (usuario listado em blog_admins) faz tudo
drop policy if exists "admin le tudo" on public.posts;
create policy "admin le tudo" on public.posts
  for select to authenticated using (public.e_admin());

drop policy if exists "admin escreve" on public.posts;
create policy "admin escreve" on public.posts
  for insert to authenticated with check (public.e_admin());

drop policy if exists "admin edita" on public.posts;
create policy "admin edita" on public.posts
  for update to authenticated using (public.e_admin()) with check (public.e_admin());

drop policy if exists "admin apaga" on public.posts;
create policy "admin apaga" on public.posts
  for delete to authenticated using (public.e_admin());

-- updated_at automatico
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists posts_touch on public.posts;
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();

-- bucket das imagens de capa. Teto de 5 MB e so imagem: o accept do <input> e enfeite,
-- quem barra upload de arquivo qualquer e o bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog', 'blog', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "capa leitura publica" on storage.objects;
create policy "capa leitura publica" on storage.objects
  for select using (bucket_id = 'blog');

drop policy if exists "capa upload admin" on storage.objects;
create policy "capa upload admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'blog' and public.e_admin());

drop policy if exists "capa apaga admin" on storage.objects;
create policy "capa apaga admin" on storage.objects
  for delete to authenticated using (bucket_id = 'blog' and public.e_admin());

-- ---------------------------------------------------------------------------
-- Rebuild automatico: publicou/editou/apagou post -> Vercel gera o HTML estatico.
-- E o que faz o cliente ser autonomo. Sem isso o post existe no banco mas nunca
-- vira pagina indexavel.
--
-- Feito com pg_net puro em vez do "Database Webhooks" do painel: menos peca movel
-- e fica versionado aqui, entao recriar o projeto nao perde o comportamento.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net;

create or replace function public.avisa_vercel() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare mexeu boolean;
begin
  -- rascunho nao dispara: o autor salva varias vezes enquanto escreve, e cada
  -- disparo e uma build inteira. So interessa o que o leitor pode ver.
  mexeu := case tg_op
    when 'INSERT' then new.published
    when 'DELETE' then old.published
    else new.published or old.published
  end;
  if mexeu then
    perform net.http_post(
      url := 'https://api.vercel.com/v1/integrations/deploy/prj_IjrDHlcY0HT1cZruTUq42TIY9JNR/Zv4odRds1R',
      body := '{}'::jsonb
    );
  end if;
  return null;
end $fn$;

drop trigger if exists posts_rebuild on public.posts;
create trigger posts_rebuild
after insert or update or delete on public.posts
for each row execute function public.avisa_vercel();
