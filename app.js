(function () {
  "use strict";

  /* ponytail: ?embed=1 = servido dentro do iframe do Wix, que nao rola sozinho.
     La o quadro tem a altura inteira do site, entao 100vh vira a pagina toda e
     position:fixed gruda no iframe em vez da janela. A classe desliga os dois no
     CSS. Fora do embed nada muda. */
  if (location.search.indexOf('embed') !== -1) {
    document.documentElement.classList.add('embed');
  }

  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('mainNav');
  if (toggle && nav) {
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
  }

  // Fichas técnicas fornecidas pela SP Agro (jul/2026), conferidas contra a literatura
  // Embrapa. Ordem dos specs = ordem de exibição no modal.
  var cultivares = {
    marandu: {
      name: 'Marandu',
      species: 'Urochloa brizantha (syn. Brachiaria brizantha) cv. Marandu',
      intro: 'Uma das forrageiras mais cultivadas no Brasil, reconhecida pela alta produtividade, excelente adaptação às condições tropicais e elevado desempenho na pecuária de corte e leite. Destaca-se pela formação de pastagens duradouras, boa capacidade de rebrota, alta aceitação pelos animais e excelente relação entre produção e qualidade da forragem.',
      specs: [
        ['Fertilidade do solo', 'Média a alta'],
        ['Precipitação mínima anual', '≥ 800 mm'],
        ['Hábito de crescimento', 'Cespitoso (touceiras), ereto'],
        ['Produção de matéria seca', '10 a 18 t MS/ha/ano'],
        ['Resistência', 'Boa tolerância à seca e às cigarrinhas-das-pastagens'],
        ['Profundidade de plantio', '2 a 4 cm'],
        ['Tempo de formação', '60 a 90 dias'],
        ['Proteína bruta (MS)', '8% a 16%'],
        ['Palatabilidade', 'Alta'],
        ['Altura de manejo', 'Entrada: 30 a 35 cm · Saída: 15 a 20 cm']
      ],
      adv: ['Alta produção de forragem', 'Excelente persistência da pastagem', 'Elevada capacidade de suporte animal', 'Boa resposta à adubação', 'Alta adaptação às condições tropicais', 'Indicada para sistemas de corte e leite']
    },
    mombaca: {
      name: 'Mombaça',
      species: 'Megathyrsus maximus (syn. Panicum maximum) cv. Mombaça',
      intro: 'Forrageira de alto potencial produtivo, indicada para sistemas pecuários intensivos. Destaca-se pela elevada produção de biomassa, excelente valor nutritivo e rápida rebrota, proporcionando alto desempenho animal quando manejada adequadamente. Amplamente utilizada em pastejo rotacionado, responde de forma expressiva à adubação e ao manejo nutricional.',
      specs: [
        ['Fertilidade do solo', 'Média a alta'],
        ['Precipitação mínima anual', '≥ 1.000 mm'],
        ['Hábito de crescimento', 'Cespitoso (touceiras), ereto'],
        ['Produção de matéria seca', '20 a 33 t MS/ha/ano'],
        ['Resistência', 'Boa tolerância à seca após o estabelecimento e alta resposta ao manejo intensivo'],
        ['Profundidade de plantio', '1 a 3 cm'],
        ['Tempo de formação', '70 a 100 dias'],
        ['Proteína bruta (MS)', '10% a 18%'],
        ['Palatabilidade', 'Muito alta'],
        ['Altura de manejo', 'Entrada: 80 a 90 cm · Saída: 40 a 50 cm']
      ],
      adv: ['Elevadíssima produção de forragem', 'Excelente valor nutritivo', 'Alta capacidade de suporte animal', 'Rápida rebrota', 'Excelente resposta à adubação', 'Ideal para sistemas intensivos de corte e leite']
    },
    xaraes: {
      name: 'Xaraés',
      species: 'Urochloa brizantha (syn. Brachiaria brizantha) cv. Xaraés',
      intro: 'Cultivar de elevado potencial produtivo, indicada para sistemas de pecuária de corte e leite que buscam alta oferta de forragem e excelente desempenho animal. Destaca-se pela elevada produção de massa, rápido estabelecimento, intensa capacidade de perfilhamento e ótima resposta ao manejo e à adubação.',
      specs: [
        ['Fertilidade do solo', 'Média a alta'],
        ['Precipitação mínima anual', '≥ 800 mm'],
        ['Hábito de crescimento', 'Cespitoso (touceiras)'],
        ['Produção de matéria seca', '15 a 21 t MS/ha/ano'],
        ['Resistência', 'Boa tolerância ao déficit hídrico após o estabelecimento e moderada resistência às cigarrinhas-das-pastagens'],
        ['Profundidade de plantio', '2 a 4 cm'],
        ['Tempo de formação', '60 a 90 dias'],
        ['Proteína bruta (MS)', '9% a 16%'],
        ['Palatabilidade', 'Elevada'],
        ['Altura de manejo', 'Entrada: 30 a 40 cm · Saída: 15 a 20 cm']
      ],
      adv: ['Elevada produção de forragem', 'Alto potencial de lotação', 'Excelente capacidade de perfilhamento', 'Rápida rebrota', 'Ótima resposta à adubação', 'Pastagem persistente e de alta produtividade']
    },
    piata: {
      name: 'Piatã',
      species: 'Urochloa brizantha (syn. Brachiaria brizantha) cv. BRS Piatã',
      intro: 'Cultivar de alto potencial forrageiro, reconhecida pela excelente qualidade da forragem, elevada produção de folhas e ótimo desempenho animal. Apresenta boa adaptação a diferentes sistemas de produção, destacando-se pela persistência da pastagem, boa capacidade de rebrota e excelente resposta ao manejo.',
      specs: [
        ['Fertilidade do solo', 'Média'],
        ['Precipitação mínima anual', '≥ 700 mm'],
        ['Hábito de crescimento', 'Cespitoso (touceiras)'],
        ['Produção de matéria seca', '12 a 18 t MS/ha/ano'],
        ['Resistência', 'Boa tolerância ao déficit hídrico após o estabelecimento e resistência moderada às cigarrinhas-das-pastagens (Notozulia entreriana e Deois flavopicta)'],
        ['Profundidade de plantio', '2 a 4 cm'],
        ['Tempo de formação', '60 a 90 dias'],
        ['Proteína bruta (MS)', '10% a 16%'],
        ['Palatabilidade', 'Elevada'],
        ['Altura de manejo', 'Entrada: 30 a 35 cm · Saída: 15 a 20 cm']
      ],
      adv: ['Excelente qualidade de forragem', 'Alta produção de folhas', 'Elevado desempenho animal', 'Boa tolerância ao déficit hídrico', 'Boa resistência às cigarrinhas-das-pastagens', 'Pastagem persistente e de fácil manejo']
    },
    ruziziensis: {
      name: 'Ruziziensis',
      species: 'Urochloa ruziziensis (syn. Brachiaria ruziziensis)',
      intro: 'Gramínea forrageira de elevado valor nutritivo, indicada para pastejo, produção de feno, cobertura do solo e sistemas de integração lavoura-pecuária. Destaca-se pela rápida formação, boa palatabilidade, facilidade de dessecação e excelente capacidade de produção de palhada. Quando cultivada em solos corrigidos, com adubação adequada e manejo correto, proporciona boa produção de forragem e eficiente proteção do solo.',
      specs: [
        ['Fertilidade do solo', 'Média a alta'],
        ['Precipitação mínima anual', '≥ 900 mm'],
        ['Hábito de crescimento', 'Subereto a decumbente, com boa cobertura do solo'],
        ['Produção de matéria seca', '9 a 18 t MS/ha/ano'],
        ['Resistência', 'Tolerância moderada ao déficit hídrico, baixa tolerância ao encharcamento e suscetibilidade às cigarrinhas-das-pastagens'],
        ['Profundidade de plantio', '1 a 2 cm'],
        ['Tempo de formação', '90 a 120 dias'],
        ['Proteína bruta (MS)', '10% a 14%'],
        ['Palatabilidade', 'Elevada'],
        ['Altura de manejo', 'Entrada: 30 a 40 cm · Saída: 15 a 20 cm']
      ],
      adv: ['Elevado valor nutritivo', 'Rápida cobertura do solo', 'Boa produção de palhada', 'Excelente opção para integração lavoura-pecuária', 'Facilidade de dessecação antes do plantio', 'Boa resposta à adubação', 'Indicada para pastejo, fenação e formação de cobertura vegetal']
    },
    decumbens: {
      name: 'Decumbens',
      species: 'Urochloa decumbens (syn. Brachiaria decumbens) cv. Basilisk',
      intro: 'Gramínea forrageira perene, rústica e de fácil estabelecimento, indicada principalmente para áreas de baixa a média fertilidade. Destaca-se pela excelente cobertura do solo, bom perfilhamento, rápida rebrota e elevada persistência, mesmo sob pastejo frequente. Apresenta boa adaptação a solos ácidos e períodos de estiagem, sendo amplamente utilizada na pecuária extensiva e na recuperação de áreas de pastagens.',
      specs: [
        ['Fertilidade do solo', 'Baixa a média'],
        ['Precipitação mínima anual', '≥ 800 mm'],
        ['Hábito de crescimento', 'Decumbente, com formação de cobertura densa sobre o solo'],
        ['Produção de matéria seca', '8 a 18 t MS/ha/ano'],
        ['Resistência', 'Boa tolerância à seca, a solos ácidos e ao pastejo frequente. Apresenta baixa tolerância ao encharcamento e é suscetível às cigarrinhas-das-pastagens'],
        ['Profundidade de plantio', '1 a 2 cm'],
        ['Tempo de formação', '60 a 90 dias'],
        ['Proteína bruta (MS)', '7% a 13%'],
        ['Palatabilidade', 'Boa'],
        ['Altura de manejo', 'Entrada: 30 a 35 cm · Saída: 15 a 20 cm']
      ],
      adv: ['Excelente adaptação a solos de baixa fertilidade', 'Boa tolerância a solos ácidos', 'Formação rápida e uniforme', 'Excelente cobertura e proteção do solo', 'Boa capacidade de rebrota', 'Alta persistência da pastagem', 'Tolerância ao pastejo frequente', 'Boa produção de forragem durante o período chuvoso', 'Menor exigência em correção e adubação']
    },
    massai: {
      name: 'Massai',
      species: 'Megathyrsus maximus × Megathyrsus infestus (syn. Panicum maximum × Panicum infestum) cv. Massai',
      intro: 'Cultivar forrageira de porte médio, desenvolvida para sistemas de pastejo e indicada para bovinos, ovinos, caprinos e equinos. Destaca-se pelo intenso perfilhamento, elevada produção de folhas finas, rápida formação e excelente capacidade de rebrota. Apresenta maior rusticidade e adaptação a solos de menor fertilidade quando comparada a outras cultivares do gênero Megathyrsus, além de boa resistência às cigarrinhas-das-pastagens.',
      specs: [
        ['Fertilidade do solo', 'Média, com maior adaptação a solos de menor fertilidade que outras cultivares do gênero'],
        ['Precipitação mínima anual', '≥ 800 mm'],
        ['Hábito de crescimento', 'Cespitoso, com formação de touceiras densas e porte médio'],
        ['Produção de matéria seca', '15 a 22 t MS/ha/ano'],
        ['Resistência', 'Boa resistência às cigarrinhas-das-pastagens e ao fogo, com tolerância moderada ao déficit hídrico e baixa tolerância ao encharcamento'],
        ['Profundidade de plantio', '2 a 3 cm'],
        ['Tempo de formação', '60 a 100 dias'],
        ['Proteína bruta (MS)', '7% a 12%'],
        ['Palatabilidade', 'Boa'],
        ['Altura de manejo', 'Entrada: 50 a 55 cm · Saída: 25 a 30 cm']
      ],
      adv: ['Elevado perfilhamento', 'Rápida formação da pastagem', 'Excelente capacidade de rebrota', 'Boa produção de folhas', 'Boa cobertura e proteção do solo', 'Maior rusticidade que outros capins do gênero', 'Boa resistência às cigarrinhas-das-pastagens', 'Boa capacidade de suporte animal', 'Excelente adaptação ao pastejo rotacionado', 'Boa resposta à adubação']
    }
  };
  var modal = document.getElementById('cultModal');
  if (modal) {
  var box = modal.querySelector('.cult-modal-box');
  var cultName = document.getElementById('cultName');
  var cultSpecies = document.getElementById('cultSpecies');
  var cultIntro = document.getElementById('cultIntro');
  var cultPhoto = document.getElementById('cultPhoto');
  var cultSpecs = document.getElementById('cultSpecs');
  var cultAdv = document.getElementById('cultAdv');

  function fill(el, items, render) {
    el.textContent = '';
    items.forEach(function (item) { render(item).forEach(function (n) { el.appendChild(n); }); });
  }
  function node(tag, text) {
    var n = document.createElement(tag);
    n.textContent = text;
    return n;
  }

  document.querySelectorAll('.cult-card').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-cult');
      var data = cultivares[key];
      if (!data) return;
      cultName.textContent = data.name;
      cultSpecies.textContent = data.species;
      cultIntro.textContent = data.intro;
      cultPhoto.src = 'images/cultivares/' + key + '.jpg';
      cultPhoto.alt = 'Pastagem de capim ' + data.name;
      fill(cultSpecs, data.specs, function (s) { return [node('dt', s[0]), node('dd', s[1])]; });
      fill(cultAdv, data.adv, function (a) { return [node('li', a)]; });
      modal.classList.add('open');
      box.scrollTop = 0;
      document.body.style.overflow = 'hidden';
    });
  });
  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
  document.getElementById('cultClose').addEventListener('click', closeModal);
  document.getElementById('cultCta').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
  }

  var form = document.getElementById('contactForm');
  var msg = document.getElementById('formMsg');
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    // Referência estática: ligar ao Wix Forms (ou endpoint real) na implementação final.
    msg.classList.add('show');
    form.reset();
  });
})();
