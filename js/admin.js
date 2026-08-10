/* SP Agro — painel do blog. Login por e-mail/senha (usuario criado no painel do Supabase).
   Quem controla o acesso e o RLS no banco, nao esse arquivo. */
(function () {
  "use strict";

  if (!window.SB_URL || window.SB_URL.indexOf('SEU-PROJETO') > -1) {
    /* ponytail: pagina publica -- nada de stack, nome de arquivo nem passo de configuracao na tela.
       Quem precisa do detalhe tem o vault; o visitante le so que esta indisponivel. */
    document.body.innerHTML = '<div class="adm-login"><div class="adm-box"><h1>Painel indispon\u00edvel</h1>' +
      '<p>O painel ainda n\u00e3o est\u00e1 dispon\u00edvel. Fale com o respons\u00e1vel pelo site.</p></div></div>';
    return;
  }

  var sb = window.supabase.createClient(window.SB_URL, window.SB_ANON_KEY);

  var telaLogin = document.getElementById('telaLogin');
  var telaPainel = document.getElementById('telaPainel');
  var formLogin = document.getElementById('formLogin');
  var erroLogin = document.getElementById('erroLogin');
  var quemSou = document.getElementById('quemSou');
  var formPost = document.getElementById('formPost');
  var listaAdmin = document.getElementById('listaAdmin');
  var avisoPost = document.getElementById('avisoPost');
  var campos = {
    id: document.getElementById('postId'),
    title: document.getElementById('title'),
    slug: document.getElementById('slug'),
    excerpt: document.getElementById('excerpt'),
    cover: document.getElementById('cover_url'),
    content: document.getElementById('content'),
    published: document.getElementById('published')
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function aviso(txt, ruim) {
    avisoPost.textContent = txt;
    avisoPost.className = 'aviso' + (ruim ? ' ruim' : ' bom');
    setTimeout(function () { avisoPost.className = 'aviso'; }, 4000);
  }

  function slugificar(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  }

  /* Manda no display direto em vez de usar o atributo hidden.
     hidden so vale por display:none do navegador, entao qualquer display escrito no
     CSS ganha dele e a tela "escondida" continua na frente — foi exatamente o que
     aconteceu: .adm-login tem display:flex e ficava por cima do painel depois do login.
     Aqui quem manda no estado e o JS, sem depender de nenhuma folha de estilo. */
  function ver(el, visivel, comoMostrar) {
    el.hidden = !visivel;
    el.style.display = visivel ? (comoMostrar || 'block') : 'none';
  }

  function mostrar(sessao) {
    var logado = !!sessao;
    ver(telaLogin, !logado, 'flex');
    ver(telaPainel, logado, 'block');
    if (logado) {
      quemSou.textContent = sessao.user.email;
      carregar();
    }
  }

  /* Se o boot quebrar, o Junio precisa ler o motivo — nao ficar olhando pra uma tela
     parada sem saber se e a internet, a senha ou o site. */
  function falhou(msg) {
    erroLogin.textContent = msg;
  }

  sb.auth.getSession()
    .then(function (r) { mostrar(r.data.session); })
    .catch(function () { falhou('Não foi possível falar com o servidor. Recarregue a página.'); });

  formLogin.addEventListener('submit', function (e) {
    e.preventDefault();
    erroLogin.textContent = '';
    sb.auth.signInWithPassword({
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('senha').value
    }).then(function (r) {
      if (r.error) { erroLogin.textContent = 'E-mail ou senha inválidos.'; return; }
      mostrar(r.data.session);
    });
  });

  document.getElementById('sair').addEventListener('click', function () {
    sb.auth.signOut().then(function () { location.reload(); });
  });

  campos.title.addEventListener('blur', function () {
    if (!campos.slug.value && campos.title.value) campos.slug.value = slugificar(campos.title.value);
  });

  document.getElementById('arquivoCapa').addEventListener('change', function (e) {
    var arq = e.target.files[0];
    if (!arq) return;
    var nome = Date.now() + '-' + slugificar(arq.name.replace(/\.[^.]+$/, '')) + (arq.name.match(/\.[^.]+$/) || ['.jpg'])[0];
    aviso('Enviando imagem...');
    sb.storage.from('blog').upload(nome, arq, { cacheControl: '31536000' }).then(function (r) {
      if (r.error) { aviso('Falha no upload: ' + r.error.message, true); return; }
      campos.cover.value = sb.storage.from('blog').getPublicUrl(nome).data.publicUrl;
      aviso('Imagem enviada.');
    });
  });

  function limpar() {
    formPost.reset();
    campos.id.value = '';
    document.getElementById('tituloForm').textContent = 'Novo post';
  }
  document.getElementById('novo').addEventListener('click', limpar);

  formPost.addEventListener('submit', function (e) {
    e.preventDefault();
    var dados = {
      title: campos.title.value.trim(),
      /* sempre pela slugificar: o slug vira nome de arquivo e caminho no site, entao
         nao pode sair daqui com barra, acento ou espaco. O banco tambem barra (CHECK),
         mas aqui o Junio nem chega a ver o erro. */
      slug: slugificar(campos.slug.value.trim() || campos.title.value),
      excerpt: campos.excerpt.value.trim(),
      cover_url: campos.cover.value.trim() || null,
      content: campos.content.value,
      published: campos.published.checked
    };
    if (!dados.title || !dados.content) { aviso('Título e conteúdo são obrigatórios.', true); return; }

    var q = campos.id.value
      ? sb.from('posts').update(dados).eq('id', campos.id.value)
      : sb.from('posts').insert(dados);

    q.then(function (r) {
      if (r.error) {
        aviso(r.error.code === '23505' ? 'Já existe um post com esse endereço (slug).' : 'Erro ao salvar: ' + r.error.message, true);
        return;
      }
      aviso(dados.published ? 'Publicado.' : 'Salvo como rascunho.');
      limpar();
      carregar();
    });
  });

  function carregar() {
    sb.from('posts').select('id,slug,title,published,created_at')
      .order('created_at', { ascending: false })
      .then(function (r) {
        if (r.error) { listaAdmin.innerHTML = '<p>Erro ao carregar: ' + esc(r.error.message) + '</p>'; return; }
        if (!r.data.length) { listaAdmin.innerHTML = '<p>Nenhum post ainda.</p>'; return; }
        listaAdmin.innerHTML = r.data.map(function (p) {
          return '<div class="adm-item">' +
            '<div><b>' + esc(p.title) + '</b><small>/' + esc(p.slug) + ' · ' +
              new Date(p.created_at).toLocaleDateString('pt-BR') + '</small></div>' +
            '<span class="tag ' + (p.published ? 'on' : 'off') + '">' + (p.published ? 'publicado' : 'rascunho') + '</span>' +
            '<button type="button" data-editar="' + p.id + '">Editar</button>' +
            '<button type="button" class="apagar" data-apagar="' + p.id + '">Excluir</button>' +
          '</div>';
        }).join('');
      });
  }

  listaAdmin.addEventListener('click', function (e) {
    var editar = e.target.getAttribute('data-editar');
    var apagar = e.target.getAttribute('data-apagar');

    if (editar) {
      sb.from('posts').select('*').eq('id', editar).single().then(function (r) {
        if (r.error) return;
        var p = r.data;
        campos.id.value = p.id;
        campos.title.value = p.title;
        campos.slug.value = p.slug;
        campos.excerpt.value = p.excerpt || '';
        campos.cover.value = p.cover_url || '';
        campos.content.value = p.content;
        campos.published.checked = p.published;
        document.getElementById('tituloForm').textContent = 'Editando: ' + p.title;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    if (apagar && confirm('Excluir esse post de vez?')) {
      sb.from('posts').delete().eq('id', apagar).then(function (r) {
        if (r.error) { aviso('Erro ao excluir: ' + r.error.message, true); return; }
        aviso('Post excluído.');
        carregar();
      });
    }
  });
})();
