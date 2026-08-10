/* Check do renderizador do blog:  node _seo-build/test_markdown.js
 *
 * E o unico ponto do site onde texto digitado por gente vira HTML. Se algum dia
 * alguem "melhorar" o js/markdown.js, e aqui que quebra antes de ir pro ar.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

require('vm').runInThisContext(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'markdown.js'), 'utf8')
);
const { render, resumir } = globalThis.SPMarkdown;

// formatacao normal continua funcionando
assert.match(render('## Titulo'), /<h2>Titulo<\/h2>/);
assert.match(render('a **b** c'), /<strong>b<\/strong>/);
assert.match(render('a *b* c'), /<em>b<\/em>/);
assert.match(render('- um\n- dois'), /<ul><li>um<\/li>\n<li>dois<\/li><\/ul>/);
assert.match(render('[x](https://spagro.ind.br)'), /href="https:\/\/spagro\.ind\.br"/);
assert.match(render('linha um\n\nlinha dois'), /<p>linha um<\/p>[\s\S]*<p>linha dois<\/p>/);

// nada que o autor digitar pode virar tag viva
const hostil = render(
  '<script>alert(1)</script>\n\n' +
  '<img src=x onerror=alert(1)>\n\n' +
  '[a](javascript:alert(1))\n\n' +
  '![](javascript:alert(2))\n\n' +
  "[b](data:text/html,<script>alert(3)</script>)"
);
assert.ok(!/<script/i.test(hostil), 'script cru sobreviveu ao render');
assert.ok(!/onerror=/i.test(hostil.replace(/&lt;[^&]*&gt;/g, '')), 'atributo de evento sobreviveu');
assert.ok(!/(href|src)="javascript:/i.test(hostil), 'javascript: virou link');
assert.ok(!/(href|src)="data:/i.test(hostil), 'data: virou link');
assert.match(hostil, /href="#"/, 'link hostil devia cair pra #');

// resumo pra meta description: sem marcacao, cortado no espaco
const r = resumir('## Titulo\n\nTexto **com** marca e [link](https://x.com).', 20);
assert.ok(!/[#*\[\]]/.test(r), 'resumo saiu com marcacao: ' + r);
assert.ok(r.length <= 21, 'resumo passou do limite: ' + r);

console.log('markdown ok');
