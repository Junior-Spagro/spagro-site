/* SP Agro — unico lugar pra configurar o Supabase.
   Pegar em: Supabase > Project Settings > Data API / API Keys.
   A chave publicavel (sb_publishable_) e publica por natureza — ela vai pro navegador
   de todo visitante de qualquer jeito. O que protege o banco e o RLS do
   supabase-setup.sql, nao o sigilo dela.
   NUNCA colocar aqui a chave secreta (sb_secret_ / service_role). */
window.SB_URL = 'https://huxqtjethudbkkxutpgf.supabase.co';
window.SB_ANON_KEY = 'sb_publishable_eQSU3eTBU_xgMbboixf8uA_QdUlb8Es';
