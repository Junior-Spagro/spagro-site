# Site SP Agro Sementes

Site institucional em `spagro.ind.br`. HTML, CSS e JavaScript direto, sem framework.
Hospedado na Vercel — **todo push na `main` publica sozinho**.

---

## Como publicar um post no blog

1. Abra **spagro.ind.br/admin.html** e entre com seu e-mail e senha.
2. Preencha **Título** (o endereço do post se preenche sozinho).
3. **Resumo** — duas linhas. É o que aparece na listagem e no Google. Se deixar vazio,
   o site monta um a partir do começo do texto — melhor escrever.
4. **Imagem de capa** — clique em escolher arquivo e suba a foto. JPG, PNG ou WebP, até 5 MB.
   > Use sempre o botão de upload. Colar o endereço de uma imagem de outro site não funciona:
   > a proteção do site só exibe imagem que está no servidor da SP Agro.
5. **Conteúdo** — texto normal. Linha em branco separa parágrafo. Para formatar:

   | Você escreve | Vira |
   |---|---|
   | `## Subtítulo` | um subtítulo |
   | `**palavra**` | **negrito** |
   | `*palavra*` | *itálico* |
   | `- item` | item de lista |
   | `[texto](https://site.com)` | link |

6. Marque **Publicar no site**. Desmarcado, fica salvo como rascunho e ninguém vê.
7. **Salvar**.

O post aparece no blog na hora. Em cerca de um minuto ele também vira uma página
própria, que é o que o Google e o ChatGPT conseguem ler. Não precisa fazer mais nada.

**Editar ou excluir:** na lista embaixo do formulário, botões *Editar* e *Excluir*.
Excluir é definitivo.

---

## Para quem mexe no código

### Estrutura

```
index.html          página principal
blog.html           listagem do blog
post.html           post montado no navegador (rede de segurança, ver abaixo)
admin.html          painel de publicação
app.js              JS do site + fichas das cultivares (fonte da verdade)
css/site.css        todo o estilo
js/markdown.js      renderizador do texto do post — usado no navegador E no build
js/blog.js          blog no navegador
js/admin.js         painel
js/sb-config.js     endereço e chave pública do Supabase
api/keepalive.js    cron diário que impede o Supabase de hibernar
_seo-build/         gerador de páginas (não vai pro site)
supabase-setup.sql  esquema do banco — rodar uma vez, no SQL Editor do Supabase
```

### Arquivos gerados — não editar à mão

`cultivares/*.html`, `blog/*.html`, `sitemap.xml` e o `script-src` do `vercel.json`
saem do `_seo-build/build_seo.py`. Editar na mão é perder tudo no próximo build.

- **cultivares** saem do objeto `cultivares` no `app.js` → mexeu na ficha, rode o build e **commite**.
- **blog** sai dos posts publicados no Supabase → gerado a cada deploy, **não vai pro git**.

```bash
python3 _seo-build/build_seo.py   # precisa de python3 e node
node _seo-build/test_markdown.js  # checa o renderizador (XSS)
```

Rodar o build local sem `SB_URL`/`SB_ANON_KEY` no ambiente é seguro: ele avisa que o
Supabase não está configurado e gera o site sem os posts.

### Por que o post vira página estática

Robô de IA não executa JavaScript. Post montado no navegador é post invisível para
ChatGPT, Perplexity e companhia — e o blog existe justamente para posicionar a marca.
Por isso cada post publicado vira um HTML de verdade em `/blog/<slug>.html`.

O `post.html` continua existindo como rede de segurança: o rewrite do `vercel.json`
manda para ele qualquer `/blog/...` que ainda não tenha arquivo estático. É a janela
entre "o Junio clicou publicar" e "o rebuild terminou". O leitor nunca vê 404.

### Por que não tem JSON-LD na página de post

A CSP é header do `vercel.json`, e a Vercel lê esse arquivo **antes** do build começar.
Um hash calculado durante o build nunca chegaria no header, e o bloco
`<script type="application/ld+json">` morreria bloqueado. Então a página de post não usa
script inline: título, resumo, data, autor e imagem vão em meta tag, que passa em qualquer CSP.

### Segurança do blog

Dois cadeados, nessa ordem — o primeiro é do painel do Supabase, não do código:

1. **Authentication > Providers > Email: signup desligado.** A chave pública do site fica
   no `js/sb-config.js` por natureza. Com o cadastro aberto, qualquer visitante criaria
   conta e viraria usuário autenticado.
2. **Tabela `blog_admins`.** As policies exigem estar nela. Estar logado, sozinho, não
   dá direito de escrever nada.

Todo texto de post é escapado antes de virar HTML (`js/markdown.js`), nos dois caminhos —
navegador e build. Se mexer nesse arquivo, rode `node _seo-build/test_markdown.js`.

Material interno (`supabase-setup.sql`, este README, `_seo-build/`) é removido do deploy
pelo próprio build. O esquema do banco já ficou público uma vez — não repetir.

### Supabase hiberna

Projeto no plano gratuito pausa sozinho depois de 7 dias sem consulta, e pausado significa
blog fora do ar. O cron diário do `vercel.json` chama `/api/keepalive`, que dá um oi no banco.
Se um dia migrar para o plano pago, esse cron pode sair.

### Variáveis de ambiente na Vercel

| Nome | Para quê |
|---|---|
| `SB_URL` | endereço do projeto Supabase — usado no build e no keepalive |
| `SB_ANON_KEY` | chave pública (`anon`). **Nunca** a `service_role` |

### Publicar mudança de código

```bash
git add -A && git commit -m "o que mudou" && git push
```

A Vercel publica sozinha. Quando um post é publicado no painel, um webhook do Supabase
dispara o mesmo processo sem precisar de commit.

### Por que este repositório é público

Não é descuido — é o que destrava o blog.

A conta Vercel é do plano **Hobby**, que não permite colaboração em repositório **privado**.
Enquanto o repo era privado, a Vercel só construía se o autor do commit no `HEAD` fosse o
dono do time: qualquer commit de outra pessoa fazia todo build a partir do git morrer antes
de começar (`readyState: BLOCKED`, zero log) — **e o Deploy Hook do blog morria junto**, ou
seja, publicar post deixava de virar página. Em repositório público a colaboração é livre e
a restrição não existe.

Isso é seguro porque não há segredo aqui. Todo o `images/`, `css/`, `js/` e HTML já é servido
para qualquer visitante. A chave do Supabase no `js/sb-config.js` é a `anon`, **pública por
natureza** — ela vai para o navegador de todo mundo de qualquer jeito. Quem protege o banco é
o RLS rodando no servidor, mais os dois cadeados descritos acima; ler o `supabase-setup.sql`
não dá acesso a nada.

O que **não** pode entrar aqui: a `service_role` do Supabase, qualquer token da Vercel ou do
GitHub, e arquivo `.env` (já coberto pelo `.gitignore`).
