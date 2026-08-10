#!/usr/bin/env python3
"""SP Agro — build de SEO/AIO. Rodar da raiz do repo:  python3 _seo-build/build_seo.py

Faz quatro coisas, nessa ordem:
  1. gera cultivares/<slug>.html a partir das fichas que moram no app.js (fonte unica —
     mexeu na ficha, roda de novo);
  2. gera blog/<slug>.html a partir dos posts publicados no Supabase. E o ponto do
     blog inteiro: robo de IA nao roda JavaScript, entao post montado no navegador
     e post invisivel. Aqui ele vira HTML de verdade;
  3. gera sitemap.xml com tudo que e publico;
  4. recalcula os hashes SHA-256 de todo bloco <script type="application/ld+json"> e
     reescreve o script-src do vercel.json. Sem isso a CSP ('self', sem unsafe-inline)
     derruba o JSON-LD no console.

O passo 4 SO roda na maquina (o vercel.json entra no commit ja com os hashes).
A Vercel le o vercel.json antes do build comecar, entao reescrever o arquivo durante
o build nao mudaria header nenhum — e por isso que a pagina de post nao leva script
inline: ela nao tem JSON-LD pra hashear. Os metadados dela vao em meta tag, que
CSP nenhuma bloqueia.

Roda na Vercel a cada publicacao (webhook do Supabase -> deploy hook).
ponytail: script de build interno, fica fora do deploy pelo .vercelignore.
"""
import base64
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://spagro.ind.br"
HOJE = date.today().isoformat()
FUSO = ZoneInfo("America/Sao_Paulo")
MESES = ("janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro")


def fichas():
    """Le o objeto `cultivares` do app.js via node — o app.js e a fonte da verdade."""
    js = (RAIZ / "app.js").read_text(encoding="utf-8")
    trecho = re.search(r"var cultivares = \{[\s\S]*?\n  \};", js)
    if not trecho:
        sys.exit("app.js: nao achei o objeto `cultivares` — o gerador precisa dele.")
    saida = subprocess.run(
        ["node", "-e", trecho.group(0) + "\nprocess.stdout.write(JSON.stringify(cultivares))"],
        capture_output=True, text=True, check=True,
    )
    return json.loads(saida.stdout)


def posts():
    """Posts publicados, direto do Supabase.

    Le so `published = true` — e exatamente o que a policy "posts publicos" libera
    pra anon key, entao o build nao precisa de nenhum segredo. A service_role NAO
    entra aqui nunca.

    Devolve None quando o Supabase ainda nao foi configurado (deploy antes de ligar
    o banco: o site sobe sem blog e ninguem quebra). Se estiver configurado e o
    banco nao responder, estoura de proposito: build que falha na Vercel mantem o
    deploy anterior no ar, que e melhor que publicar um site sem os posts.
    """
    url, chave = os.environ.get("SB_URL", ""), os.environ.get("SB_ANON_KEY", "")
    if not url or not chave or "SEU-PROJETO" in url:
        return None

    campos = "slug,title,excerpt,cover_url,content,author,created_at,updated_at"
    req = urllib.request.Request(
        f"{url.rstrip('/')}/rest/v1/posts?select={campos}&published=eq.true&order=created_at.desc",
        headers={"apikey": chave, "Authorization": f"Bearer {chave}"},
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def renderizar(lista):
    """Markdown -> HTML pelo MESMO js/markdown.js que o navegador usa.

    Reimplementar o renderizador em Python daria duas versoes pra manter, e a que
    ficasse pra tras seria justamente a que transforma texto do painel em HTML —
    ou seja, o buraco de XSS. Um renderizador so, dois caminhos identicos.
    """
    if not lista:
        return {}
    fonte = (RAIZ / "js" / "markdown.js").read_text(encoding="utf-8")
    programa = fonte + """
let entrada = '';
process.stdin.on('data', d => entrada += d);
process.stdin.on('end', () => {
  const saida = {};
  for (const p of JSON.parse(entrada)) {
    saida[p.slug] = {
      html: SPMarkdown.render(p.content || ''),
      resumo: (p.excerpt || '').trim() || SPMarkdown.resumir(p.content || '', 155)
    };
  }
  process.stdout.write(JSON.stringify(saida));
});
"""
    r = subprocess.run(["node", "-e", programa], input=json.dumps(lista),
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def datas(p):
    """(ISO publicacao, ISO atualizacao, '10 de agosto de 2026') no fuso de Sao Paulo.

    created_at vem em UTC. Formatar sem converter joga post da noite pro dia
    seguinte — o leitor ve a data errada por algumas horas todo dia.
    """
    def ler(v):
        return datetime.fromisoformat(str(v).replace("Z", "+00:00")).astimezone(FUSO)

    pub = ler(p["created_at"])
    alt = ler(p.get("updated_at") or p["created_at"])
    return pub.isoformat(), alt.isoformat(), f"{pub.day} de {MESES[pub.month - 1]} de {pub.year}"


def esc(t):
    return (t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


HEADER = """<header id="siteHeader">
  <div class="header-inner">
    <a href="/" class="logo" aria-label="SP Agro — início">
      <img src="/images/logo/logo-sp-agro.svg" alt="SP Agro" width="156" height="34">
    </a>
    <nav class="main-nav" id="mainNav">
      <a href="/">Home</a>
      <a href="/#empresa">A Empresa</a>
      <a href="/#estrutura">Estrutura</a>
      <a href="/#produtos">Produtos</a>
      <a href="/#cultivares">Cultivares</a>
      <a href="/blog.html">Blog</a>
      <a href="/#contato">Contato</a>
    </nav>
    <div class="header-cta">
      <a href="/#contato" class="btn btn-primary">Solicitar cotação</a>
      <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false" aria-controls="mainNav">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>"""

RODAPE = """<footer>
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <div class="foot-logo">
          <img src="/images/logo/logo-sp-agro-branco.svg" alt="SP Agro" width="141" height="30">
        </div>
        <p>A SP Agro Sementes é especializada na produção e comercialização de sementes forrageiras de alta qualidade, contribuindo para o desenvolvimento da pecuária brasileira.</p>
      </div>
      <div>
        <h4>Institucional</h4>
        <ul>
          <li><a href="/#empresa">A Empresa</a></li>
          <li><a href="/#estrutura">Estrutura</a></li>
          <li><a href="/#diferenciais">Diferenciais</a></li>
          <li><a href="/blog.html">Blog</a></li>
          <li><a href="/#contato">Contato</a></li>
        </ul>
      </div>
      <div>
        <h4>Produtos</h4>
        <ul>
          <li><a href="/#produtos">Linha Campo</a></li>
          <li><a href="/#produtos">Linha Select</a></li>
          <li><a href="/#produtos">Linha Ultra</a></li>
        </ul>
      </div>
      <div>
        <h4>Cultivares</h4>
        <ul>
{LINKS_RODAPE}
        </ul>
      </div>
      <div>
        <h4>Fale conosco</h4>
        <ul>
          <li><a href="https://wa.me/5517982248863" target="_blank" rel="noopener noreferrer">WhatsApp (17) 98224-8863</a></li>
          <li><a href="tel:+551732421016">(17) 3242-1016</a></li>
          <li><a href="mailto:comercial@spagro.ind.br">comercial@spagro.ind.br</a></li>
          <li>Rod. Feliciano Salles da Cunha, km 459 — Zona Rural, Neves Paulista - SP, 15127-899</li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© 2026 SP Agro Sementes. Todos os direitos reservados.</span>
      <a href="/">Voltar para o site</a>
    </div>
  </div>
</footer>

<a class="wa-float" href="https://wa.me/5517982248863?text=Ol%C3%A1%2C%20quero%20cota%C3%A7%C3%A3o%20de%20sementes%20SP%20Agro." target="_blank" rel="noopener noreferrer" aria-label="Falar com a SP Agro no WhatsApp">
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29z"/></svg>
</a>

<script src="/app.js"></script>"""


def pagina_cultivar(slug, c, todos):
    nome, especie, intro = c["name"], c["species"], c["intro"]
    url = f"{SITE}/cultivares/{slug}.html"
    # o binomio limpo, sem o "syn." e sem o cv. — usado no title e no schema
    binomio = especie.split(" (syn")[0].split(" cv.")[0].strip()
    title = f"Semente de Capim {nome} ({binomio}) — ficha técnica | SP Agro"
    desc = (f"Ficha técnica da semente de capim {nome}: fertilidade de solo, produção de matéria seca, "
            f"tempo de formação, altura de manejo e proteína bruta. Sementes forrageiras de fabricação própria — SP Agro.")

    specs_html = "\n".join(
        f"      <dt>{esc(k)}</dt><dd>{esc(v)}</dd>" for k, v in c["specs"]
    )
    adv_html = "\n".join(f"      <li>{esc(a)}</li>" for a in c["adv"])
    outros = "\n".join(
        f'        <li><a href="/cultivares/{s}.html">Capim {d["name"]}</a></li>'
        for s, d in todos.items() if s != slug
    )
    links_rodape = "\n".join(
        f'          <li><a href="/cultivares/{s}.html">{d["name"]}</a></li>'
        for s, d in todos.items()
    )

    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": f"Semente de Capim {nome}",
        "alternateName": [f"{nome}", binomio, f"Semente de {binomio}"],
        "description": intro,
        "category": "Sementes forrageiras para pastagem",
        "image": f"{SITE}/images/cultivares/{slug}.jpg",
        "url": url,
        "brand": {"@type": "Brand", "name": "SP Agro Sementes"},
        "manufacturer": {"@type": "Organization", "name": "SP Agro Sementes", "url": SITE + "/"},
        "additionalProperty": [
            {"@type": "PropertyValue", "name": k, "value": v} for k, v in c["specs"]
        ],
        "offers": {
            "@type": "Offer",
            "url": f"{SITE}/#contato",
            "priceCurrency": "BRL",
            "availability": "https://schema.org/InStock",
            "priceSpecification": {
                "@type": "PriceSpecification",
                "priceCurrency": "BRL",
                "valueAddedTaxIncluded": True,
            },
            "seller": {"@type": "Organization", "name": "SP Agro Sementes", "url": SITE + "/"},
        },
    }
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "SP Agro", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Cultivares", "item": SITE + "/#cultivares"},
            {"@type": "ListItem", "position": 3, "name": f"Capim {nome}", "item": url},
        ],
    }

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta property="og:type" content="product">
<meta property="og:site_name" content="SP Agro Sementes">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/images/og-sp-agro.jpg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
<meta name="twitter:image" content="{SITE}/images/og-sp-agro.jpg">
<!-- CSP vem do header HTTP (vercel.json). Pagina gerada por _seo-build/build_seo.py — nao editar a mao. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(breadcrumb, ensure_ascii=False)}</script>
</head>
<body class="pagina-interna">

{HEADER}

<section class="pagina-hero">
  <div class="wrap">
    <nav class="migalha" aria-label="Você está em">
      <a href="/">SP Agro</a> › <a href="/#cultivares">Cultivares</a> › <span>{esc(nome)}</span>
    </nav>
    <span class="eyebrow">Cultivar</span>
    <h1>Semente de capim {esc(nome)}</h1>
    <p class="species-hero">{esc(especie)}</p>
    <p class="lead">{esc(intro)}</p>
  </div>
</section>

<section class="section-pad">
  <div class="wrap ficha-wrap">
    <div class="ficha-corpo">
      <h2>Ficha técnica do capim {esc(nome)}</h2>
      <dl class="cult-specs">
{specs_html}
      </dl>

      <h2>Vantagens do capim {esc(nome)}</h2>
      <ul class="cult-adv">
{adv_html}
      </ul>

      <h2>Como comprar semente de {esc(nome)} na SP Agro</h2>
      <p>A SP Agro fabrica a semente de capim {esc(nome)} na própria unidade industrial de Neves Paulista, no interior de São Paulo, e entrega para produtores e revendas de todo o Brasil. A cultivar está disponível nas três linhas da empresa: <strong>Campo</strong> (sementes em palha), <strong>Select</strong> e <strong>Ultra</strong> (sementes tratadas e revestidas).</p>
      <p>Para receber cotação, informe a quantidade em hectares ou em quilos e a região de entrega.</p>
      <div class="ficha-acoes">
        <a class="btn btn-primary" href="https://wa.me/5517982248863?text=Ol%C3%A1%2C%20quero%20cota%C3%A7%C3%A3o%20de%20semente%20de%20capim%20{esc(nome)}." target="_blank" rel="noopener noreferrer">Pedir cotação no WhatsApp</a>
        <a class="btn btn-outline-dark" href="/#contato">Falar com a equipe</a>
      </div>
    </div>

    <aside class="ficha-lado">
      <img src="/images/cultivares/{slug}.jpg" alt="Pastagem de capim {esc(nome)}" width="480" height="480" loading="lazy">
      <h3>Outras cultivares</h3>
      <ul class="ficha-links">
{outros}
      </ul>
      <h3>Conteúdo técnico</h3>
      <p><a href="/blog.html">Blog SP Agro</a> — formação e manejo de pastagem, qualidade de semente e produtividade no campo.</p>
    </aside>
  </div>
</section>

{RODAPE.replace("{LINKS_RODAPE}", links_rodape)}
</body>
</html>
"""


def gerar_paginas(todos):
    pasta = RAIZ / "cultivares"
    pasta.mkdir(exist_ok=True)
    for slug, c in todos.items():
        (pasta / f"{slug}.html").write_text(pagina_cultivar(slug, c, todos), encoding="utf-8")
    return [f"/cultivares/{s}.html" for s in todos]


def pagina_post(p, corpo, resumo, todos):
    """Pagina do post — HTML de verdade, sem depender de JavaScript.

    Sem <script type="application/ld+json"> aqui: a CSP e header do vercel.json, que a
    Vercel le ANTES do build, entao um hash calculado agora nunca chegaria no header e o
    bloco morreria bloqueado. O que o robo precisa (titulo, resumo, data, autor, imagem)
    vai em meta tag e em HTML semantico, que passa em qualquer CSP.
    """
    slug, titulo = p["slug"], p["title"]
    url = f"{SITE}/blog/{slug}.html"
    publicado, alterado, data_br = datas(p)
    capa = p.get("cover_url") or f"{SITE}/images/og-sp-agro.jpg"
    autor = (p.get("author") or "SP Agro Sementes").strip()

    links_rodape = "\n".join(
        f'          <li><a href="/cultivares/{s}.html">{d["name"]}</a></li>'
        for s, d in todos.items()
    )
    outros = "\n".join(
        f'        <li><a href="/cultivares/{s}.html">Capim {d["name"]}</a></li>'
        for s, d in todos.items()
    )

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(titulo)} | Blog SP Agro</title>
<meta name="description" content="{esc(resumo)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="{esc(autor)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="SP Agro Sementes">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(resumo)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{esc(capa)}">
<meta property="article:published_time" content="{publicado}">
<meta property="article:modified_time" content="{alterado}">
<meta property="article:author" content="{esc(autor)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(titulo)}">
<meta name="twitter:description" content="{esc(resumo)}">
<meta name="twitter:image" content="{esc(capa)}">
<!-- CSP vem do header HTTP (vercel.json). Pagina gerada por _seo-build/build_seo.py — nao editar a mao. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css">
</head>
<body class="pagina-interna">

{HEADER}

<section class="pagina-hero">
  <div class="wrap">
    <nav class="migalha" aria-label="Você está em">
      <a href="/">SP Agro</a> › <a href="/blog.html">Blog</a> › <span>{esc(titulo)}</span>
    </nav>
    <span class="eyebrow">Conteúdo técnico</span>
    <h1>{esc(titulo)}</h1>
    <p class="lead">{esc(resumo)}</p>
  </div>
</section>

<section class="section-pad">
  <div class="wrap ficha-wrap">
    <article class="ficha-corpo post-artigo">
      <p class="post-date"><time datetime="{publicado}">{esc(data_br)}</time> · por {esc(autor)}</p>
{f'      <img class="post-cover" src="{esc(capa)}" alt="{esc(titulo)}" loading="lazy">' if p.get("cover_url") else ""}
      <div class="post-content">
{corpo}
      </div>
      <div class="ficha-acoes">
        <a class="btn btn-primary" href="https://wa.me/5517982248863?text=Ol%C3%A1%2C%20quero%20cota%C3%A7%C3%A3o%20de%20sementes%20SP%20Agro." target="_blank" rel="noopener noreferrer">Pedir cotação no WhatsApp</a>
        <a class="btn btn-outline-dark" href="/blog.html">← Voltar para o blog</a>
      </div>
    </article>

    <aside class="ficha-lado">
      <h3>Cultivares SP Agro</h3>
      <ul class="ficha-links">
{outros}
      </ul>
      <h3>Fale com a fábrica</h3>
      <p>A SP Agro produz e beneficia semente forrageira em Neves Paulista (SP) e entrega para todo o Brasil. <a href="/#contato">Peça sua cotação</a>.</p>
    </aside>
  </div>
</section>

{RODAPE.replace("{LINKS_RODAPE}", links_rodape)}
</body>
</html>
"""


SLUG_OK = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def gerar_posts(lista, todos):
    """Escreve blog/<slug>.html e limpa post que saiu do ar / virou rascunho.

    O slug vira caminho de arquivo, entao ele e conferido aqui mesmo com o banco ja
    barrando (o CHECK do supabase-setup.sql): dado que vem de fora vira nome de
    arquivo, e isso e fronteira de confianca — "../index" escreveria em cima da home.
    """
    lista = [p for p in (lista or []) if SLUG_OK.match(p.get("slug") or "")]

    pasta = RAIZ / "blog"
    pasta.mkdir(exist_ok=True)
    if not lista:
        # nada publicado: nao deixa pagina orfa indexada pra tras
        for velho in pasta.glob("*.html"):
            velho.unlink()
        return []

    conteudo = renderizar(lista)
    vivos = set()
    for p in lista:
        c = conteudo[p["slug"]]
        (pasta / f"{p['slug']}.html").write_text(
            pagina_post(p, c["html"], c["resumo"], todos), encoding="utf-8")
        vivos.add(f"{p['slug']}.html")

    for velho in pasta.glob("*.html"):
        if velho.name not in vivos:
            velho.unlink()

    return [f"/blog/{p['slug']}.html" for p in lista]


def gerar_sitemap(rotas_cultivar, rotas_post=()):
    urls = [("/", "1.0", "monthly"), ("/blog.html", "0.7", "weekly")]
    urls += [(r, "0.8", "monthly") for r in rotas_cultivar]
    urls += [(r, "0.7", "monthly") for r in rotas_post]
    itens = "\n".join(
        f"  <url>\n    <loc>{SITE}{loc}</loc>\n    <lastmod>{HOJE}</lastmod>\n"
        f"    <changefreq>{freq}</changefreq>\n    <priority>{pri}</priority>\n  </url>"
        for loc, pri, freq in urls
    )
    (RAIZ / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{itens}\n</urlset>\n", encoding="utf-8")
    return len(urls)


def atualizar_csp():
    """Coleta o hash de cada bloco JSON-LD e reescreve o script-src do vercel.json.

    So faz sentido na maquina: o vercel.json vai pro commit ja com os hashes certos.
    Rodando dentro do build da Vercel seria escrever num arquivo que ja foi lido —
    por isso blog/ nao entra no glob, as paginas de post nao tem script inline.
    """
    hashes = set()
    for html in list(RAIZ.glob("*.html")) + list(RAIZ.glob("cultivares/*.html")):
        for bloco in re.findall(
            r'<script type="application/ld\+json">([\s\S]*?)</script>', html.read_text(encoding="utf-8")
        ):
            digest = hashlib.sha256(bloco.encode("utf-8")).digest()
            hashes.add(f"'sha256-{base64.b64encode(digest).decode()}'")

    fonte = " ".join(["'self'"] + sorted(hashes))
    caminho = RAIZ / "vercel.json"
    conf = caminho.read_text(encoding="utf-8")
    novo = re.sub(r"script-src [^;]+;", f"script-src {fonte};", conf)
    caminho.write_text(novo, encoding="utf-8")
    return len(hashes)


INTERNO = ("supabase-setup.sql", "README.md", "_seo-build", ".vercelignore")


def na_vercel():
    """Build de verdade da Vercel, nao um VERCEL=1 solto no terminal de casa.

    O caminho /vercel/ so existe na maquina de build deles. Sem essa segunda
    condicao, testar o build local com VERCEL=1 apaga arquivo do repo — aconteceu.
    """
    return bool(os.environ.get("VERCEL")) and str(RAIZ).startswith("/vercel/")


def limpar_interno():
    """Tira material interno da pasta que vira o site.

    Com buildCommand a Vercel copia a raiz inteira pro deploy, e o .vercelignore
    nao vale pra todo tipo de deploy. Sem isso o esquema do banco volta a ficar
    publico em /supabase-setup.sql — ja foi bug de verdade (commit 7b59ebc0).
    """
    import shutil
    apagados = []
    for nome in INTERNO:
        alvo = RAIZ / nome
        if not alvo.exists():
            continue
        shutil.rmtree(alvo) if alvo.is_dir() else alvo.unlink()
        apagados.append(nome)
    return apagados


if __name__ == "__main__":
    todos = fichas()
    rotas = gerar_paginas(todos)

    publicados = posts()
    if publicados is None:
        print("blog: Supabase nao configurado (SB_URL/SB_ANON_KEY) — site sobe sem posts.")
    rotas_post = gerar_posts(publicados or [], todos)

    n_urls = gerar_sitemap(rotas, rotas_post)

    if na_vercel():
        n_hash = "pulado (build da Vercel — vercel.json ja foi lido)"
        fora = limpar_interno()
    else:
        n_hash = f"{atualizar_csp()} hashes de JSON-LD"
        fora = []

    print(f"cultivares: {len(rotas)} paginas · blog: {len(rotas_post)} posts · "
          f"sitemap: {n_urls} urls · CSP: {n_hash}")
    if fora:
        print("fora do deploy: " + ", ".join(fora))
