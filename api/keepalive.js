/* SP Agro — mantem o Supabase acordado.
 *
 * Projeto no plano gratuito do Supabase PAUSA sozinho depois de 7 dias sem query,
 * e projeto pausado = blog fora do ar ate alguem logar no painel e clicar restaurar.
 * Como as paginas de post sao estaticas, elas nao consultam o banco — sem isso aqui o
 * blog dormiria justamente por estar funcionando bem.
 *
 * O cron do vercel.json chama esta rota uma vez por dia. Ela le uma linha publica
 * (published = true, o que a policy "posts publicos" ja libera pra anon key).
 */
module.exports = async (req, res) => {
  /* ponytail: so a marca do cron da Vercel. Da pra forjar, mas o pior que alguem
     consegue e fazer o mesmo GET que ja poderia fazer direto no Supabase.
     Se um dia virar incomodo, trocar por CRON_SECRET em variavel de ambiente. */
  if (!/vercel-cron/i.test(req.headers['user-agent'] || '')) {
    return res.status(403).json({ erro: 'so o cron' });
  }

  const url = process.env.SB_URL;
  const chave = process.env.SB_ANON_KEY;
  if (!url || !chave) return res.status(200).json({ ok: false, motivo: 'supabase nao configurado' });

  try {
    const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/posts?select=id&limit=1`, {
      headers: { apikey: chave, Authorization: `Bearer ${chave}` },
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status });
  } catch (e) {
    return res.status(502).json({ ok: false, erro: 'supabase nao respondeu' });
  }
};
