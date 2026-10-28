/* ==========================================================================
   Studio Zazelis Design — site v3 (home + paginas de case)
   JS puro, sem dependencias. Tudo que reage ao scroll passa por um unico
   requestAnimationFrame (fase de leitura, depois fase de escrita), para nao
   forcar layout no meio do quadro.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---------------- Meta Pixel ----------------
     A fila (fbq) ja existe desde o <head>. O fbevents.js so e baixado na
     primeira interacao (toque, rolagem, clique, tecla) ou 6s depois do
     load: nao compete com a primeira pintura nem trava o celular. */
  var pixelOn = false;
  function loadPixel() {
    if (pixelOn) return;
    pixelOn = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(s);
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(function (ev) {
    window.addEventListener(ev, loadPixel, { once: true, passive: true });
  });
  window.addEventListener('load', function () { setTimeout(loadPixel, 6000); });

  if (window.fbq && /^\/cases\//.test(location.pathname)) {
    fbq('track', 'ViewContent', { content_name: document.title, content_category: 'Case' });
  }

  /* Cada link de WhatsApp tem data-wa com o lugar de onde saiu o clique:
     o evento Contact chega ao Pixel ja dizendo qual botao converteu. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-wa]');
    if (!a || !window.fbq) return;
    loadPixel();
    fbq('track', 'Contact', { content_name: a.getAttribute('data-wa') });
  });

  /* ---------------- Header + menu mobile ---------------- */
  var header = $('#header');
  var burger = $('#burger');
  var menu = $('#mobile-menu');
  function setMenu(open) {
    if (!burger || !menu) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('data-open', String(open));
    document.body.classList.toggle('menu-open', open);
  }
  if (burger) burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  if (menu) $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* Ancoras da mesma pagina: rola na mao (respeita scroll-padding-top). */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href').slice(1);
    var target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + id);
  });

  /* ==========================================================================
     PALAVRA POR PALAVRA — quebra o texto de .js-split em .palavra.
     Mantem <em>, <br> e qualquer tag interna; so os nos de texto viram spans.
     ========================================================================== */
  function splitWords(el) {
    var stagger = el.getAttribute('data-stagger');
    if (stagger) el.style.setProperty('--s', stagger + 'ms');
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (k) {
        if (k.nodeType === 3) {
          var frag = document.createDocumentFragment();
          k.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var s = document.createElement('span');
            s.className = 'palavra';
            s.style.setProperty('--i', i++);
            s.textContent = part;
            frag.appendChild(s);
          });
          node.replaceChild(frag, k);
        } else if (k.nodeType === 1 && k.tagName !== 'BR') {
          walk(k);
        }
      });
    })(el);
    el.classList.add('is-split');
  }
  $$('.js-split').forEach(splitWords);

  /* ==========================================================================
     REVELACAO — .reveal / palcos ganham .is-in; .js-split ganha .dentro.
     IntersectionObserver + checagem por scroll + um timer de seguranca:
     se um gatilho falhar no navegador da pessoa, os outros garantem.
     ========================================================================== */
  (function () {
    var els = $$('.reveal, .js-split, .sobre-stage, .cs-cover');
    function show(el) {
      el.classList.add(el.classList.contains('js-split') ? 'dentro' : 'is-in');
      if (el.classList.contains('stat')) countUp(el);
    }
    if (reduce) { els.forEach(show); return; }
    var pending = els.slice();
    function check() {
      if (!pending.length) return stop();
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.9 && r.bottom > 0 && (r.width || r.height)) { show(el); return false; }
        return true;
      });
    }
    var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { show(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -10% 0px' }) : null;
    if (io) els.forEach(function (el) { io.observe(el); });
    var timer = setInterval(check, 400);
    window.addEventListener('scroll', check, { passive: true });
    function stop() { clearInterval(timer); window.removeEventListener('scroll', check); if (io) io.disconnect(); }
    check();
  })();

  function countUp(stat) {
    $$('[data-count]', stat).forEach(function (el) {
      var end = +el.getAttribute('data-count');
      var t0 = performance.now(), dur = 1600;
      (function step(now) {
        var p = clamp((now - t0) / dur, 0, 1);
        el.textContent = Math.round(end * (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  /* ==========================================================================
     LACO DE SCROLL — cada efeito registra read() e write(dados).
     ========================================================================== */
  var effects = [];
  var ticking = false;
  function frame() {
    ticking = false;
    var vh = window.innerHeight, vw = window.innerWidth;
    var data = effects.map(function (fx) { return fx.read(vh, vw); });
    effects.forEach(function (fx, i) { fx.write(data[i], vh, vw); });
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', request, { passive: true });
  function remeasure() { effects.forEach(function (fx) { if (fx.measure) fx.measure(); }); request(); }
  var rz;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(remeasure, 120); });
  window.addEventListener('load', remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  /* ---------------- Hero: paralaxe leve do conteudo ---------------- */
  var hero = $('#hero');
  var heroContent = $('.hero-content');
  if (hero && heroContent && !reduce) {
    effects.push({
      read: function () { var r = hero.getBoundingClientRect(); return clamp(-r.top / r.height, 0, 1); },
      write: function (p) {
        heroContent.style.transform = 'translate3d(0,' + (p * 60).toFixed(1) + 'px,0)';
        heroContent.style.opacity = String(clamp(1 - p * 1.2, 0, 1));
      }
    });
  }

  /* ---------------- 01 · Parede antes -> depois ----------------
     Progresso = quanto da secao ja passou (altura da secao menos uma tela).
     A revelacao acontece no miolo (12% a 82%): a pessoa ve o "antes"
     parado um instante e, no fim, o "depois" inteiro antes de seguir. */
  var bf = $('.bf'), bfList = $('.bf-signals');
  if (bf) {
    effects.push({
      read: function (vh, vw) {
        var r = bf.getBoundingClientRect(), total = r.height - vh;
        var t;
        if (vw < 900 && bfList) {
          /* no celular o texto passa por cima da foto: a troca so comeca
             quando o ultimo cartao ja passou da parede (40% da tela pra
             cima), senao ela acontece escondida atras do texto */
          t = clamp((vh * 0.4 - bfList.getBoundingClientRect().bottom) / (vh * 0.4), 0, 1);
        } else {
          t = clamp(((total > 0 ? -r.top / total : 0) - 0.12) / 0.7, 0, 1);
        }
        return { on: r.bottom > 0 && r.top < vh, t: t };
      },
      write: function (s) {
        if (!s.on) return;
        var t = s.t;
        var w = t * t * (3 - 2 * t);
        bf.style.setProperty('--w', w.toFixed(4));
        bf.classList.toggle('is-depois', w > 0.5);
      }
    });
  }

  /* ---------------- 02 · Cards empilhados ----------------
     Posicoes naturais medidas com o sticky desligado. Enquanto o proximo
     card sobe, o de baixo encolhe ate 90% e escurece ate 50%. */
  var stackCards = $$('#stack .stack-card');
  if (stackCards.length > 1 && !reduce) {
    var nat = [], tops = [];
    effects.push({
      measure: function () {
        stackCards.forEach(function (c) { c.style.position = 'static'; c.style.transform = ''; });
        var y = window.scrollY;
        nat = stackCards.map(function (c) { return c.getBoundingClientRect().top + y; });
        stackCards.forEach(function (c) { c.style.position = ''; });
        tops = stackCards.map(function (c) { return parseFloat(getComputedStyle(c).top) || 0; });
      },
      read: function () { return window.scrollY; },
      write: function (y) {
        for (var i = 0; i < stackCards.length - 1; i++) {
          var start = nat[i] - tops[i], end = nat[i + 1] - tops[i + 1];
          var p = clamp((y - start) / Math.max(1, end - start), 0, 1);
          stackCards[i].style.transform = 'scale(' + (1 - 0.1 * p).toFixed(4) + ')';
          stackCards[i].querySelector('.stack-shade').style.opacity = (0.5 * p).toFixed(3);
        }
      }
    });
  }

  /* ---------------- 05 · Sobre: deriva da foto + logo com profundidade ---------------- */
  var stage = $('#sobre-stage'), drift = $('#sobre-drift'), logo = $('#sobre-logo');
  if (stage && drift && !reduce) {
    effects.push({
      read: function (vh) { var r = stage.getBoundingClientRect(); return { on: r.bottom > 0 && r.top < vh, d: r.top + r.height / 2 - vh / 2 }; },
      write: function (s) {
        if (!s.on) return;
        drift.style.transform = 'translate3d(0,' + (s.d * -0.12).toFixed(1) + 'px,0)';
        if (logo) logo.style.transform = 'translate3d(-50%,' + (s.d * 0.1).toFixed(1) + 'px,0)';
      }
    });
  }

  /* Frase que acende: cinza #6f6f6f -> branco conforme o scroll */
  var statement = $('#statement');
  if (statement) {
    var words = [];
    statement.innerHTML = statement.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    words = $$('.w', statement);
    var lit = -1;
    effects.push({
      read: function (vh) {
        if (reduce) return words.length;
        var r = statement.getBoundingClientRect();
        var p = clamp((vh * 0.85 - r.top) / (vh * 0.35 + r.height), 0, 1);
        return Math.round(p * words.length);
      },
      write: function (n) {
        if (n === lit) return;
        lit = n;
        words.forEach(function (w, i) { w.classList.toggle('acesa', i < n); });
      }
    });
  }

  /* ---------------- 06 · Rolagem horizontal fixada ---------------- */
  var hs = $('.hs'), track = $('#hs-track');
  if (hs && track) {
    if (reduce) hs.classList.add('is-native');
    else {
      var hsPanels = $$('.hs-panel', track), hsImgs = hsPanels.map(function (p) { return p.querySelector('img'); });
      var bar = $('#hs-bar'), count = $('#hs-count');
      /* RITMO < 1: a trilha anda mais rapido que o scroll, para 8 paineis
         nao virarem uma rolagem interminavel. */
      var RITMO = 0.72;
      var dist = 0, geo = [], lastIdx = -1;
      effects.push({
        measure: function () {
          dist = Math.max(0, track.scrollWidth - window.innerWidth);
          hs.style.height = (window.innerHeight + dist * RITMO) + 'px';
          geo = hsPanels.map(function (p) { return { c: p.offsetLeft + p.offsetWidth / 2 }; });
        },
        read: function (vh) { var r = hs.getBoundingClientRect(); return { on: r.bottom > 0 && r.top < vh, p: dist ? clamp(-r.top / (dist * RITMO), 0, 1) : 0 }; },
        write: function (s, vh, vw) {
          if (!s.on) return;
          var x = -s.p * dist;
          track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
          if (bar) bar.style.transform = 'scaleX(' + s.p.toFixed(4) + ')';
          var best = 0, bestD = Infinity;
          geo.forEach(function (g, i) {
            var c = (g.c + x - vw / 2) / vw;
            if (Math.abs(c) < bestD) { bestD = Math.abs(c); best = i; }
            if (hsImgs[i]) hsImgs[i].style.transform = 'translate3d(' + (clamp(c, -1.2, 1.2) * -5).toFixed(2) + '%,0,0)';
          });
          if (best !== lastIdx && count) {
            lastIdx = best;
            count.textContent = ('0' + (best + 1)).slice(-2) + ' / ' + ('0' + hsPanels.length).slice(-2);
          }
        }
      });
    }
  }

  /* ---------------- Botao flutuante de WhatsApp ---------------- */
  var fab = $('#wa-fab'), join = $('#contato'), firstFold = hero || $('.cs-hero');
  if (fab) {
    effects.push({
      read: function (vh) {
        var past = firstFold ? firstFold.getBoundingClientRect().bottom < vh * 0.2 : window.scrollY > vh;
        var atJoin = join ? join.getBoundingClientRect().top < vh * 0.85 : false;
        return past && !atJoin;
      },
      write: function (on) { fab.classList.toggle('is-on', on); }
    });
  }

  if (header) {
    effects.push({
      read: function () { return window.scrollY > 24; },
      write: function (on) { header.classList.toggle('is-scrolled', on); }
    });
  }

  remeasure();
  /* Chegou por um link /#secao vindo de outra pagina: a secao horizontal
     muda de altura depois do JS medir, entao reposiciona no alvo certo. */
  if (location.hash && location.hash.length > 1) {
    var alvo = document.getElementById(location.hash.slice(1));
    if (alvo) window.addEventListener('load', function () { setTimeout(function () { alvo.scrollIntoView(); }, 60); });
  }

  /* ---------------- 07 · Paineis que expandem ---------------- */
  var paineis = $$('#panels .panel');
  function abrir(p) {
    paineis.forEach(function (o) {
      var on = o === p;
      o.classList.toggle('is-open', on);
      o.setAttribute('aria-expanded', String(on));
    });
  }
  paineis.forEach(function (p) {
    p.addEventListener('click', function () { abrir(p); });
    p.addEventListener('focus', function () { abrir(p); });
    if (fine) p.addEventListener('mouseenter', function () { abrir(p); });
  });

  /* ---------------- 03 · Metodo: atenua as etapas vizinhas ---------------- */
  var steps = $('.steps');
  if (steps && fine) {
    var itens = $$('.step', steps);
    steps.addEventListener('mouseleave', function () {
      steps.classList.remove('is-hovered');
      itens.forEach(function (s) { s.classList.remove('is-active'); });
    });
    itens.forEach(function (item) {
      item.addEventListener('mouseenter', function () {
        steps.classList.add('is-hovered');
        itens.forEach(function (s) { s.classList.toggle('is-active', s === item); });
      });
    });
  }

  /* ---------------- 08 · FAQ (acordeao acessivel) ---------------- */
  var FAQ_MS = 400;
  function settle(panel, done) {
    var ok = false;
    var run = function () { if (ok) return; ok = true; panel.removeEventListener('transitionend', run); done(); };
    setTimeout(run, FAQ_MS + 80);
    panel.addEventListener('transitionend', run);
  }
  $$('.faq-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (!panel) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      if (reduce) { panel.hidden = open; panel.style.height = open ? '' : 'auto'; return; }
      if (open) {
        panel.style.height = panel.scrollHeight + 'px';
        void panel.offsetHeight;
        panel.style.height = '0px';
        settle(panel, function () { panel.hidden = true; panel.style.height = ''; });
      } else {
        panel.hidden = false;
        panel.style.height = '0px';
        void panel.offsetHeight;
        panel.style.height = panel.scrollHeight + 'px';
        settle(panel, function () { panel.style.height = 'auto'; });
      }
    });
  });

  /* ==========================================================================
     FUNDO DO HERO — ruido simplex em WebGL (#161616 -> #282828).
     Liga so depois do load, em resolucao reduzida, e pausa fora da tela.
     ========================================================================== */
  function initHeroShader() {
    var canvas = $('#hero-shader');
    if (!canvas || reduce) return;
    var gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    var vs = 'attribute vec2 position;varying vec2 vUv;void main(){vUv=position*0.5+0.5;gl_Position=vec4(position,0.0,1.0);}';
    var fs = [
      'precision mediump float;varying vec2 vUv;uniform vec2 u_res;uniform float u_time;uniform vec3 u_c[4];uniform vec3 u_bg;',
      'vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}',
      'float snoise(vec2 v){const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);',
      'vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);',
      'vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.0);',
      'vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));',
      'vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);m=m*m;m=m*m;',
      'vec3 x=2.0*fract(p*C.www)-1.0;vec3 h=abs(x)-0.5;vec3 ox=floor(x+0.5);vec3 a0=x-ox;',
      'm*=1.79284291400159-0.85373472095314*(a0*a0+h*h);vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;',
      'return 130.0*dot(m,g);}',
      'void main(){vec2 uv=vUv;vec2 p=uv-0.5;p.x*=u_res.x/u_res.y;float t=u_time*0.1;',
      'float n1=snoise(p*0.65+vec2(t*0.32,-t*0.48));float n2=snoise(p*0.85+vec2(-t*0.24,t*0.4)+n1*0.3);',
      'float n3=snoise(p*1.15+vec2(t*0.16,-t*0.32)+n2*0.25);vec3 col=u_bg;float d=length(p)*1.5;',
      'col=mix(col,u_c[0],smoothstep(-0.05,0.3,n1)*0.9);col=mix(col,u_c[1],smoothstep(0.0,0.35,n2)*0.75);',
      'col=mix(col,u_c[2],smoothstep(-0.1,0.25,n3)*0.65);col=mix(col,u_c[3],smoothstep(0.0,0.4,n1*n2)*0.55);',
      'col+=u_c[1]*smoothstep(0.85,0.0,d)*0.4;col=mix(col*0.4,col,1.0-smoothstep(0.25,1.35,d));',
      'float gr=fract(sin(dot(uv,vec2(12.9898,78.233)))*43758.5453+u_time);col+=(gr-0.5)*0.024;',
      'gl_FragColor=vec4(col,1.0);}'
    ].join('');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, 'u_res'), uTime = gl.getUniformLocation(prog, 'u_time');
    var hex = function (h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; };
    gl.uniform3fv(gl.getUniformLocation(prog, 'u_c'), new Float32Array([].concat(hex('#2c2c2c'), hex('#1c1c1c'), hex('#262626'), hex('#55555c'))));
    gl.uniform3fv(gl.getUniformLocation(prog, 'u_bg'), new Float32Array(hex('#141414')));
    /* ruido e suave: meia resolucao nao muda o visual e alivia muito o celular */
    var scale = window.innerWidth < 768 ? 0.5 : 0.75;
    function resize() {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener('resize', resize);
    var raf = 0, visible = true;
    function render(t) {
      gl.uniform1f(uTime, t * 0.0016);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = visible && !document.hidden ? requestAnimationFrame(render) : 0;
    }
    function play() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(render); }
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; play(); }).observe(canvas);
    document.addEventListener('visibilitychange', play);
    play();
    canvas.classList.add('is-ready');
  }
  window.addEventListener('load', function () {
    if ('requestIdleCallback' in window) requestIdleCallback(initHeroShader, { timeout: 1500 });
    else setTimeout(initHeroShader, 300);
  });

  /* ==========================================================================
     CURSOR POLIGONAL — ponto + losango com atraso elastico (ponteiro fino)
     ========================================================================== */
  (function () {
    if (!fine || reduce) return;
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var poly = document.createElement('div');
    poly.className = 'cursor-poly';
    poly.setAttribute('data-state', 'quiet');
    poly.innerHTML = '<svg viewBox="0 0 34 52" fill="none"><polygon points="17,1 33,26 17,51 1,26" /></svg><span class="cursor-label"></span>';
    dot.setAttribute('aria-hidden', 'true');
    poly.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(poly);
    var label = poly.querySelector('.cursor-label');
    var tx = innerWidth / 2, ty = innerHeight / 2, px = tx, py = ty, sc = 1, scT = 1, rot = 0, on = false;
    var SC = { quiet: 0.85, link: 1.2, cta: 1.65, case: 1.75, media: 1.35 };
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; px = tx; py = ty; loop(); }
      document.body.classList.add('cursor-ready');
      var under = document.elementFromPoint(tx, ty);
      document.body.classList.toggle('cursor-on-dark', !!(under && under.closest && under.closest('[data-theme="dark"]')));
    }, { passive: true });
    document.addEventListener('pointerleave', function () { document.body.classList.remove('cursor-ready'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('[data-cursor]');
      var st = t ? t.getAttribute('data-cursor') : 'quiet';
      if (poly.getAttribute('data-state') !== st) {
        poly.setAttribute('data-state', st);
        label.textContent = t ? (t.getAttribute('data-cursor-label') || '') : '';
      }
      scT = SC[st] || 1;
    }, { passive: true });
    document.addEventListener('pointerdown', function () { dot.style.setProperty('--dot-s', '0.6'); });
    document.addEventListener('pointerup', function () { dot.style.setProperty('--dot-s', '1'); });
    function loop() {
      px += (tx - px) * 0.14; py += (ty - py) * 0.14;
      sc += (scT - sc) * 0.16;
      rot = (rot + (tx - px) * 0.02) * 0.92;
      dot.style.setProperty('--dot-x', tx + 'px');
      dot.style.setProperty('--dot-y', ty + 'px');
      poly.style.setProperty('--poly-x', px.toFixed(2) + 'px');
      poly.style.setProperty('--poly-y', py.toFixed(2) + 'px');
      poly.style.setProperty('--poly-s', sc.toFixed(3));
      poly.style.setProperty('--poly-r', rot.toFixed(2) + 'deg');
      requestAnimationFrame(loop);
    }
  })();

  /* ==========================================================================
     LIGHTBOX — imagens das paginas de case abrem ampliadas
     ========================================================================== */
  (function () {
    var imgs = $$('.gallery img, .cs-split figure img, .vstrip img');
    if (!imgs.length) return;
    var ov = document.createElement('div');
    ov.className = 'lightbox-overlay';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Imagem ampliada');
    ov.innerHTML = '<button type="button" class="lightbox-close" aria-label="Fechar imagem"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><img alt="">';
    document.body.appendChild(ov);
    var big = $('img', ov), close = $('.lightbox-close', ov), last = null;
    function open(img) {
      big.src = img.currentSrc || img.src;
      big.alt = img.alt || '';
      last = document.activeElement;
      ov.classList.add('is-open');
      document.body.classList.add('lightbox-open');
      close.focus();
    }
    function shut() {
      ov.classList.remove('is-open');
      document.body.classList.remove('lightbox-open');
      if (last && last.focus) last.focus();
    }
    imgs.forEach(function (img) {
      img.classList.add('lightbox-trigger');
      img.tabIndex = 0;
      img.setAttribute('role', 'button');
      img.setAttribute('data-cursor', 'media');
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); } });
    });
    close.addEventListener('click', shut);
    ov.addEventListener('click', function (e) { if (e.target === ov) shut(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('is-open')) shut(); });
  })();
})();
