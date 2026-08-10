/* SP Agro — markdown do blog. UM renderizador so, usado nos dois caminhos:
   - no navegador (js/blog.js), enquanto o post ainda nao virou pagina estatica;
   - no build (_seo-build/build_seo.py roda este arquivo no node) pra gerar /blog/<slug>.html.

   Duas implementacoes divergiriam, e a que ficasse pra tras vira o buraco de XSS.
   Regra do arquivo: escapa TUDO primeiro, so depois monta tag. Nenhum HTML escrito
   no painel chega vivo no DOM — o que o Junio digita e sempre texto. */
(function (raiz) {
  "use strict";

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* so http(s), mailto e caminho interno viram link — corta javascript:/data: */
  function endereco(u) {
    return /^(https?:|mailto:|\/|#)/i.test(u) ? u : '#';
  }

  /* markdown minimo: titulo, negrito, italico, link, imagem, lista. */
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

  /* texto puro pra meta description quando o post nao tem resumo */
  function resumir(txt, limite) {
    var limpo = String(txt || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#*_`>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (limpo.length <= limite) return limpo;
    return limpo.slice(0, limite).replace(/\s+\S*$/, '') + '…';
  }

  raiz.SPMarkdown = { esc: esc, endereco: endereco, render: render, resumir: resumir };
})(typeof globalThis !== 'undefined' ? globalThis : this);
