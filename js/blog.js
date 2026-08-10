/* SP Agro — blog publico (listagem + post). Le do Supabase com a anon key. */
(function () {
  "use strict";

  if (!window.SB_URL || window.SB_URL.indexOf('SEU-PROJETO') > -1) {
    /* ponytail: pendencia de config e assunto interno -- o visitante le "em breve", nao o caminho do arquivo.
       A listagem ja traz o card de "em breve" no HTML; so o post avulso precisa da mensagem. */
    var alvo = document.getElementById('postView');
    if (alvo) {
      var p = document.createElement('p');
      p.className = 'blog-empty';
      p.textContent = 'Nosso blog est\u00e1 chegando. Em breve, conte\u00fado t\u00e9cnico sobre forma\u00e7\u00e3o e manejo de pastagens.';
      alvo.textContent = '';
      alvo.appendChild(p);
    }
    return;
  }

  var sb = window.supabase.createClient(window.SB_URL, window.SB_ANON_KEY);

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function data(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /* so http(s), mailto e caminho interno viram link — corta javascript:/data: */
  function endereco(u) {
    return /^(https?:|mailto:|\/|#)/i.test(u) ? u : '#';
  }

  /* ponytail: markdown minimo (titulo, negrito, italico, link, imagem, lista).
     Escapa tudo ANTES — nenhum HTML do editor chega no DOM. */
  function render(txt) {
    var out = esc(txt)
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
        return '<img src="' + endereco(src) + '" alt="' + alt + '" loading="lazy">';
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, txt, href) {
        return '<a href="' + endereco(href) + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/^[-*] (.*)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
    return out.split(/\n{2,}/).map(function (bloco) {
      return /^\s*<(h2|h3|ul|img)/.test(bloco) ? bloco : '<p>' + bloco.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }

  var lista = document.getElementById('postList');
  var artigo = document.getElementById('postView');

  if (lista) {
    lista.innerHTML = '<p class="blog-empty">Carregando…</p>';
    sb.from('posts').select('slug,title,excerpt,cover_url,created_at')
      .eq('published', true).order('created_at', { ascending: false })
      .then(function (r) {
        if (r.error) { lista.innerHTML = '<p class="blog-empty">Não foi possível carregar os posts agora.</p>'; return; }
        if (!r.data.length) { lista.innerHTML = '<p class="blog-empty">Nenhum conteúdo publicado ainda. Em breve.</p>'; return; }
        lista.innerHTML = r.data.map(function (p) {
          return '<article class="post-card">' +
            (p.cover_url ? '<a href="post.html?slug=' + encodeURIComponent(p.slug) + '"><img src="' + esc(p.cover_url) + '" alt="" loading="lazy"></a>' : '') +
            '<div class="post-body">' +
              '<span class="post-date">' + esc(data(p.created_at)) + '</span>' +
              '<h3><a href="post.html?slug=' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a></h3>' +
              '<p>' + esc(p.excerpt) + '</p>' +
              '<a class="post-link" href="post.html?slug=' + encodeURIComponent(p.slug) + '">Ler o conteúdo →</a>' +
            '</div></article>';
        }).join('');
      });
  }

  if (artigo) {
    var slug = new URLSearchParams(location.search).get('slug') || '';
    sb.from('posts').select('title,excerpt,cover_url,content,created_at')
      .eq('slug', slug).eq('published', true).maybeSingle()
      .then(function (r) {
        if (r.error || !r.data) {
          artigo.innerHTML = '<h1>Conteúdo não encontrado</h1><p>Esse post não existe ou saiu do ar.</p><a class="btn btn-outline-dark" href="blog.html">Voltar para o blog</a>';
          return;
        }
        var p = r.data;
        document.title = p.title + ' — SP Agro Sementes';
        var d = document.querySelector('meta[name="description"]');
        if (d && p.excerpt) d.setAttribute('content', p.excerpt);
        artigo.innerHTML = '<span class="post-date">' + esc(data(p.created_at)) + '</span>' +
          '<h1>' + esc(p.title) + '</h1>' +
          (p.excerpt ? '<p class="lead">' + esc(p.excerpt) + '</p>' : '') +
          (p.cover_url ? '<img class="post-cover" src="' + esc(p.cover_url) + '" alt="">' : '') +
          '<div class="post-content">' + render(p.content) + '</div>' +
          '<a class="btn btn-outline-dark" href="blog.html">← Voltar para o blog</a>';
      });
  }
})();
