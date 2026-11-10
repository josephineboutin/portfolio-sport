
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var listeners = [], mode = "strategie";
  function css(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }

  /* ---------- Bascule ---------- */
  var chips = document.querySelectorAll("[data-chip]");
  function applyMode(m) {
    mode = m;
    if (m === "terrain" && !root.hasAttribute("data-lock")) root.setAttribute("data-lecture", "terrain"); else root.removeAttribute("data-lecture");
    document.querySelectorAll("[data-mode]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === m)); });
    chips.forEach(function (c) { c.textContent = m === "terrain" ? "Lecture terrain" : "Lecture stratégie"; });
    document.querySelectorAll(".duo > .v, .tracks > .v").forEach(function (v) { v.setAttribute("aria-hidden", String(v.dataset.v !== m)); });
    if (!root.hasAttribute("data-lock")) listeners.forEach(function (f) { f(m); });
    try { localStorage.setItem("lecture", m); } catch (e) {}
  }
  /* La vague de bascule : une bande de la couleur de l'autre lecture balaie l'écran */
  var wipe = document.getElementById("wipe"), wctx = wipe.getContext("2d"), wiping = false;
  function setMode(m) {
    if (m === mode || wiping) return;
    if (root.hasAttribute("data-lock")) { applyMode(m); return; }
    if (reduce) { applyMode(m); return; }
    wiping = true;
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = window.innerWidth, H = window.innerHeight;
    wipe.width = W * dpr; wipe.height = H * dpr; wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = m === "terrain" ? (root.classList.contains("pro") ? "#141413" : "#0C1E24") : "#FFFFFF", line = m === "terrain" ? "#FFF133" : "#111110";
    var t0 = null, dur = 1250, switched = false;
    function edge(base, y, p, s) { return base + 34 * Math.sin(y * 0.011 + p * 9 + s) + 14 * Math.sin(y * 0.031 - p * 5); }
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var lead = -0.15 * W + e * 2.6 * W, trail = lead - 1.35 * W;
      wctx.clearRect(0, 0, W, H);
      wctx.fillStyle = target;
      wctx.beginPath();
      for (var y = 0; y <= H; y += 12) { var xl = edge(lead, y, p, 0); if (y === 0) wctx.moveTo(xl, y); else wctx.lineTo(xl, y); }
      for (var y2 = H; y2 >= 0; y2 -= 12) wctx.lineTo(edge(trail, y2, p, 2), y2);
      wctx.closePath(); wctx.fill();
      wctx.strokeStyle = line; wctx.lineWidth = 4; wctx.lineCap = "round";
      [[lead, 0], [trail, 2]].forEach(function (s) { wctx.beginPath(); for (var y = 0; y <= H; y += 12) { var xx = edge(s[0], y, p, s[1]); if (y === 0) wctx.moveTo(xx, y); else wctx.lineTo(xx, y); } wctx.stroke(); });
      if (!switched && trail < -40 && lead > W + 40) {
        switched = true; root.classList.add("instant"); applyMode(m);
        requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove("instant"); }); });
      }
      if (p < 1) requestAnimationFrame(frame); else { wctx.clearRect(0, 0, W, H); if (!switched) applyMode(m); wiping = false; }
    }
    requestAnimationFrame(frame);
  }
  document.querySelectorAll("[data-mode]").forEach(function (b) { b.addEventListener("click", function () {
    setMode(b.dataset.mode);
    if (b.dataset.scroll) { var t = document.getElementById(b.dataset.scroll); if (t) setTimeout(function () { t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }, reduce ? 0 : 700); }
  }); });
  document.querySelectorAll('.next-case[aria-disabled="true"]').forEach(function (c) { c.addEventListener("click", function (e) { e.preventDefault(); }); });
  /* Le petit interrupteur n'apparaît dans la barre qu'une fois le grand choix dépassé */
  var miniT = document.getElementById("mini-toggle"), chooser = document.getElementById("chooser");
  if (chooser && "IntersectionObserver" in window) new IntersectionObserver(function (en) { miniT.classList.toggle("away", en[0].isIntersecting || en[0].boundingClientRect.top > 0); }, { rootMargin: "-70px 0px 0px 0px" }).observe(chooser);
  else miniT.classList.remove("away");
  document.querySelectorAll('.card[aria-disabled="true"]').forEach(function (c) { c.addEventListener("click", function (e) { e.preventDefault(); }); });

  /* ---------- Courbes ---------- */
  function profile(pts) {
    return function (u) {
      for (var i = 1; i < pts.length; i++) if (u <= pts[i][0]) { var a = pts[i - 1], b = pts[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * (1 - Math.cos(Math.PI * k)) / 2; }
      return pts[pts.length - 1][1];
    };
  }
  var SIG = 0.17;
  function bell(u) { return 0.06 + 0.84 * Math.exp(-Math.pow(u - 0.5, 2) / (2 * SIG * SIG)); }
  function travelingWave(u, t) {
    var c = ((t * 0.05) % 1.5) - 0.25, w = 0.2, d = (u - c) / w, b = 0;
    if (d > -1 && d <= 0) b = (1 + Math.cos(Math.PI * d)) / 2;
    else if (d > 0 && d < 0.55) b = (1 + Math.cos(Math.PI * d / 0.55)) / 2;
    return { v: 0.14 + 0.62 * b + 0.03 * Math.sin(u * 14 + t * 1.8), crest: c };
  }
  var CURVES = {
    home: {
      strat: profile([[0, .06], [.04, .12], [.09, .14], [.17, .24], [.22, .26], [.28, .34], [.32, .36], [.37, .42], [.42, .44], [.47, .52], [.52, .54], [.58, .62], [.63, .64], [.68, .7], [.73, .72], [.79, .8], [.86, .82], [.95, .92], [1, .94]]),
      terr: function (u, t) { return travelingWave(u, t).v; },
      surfer: "home",
      fill: true,
      ticks: [[0.04, "2021"], [0.17, "2023"], [0.33, "2024"], [0.58, "2025"], [0.79, "2026"]],
      legend: true,
      title: "Mon parcours en bref",
      pins: [
        { u: 0.04, type: "formation", when: "2021 - 2024", title: "Licence STAPS", text: "Mention management du sport. D'abord le sport compris par le corps, la société et la pratique (physiologie, sociologie, sports collectifs, individuels et de pleine nature), puis le sport vu comme un secteur : marketing du sport, droit, gestion, organisation d'événements et stages en structure." },
        { u: 0.17, type: "exp", when: "Septembre 2023", title: "WURIT", text: "World University Rugby Invitational Tournament. Journaliste bénévole : interviews de joueurs et d'entraîneurs, en français et en anglais, au bord du terrain." },
        { u: 0.28, type: "exp", when: "Printemps 2024", title: "Homie Boards", text: "Stage de 2 mois en Licence 3. Louer des planches, conseiller, négocier : la glisse côté commerce, à Biarritz." },
        { u: 0.37, type: "exp", when: "Mai 2024", title: "Relais de la flamme", text: "Mission bénévole : encadrer une quinzaine de bénévoles sur le Relais de la flamme olympique à Bordeaux." },
        { u: 0.47, type: "formation", when: "2024 - 2025", title: "Master 1", text: "Marketing stratégique et communication à l’IAE Bordeaux : stratégie marketing, études de marché, communication et persuasion, marketing digital, droit de la consommation, RSE, analyse de données, datavisualisation et PAO." },
        { u: 0.58, type: "exp", when: "2025", title: "Newave", text: "Stage de 6 mois en marketing digital et communication : gestion du site WordPress, newsletters, graphisme, réseaux sociaux, plan de diffusion du film de la marque, stand aux championnats universitaires et participation à la refonte de l’identité vers un positionnement premium." },
        { u: 0.68, type: "formation", when: "2025 - 2026", title: "Master 2", text: "Marketing stratégique à l’IAE Bordeaux : décisions stratégiques, distribution, e-commerce et analyse de panels, avec un mémoire de recherche sur le sponsoring maillot." },
        { u: 0.79, type: "exp", when: "2025 - 2026", title: "Off The Hook", text: "Consultante en stratégie de marque, en alternance dans une agence de branding bordelaise. Pour des clients de secteurs très variés : audits, positionnements, plateformes de marque, tons de marque, lignes éditoriales et un livre blanc de 56 pages. Pour l'agence : contenus, calendriers éditoriaux, veille et articles de blog comme pour ses clients." },
        { u: 0.95, type: "suite", when: "2026", title: "Aujourd'hui", text: "À la recherche d'un premier poste en stratégie de marque, en marketing, ou en communication dans le sport, la glisse et l'outdoor." }
      ]
    },
    newave: {
      strat: bell,
      terrPath: "M0,200 C200,196 330,186 430,152 C520,120 566,62 642,52 C722,42 768,96 742,128 C724,150 692,144 694,122 C696,106 716,108 720,122 C738,168 806,198 905,204 C1100,212 1300,201 1500,198",
      surfer: "newave",
      fill: true,
      bands: [[0, 0.16, "Innovateurs, 2,5 %"], [0.16, 0.33, "Premiers adeptes, 13,5 %"], [0.33, 0.5, "Majorité précoce, 34 %"], [0.5, 0.67, "Majorité tardive, 34 %"], [0.67, 1, "Retardataires, 16 %"]],
      gap: [0.318, 0.342],
      gapLabel: ["Le fossé (Moore, 1991)", "Le cap entre les premiers adeptes et la majorité, en plein pendant mon stage", "où se jouait mon stage"],
      title: "Courbe d'adoption d'une innovation (Rogers, 1962)",
      axisY: "Nombre de surfeurs qui adoptent la planche",
      axisX: "Le temps",
      pins: [
        { u: 0.08, type: "exp", when: "Avant le lancement", title: "Les innovateurs", text: "Les premiers surfeurs commandent la planche sans l'avoir essayée, et attendent des mois leur livraison." },
        { u: 0.22, type: "exp", when: "Mai et juin 2025", title: "Le Kickstarter", text: "Plus de 230 000 dollars levés en un mois. Les premiers adeptes suivent, séduits par la promesse." },
        { u: 0.3, type: "exp", below: true, when: "Mon stage, 2025", title: "Le fossé", text: "Entre les premiers adeptes et la majorité, il faut des preuves. C'est là que se jouait mon travail." },
        { u: 0.365, type: "exp", below: true, when: "Décembre 2025", title: "TikTok", text: "Faire découvrir l'innovation à un public britannique qui ne connaît pas encore la marque." },
        { u: 0.42, type: "suite", when: "2026", title: "Aujourd'hui", text: "27 000 abonnés sur Instagram et un compte consacré aux contenus de la communauté : la preuve sociale arrive. * Position indicative, c'est l'évolution de la marque." }
      ]
    },
    maillot: {
      strat: function (u) { var n = 1 + 8 * u, s = 3.13 + 2.467 * Math.log(Math.max(0.2, n) / 3); return Math.max(0.03, Math.min(0.95, (s - 1) / 6)); },
      terr: function (u, t) { return 0.1 + 0.72 * Math.sin(Math.PI * Math.min(1, Math.max(0, u))) + 0.015 * Math.sin(u * 20 + t * 2); },
      rider: "ball",
      riderU: function (t) { return (t * 0.11) % 1; },
      decorate: function (ctx, x, Y, mix, t) {
        /* Les poteaux : la chandelle passe au-dessus de la barre */
        ctx.save(); ctx.globalAlpha = mix; ctx.strokeStyle = "#FFF133"; ctx.lineWidth = 4; ctx.lineCap = "round";
        var px = x(0.88), gap = 22;
        ctx.beginPath(); ctx.moveTo(px - gap, Y(0)); ctx.lineTo(px - gap, Y(0.98)); ctx.moveTo(px + gap, Y(0)); ctx.lineTo(px + gap, Y(0.98)); ctx.moveTo(px - gap, Y(0.3)); ctx.lineTo(px + gap, Y(0.3)); ctx.stroke();
        ctx.restore();
      },
      fill: true,
      ticks: [[0.25, "3 logos"], [0.5, "5 logos"], [0.75, "7 logos"]],
      title: "Encombrement perçu selon le nombre de logos",
      axisY: "Encombrement perçu, de 1 (aéré) à 7 (surchargé)",
      ref: { v: 0.5, label: "Milieu de l'échelle" },
      axisX: "Nombre de logos sur le maillot",
      pins: [
        { u: 0.25, type: "exp", when: "Maillot à 3 logos", title: "3,13 sur 7", text: "Avec trois logos, le maillot ne paraît pas surchargé : la note reste sous le milieu de l’échelle." },
        { u: 0.5, type: "exp", when: "Maillot à 5 logos", title: "4,48 sur 7", text: "Deux logos de plus, et tout change : la note passe au-dessus du milieu de l’échelle. C’est entre 3 et 5 logos que l’impression de surcharge augmente le plus." },
        { u: 0.75, type: "exp", when: "Maillot à 7 logos", title: "5,22 sur 7", text: "Encore deux logos, encore plus de surcharge, mais un saut deux fois plus petit qu’entre 3 et 5 logos. Et chacun des trois maillots est perçu de façon nettement distincte." }
      ]
    },
    expertise: {
      strat: profile([[0, .12], [.18, .13], [.3, .34], [.4, .36], [.52, .64], [.62, .66], [.72, .76], [.82, .78], [.92, .88], [1, .9]]),
      terr: function (u, t) { return 0.14 + 0.5 * Math.pow(Math.abs(Math.sin(Math.PI * 3 * u)), 0.8) + 0.012 * Math.sin(u * 30 + t * 2); },
      title: "Une expertise rendue visible, étape par étape",
      rider: "dot",
      riderU: function (t) { return (t * 0.07) % 1; },
      decorate: function (ctx, x, Y, mix) {
        /* Les points d'appui : écoles et intervenants, reliés par des ponts */
        ctx.save(); ctx.globalAlpha = mix; ctx.fillStyle = "#FFF133"; ctx.strokeStyle = "#141413"; ctx.lineWidth = 2;
        [0, 1 / 3, 2 / 3, 1].forEach(function (u) { ctx.beginPath(); ctx.arc(x(u), Y(0.14), 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
        ctx.restore();
      },
      fill: true,
      pins: [
        { u: 0.08, type: "exp", when: "À mon arrivée", title: "Un LinkedIn à l'arrêt", text: "Pas de fil rouge, pas de positionnement visible, alors que le nouveau nom et la nouvelle charte étaient prêts." },
        { u: 0.3, type: "exp", when: "La commande", title: "La ligne éditoriale", text: "Des piliers de contenu, un ton et des formats pour la page de l'entreprise." },
        { u: 0.52, type: "exp", when: "Ma recommandation", title: "Le livre blanc", text: "Donner à la marque un sujet de fond. 56 pages, rédigées intégralement." },
        { u: 0.72, type: "exp", when: "Le lancement", title: "Trois posts", text: "Un pour chaque fondateur, un pour la page de l'entreprise. Commenter servait à demander le livre blanc." },
        { u: 0.92, type: "suite", when: "Quelques semaines après", title: "« Une vraie entreprise »", text: "Le retour d'un fondateur sur l'image que renvoyait désormais son entreprise." }
      ]
    }
  };

  /* La glisse en Terrain : une planche effilée et son sillage, sans personnage */
  function boardPath(ctx, L, Wd) {
    ctx.beginPath();
    ctx.moveTo(L / 2, 0);
    ctx.bezierCurveTo(L * 0.3, -Wd * 0.62, -L * 0.3, -Wd * 0.62, -L / 2, -Wd * 0.18);
    ctx.lineTo(-L / 2, Wd * 0.18);
    ctx.bezierCurveTo(-L * 0.3, Wd * 0.62, L * 0.3, Wd * 0.62, L / 2, 0);
    ctx.closePath();
  }
  function drawRider(ctx, trail, rs, alpha, pieces, gap) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.lineCap = "round";
    /* Sillage : la trajectoire réelle de la planche, qui s'efface */
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i], k = i / trail.length;
      ctx.globalAlpha = alpha * k * k * 0.85;
      ctx.strokeStyle = "#F3F3EF"; ctx.lineWidth = 0.6 + k * 3.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 3); ctx.lineTo(b.x, b.y - 3); ctx.stroke();
    }
    ctx.translate(rs.x, rs.y); ctx.rotate(rs.a);
    var L = 40, Wd = 8;
    ctx.globalAlpha = alpha; ctx.fillStyle = "#FFF133"; ctx.strokeStyle = "#0C1E24"; ctx.lineWidth = 1.5;
    if (pieces === 3 && gap > 0.2) {
      var cuts = [-L / 2 - 1, -L / 6, L / 6, L / 2 + 1];
      for (var p = 0; p < 3; p++) {
        var off = (p - 1) * gap;
        ctx.save(); ctx.translate(off, 0);
        ctx.beginPath(); ctx.rect(cuts[p] - off * 0, -Wd, cuts[p + 1] - cuts[p], Wd * 2); ctx.clip();
        boardPath(ctx, L, Wd); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    } else { boardPath(ctx, L, Wd); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  /* Le ballon de rugby et son sillage */
  function drawBall(ctx, trail, rs, alpha, t) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.lineCap = "round";
    for (var i = 1; i < trail.length; i++) { var a = trail[i - 1], b = trail[i], k = i / trail.length; ctx.globalAlpha = alpha * k * k * 0.7; ctx.strokeStyle = "#F3F3EF"; ctx.lineWidth = 0.6 + k * 2.6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.translate(rs.x, rs.y); ctx.rotate(t * 5);
    ctx.globalAlpha = alpha; ctx.fillStyle = "#FFF133"; ctx.strokeStyle = "#141413"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 9.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.moveTo(-3, -2.5); ctx.lineTo(-3, 2.5); ctx.moveTo(0, -2.5); ctx.lineTo(0, 2.5); ctx.moveTo(3, -2.5); ctx.lineTo(3, 2.5); ctx.stroke();
    ctx.restore();
  }
  /* Le point qui passe d'un appui à l'autre */
  function drawDot(ctx, trail, rs, alpha) {
    if (alpha <= 0.01) return;
    ctx.save(); ctx.lineCap = "round";
    for (var i = 1; i < trail.length; i++) { var a = trail[i - 1], b = trail[i], k = i / trail.length; ctx.globalAlpha = alpha * k * k * 0.8; ctx.strokeStyle = "#FFF133"; ctx.lineWidth = 0.8 + k * 4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.globalAlpha = alpha; ctx.fillStyle = "#FFF133"; ctx.strokeStyle = "#141413"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(rs.x, rs.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function Curve(host) {
    var cfg = CURVES[host.dataset.curve];
    var cv = document.createElement("canvas"); cv.setAttribute("aria-hidden", "true"); host.appendChild(cv);
    var ctx = cv.getContext("2d");
    var mix = mode === "terrain" ? 1 : 0, target = mix, time = 0, running = false, visible = true;
    var prog = reduce ? 1 : 0, drawn = reduce, ride = 0, asm = 0;
    var W = 0, H = 0, pad = { t: 0, b: 0 }, N = 240, TP = null, crestIdx = 0, rider = null, wakeT = [];
    var pinEls = [], tip = null, openPin = null, tickEls = [], axisEls = [], legendEl = null, titleEl = null;
    if (cfg.terrPath) {
      var NSs = "http://www.w3.org/2000/svg", sv = document.createElementNS(NSs, "svg");
      sv.setAttribute("width", "0"); sv.setAttribute("height", "0"); sv.style.position = "absolute"; sv.style.visibility = "hidden";
      var pp = document.createElementNS(NSs, "path"); pp.setAttribute("d", cfg.terrPath); sv.appendChild(pp); document.body.appendChild(sv);
      var L = pp.getTotalLength(), raw = [], maxY = -1e9, minY = 1e9;
      for (var q = 0; q <= N; q++) { var gp = pp.getPointAtLength(L * q / N); raw.push(gp); maxY = Math.max(maxY, gp.y); if (gp.y < minY) { minY = gp.y; crestIdx = q; } }
      TP = raw.map(function (g) { return { u: g.x / 1500, h: (maxY - g.y) / 1500 }; });
      sv.remove();
    }
    function shift() { return TP ? 0.16 * Math.sin(time * 0.22) + 0.04 * Math.sin(time * 0.61) : 0; }
    function pt(i, m) {
      var u = i / N, s = cfg.strat(u);
      if (TP) {
        var plotH = Math.max(1, H - pad.t - pad.b), tv = Math.min(0.96, 0.06 + TP[i].h * 1.7 * (W - 2 * M) / plotH);
        var tu = TP[i].u + shift();
        return { u: u + (tu - u) * m, v: s + (tv - s) * m };
      }
      var r = cfg.terr(u, time); return { u: u, v: s + (r - s) * m };
    }
    function Y(v) { return pad.t + (H - pad.t - pad.b) * (1 - v); }
    var M = 16;
    function x(u) { return M + (W - 2 * M) * u; }
    function size() {
      var r = host.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      var wr = host.parentElement.querySelector(".wrap");
      if (wr) { var cs = getComputedStyle(wr); M = Math.max(16, wr.getBoundingClientRect().left - r.left + parseFloat(cs.paddingLeft)); }
      var foot = host.parentElement.querySelector(".stage-foot");
      var footH = foot ? foot.offsetHeight : H * 0.5;
      pad.b = (W < 640 ? 54 : 62) + (cfg.legend ? 34 : 0);
      pad.t = Math.max(H * 0.25, H - footH + (cfg.title ? 124 : 30));
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      placeHtml(); draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var ink = css("--ink"), sA = 1 - mix;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      if (cfg.bands && sA > 0.01) {
        cfg.bands.forEach(function (b, i) { ctx.globalAlpha = sA * (i % 2 ? 0.7 : 0.3); ctx.fillStyle = css("--surface"); ctx.fillRect(x(b[0]), Y(1) - 10, x(b[1]) - x(b[0]), Y(0) - Y(1) + 10 + 40); });
        if (cfg.gap) { ctx.globalAlpha = sA; ctx.fillStyle = "#FFF133"; ctx.fillRect(x(cfg.gap[0]), Y(1) - 10, x(cfg.gap[1]) - x(cfg.gap[0]), Y(0) - Y(1) + 10 + 40); }
        ctx.globalAlpha = 1;
      }
      /* Champ de lignes */
      var n = 9, top = Math.max(0, pad.t - 10), bot = H - 12;
      ctx.strokeStyle = css("--field"); ctx.lineWidth = 1.2;
      for (var f = 0; f < n; f++) {
        var y0 = top + (bot - top) * (f / (n - 1));
        ctx.beginPath();
        for (var xx = 0; xx <= W; xx += 8) {
          var uu = xx / W, amp = mix * (6 + f * 1.7);
          var scan = sA * 2.4 * Math.exp(-Math.pow((uu - ((time * 0.06 + f * 0.02) % 1.4 - 0.2)) * 9, 2));
          var yy = y0 + amp * Math.sin(uu * 9 + f * 0.7 + time * (0.6 + f * 0.03)) + mix * 4 * Math.sin(uu * 23 - time * 1.3 + f) - scan * Math.sin(uu * 60);
          if (xx === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        }
        ctx.stroke();
      }
      var reach = Math.min(1, prog + (1 - prog) * mix), last = Math.max(1, Math.round(N * reach));
      /* Remplissage en Stratégie */
      if (sA > 0.01 && cfg.fill) {
        ctx.globalAlpha = sA * 0.85; ctx.fillStyle = css("--curvefill") || "#FFF7B0";
        ctx.beginPath(); ctx.moveTo(0, Y(0) + 20); ctx.lineTo(0, Y(pt(0, mix).v));
        for (var a = 0; a <= last; a++) { var A = pt(a, mix); ctx.lineTo(x(A.u), Y(A.v)); }
        if (last >= N) { ctx.lineTo(W, Y(pt(N, mix).v)); ctx.lineTo(W, Y(0) + 20); } else ctx.lineTo(x(pt(last, mix).u), Y(0) + 20);
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      }
      /* Ligne principale */
      ctx.strokeStyle = ink; ctx.lineWidth = W < 600 ? 3.5 : 4.5;
      ctx.beginPath(); var pen = false, prevU = -9;
      for (var i = 0; i <= last; i++) {
        var u = i / N, P = pt(i, mix);
        if (cfg.gap && mix < 0.5 && u > cfg.gap[0] && u < cfg.gap[1]) { pen = false; continue; }
        if (!pen) { ctx.moveTo(x(P.u), Y(P.v)); pen = true; } else ctx.lineTo(x(P.u), Y(P.v));
        prevU = P.u;
      }
      ctx.stroke();
      /* La mer continue de part et d'autre de la vague Newave en Terrain */
      {
        ctx.globalAlpha = 1;
        var first = pt(0, mix), lst = pt(N, mix);
        ctx.beginPath(); ctx.moveTo(0, Y(first.v)); ctx.lineTo(x(first.u), Y(first.v));
        if (last >= N) { ctx.moveTo(x(lst.u), Y(lst.v)); ctx.lineTo(W, Y(lst.v)); }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      if (cfg.ref && mix < 0.99) {
        ctx.save(); ctx.globalAlpha = 1 - mix; ctx.strokeStyle = css("--soft"); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.moveTo(x(0), Y(cfg.ref.v)); ctx.lineTo(x(1), Y(cfg.ref.v)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = css("--soft"); ctx.font = "700 13px " + (getComputedStyle(document.body).fontFamily || "sans-serif"); ctx.textAlign = "left";
        ctx.fillText(cfg.ref.label, x(0) + 4, Y(cfg.ref.v) - 8); ctx.restore();
      }
      if (cfg.decorate && mix > 0.01) cfg.decorate(ctx, x, Y, mix, time);
      /* En Stratégie, un point parcourt la courbe ; en Terrain, une surfeuse la surfe */
      if (sA > 0.02 && drawn) {
        var ru = ride % 1, ri = Math.round(ru * N);
        if (!(cfg.gap && ru > cfg.gap[0] && ru < cfg.gap[1])) {
          var R = pt(ri, mix);
          ctx.globalAlpha = sA * 0.4; ctx.fillStyle = "#FFF133"; ctx.beginPath(); ctx.arc(x(R.u), Y(R.v), 16, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = sA; ctx.fillStyle = "#111110"; ctx.beginPath(); ctx.arc(x(R.u), Y(R.v), 6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      if (mix > 0.6) {
        var ra = (mix - 0.6) / 0.4, target = null;
        if (TP) {
          /* Newave : la planche monte et descend la face de la vague, sous la lèvre */
          var swing = 0.5 - 0.5 * Math.cos(time * 0.7), ii = Math.round(crestIdx + 36 + 16 * swing);
          ii = Math.max(2, Math.min(N - 3, ii));
          var A1 = pt(ii, 1), A2 = pt(ii + 2, 1);
          target = { x: x(A1.u), y: Y(A1.v) - 4, a: Math.atan2(Y(A2.v) - Y(A1.v), x(A2.u) - x(A1.u)) };
        } else if (cfg.riderU) {
          var ruu = cfg.riderU(time);
          ra *= Math.max(0, Math.min(1, ruu / 0.06, (1 - ruu) / 0.06));
          var ci = Math.max(1, Math.min(N - 3, Math.round(ruu * N))), C1 = pt(ci, 1), C2 = pt(ci + 2, 1);
          target = { x: x(C1.u), y: Y(C1.v) - (cfg.rider === "ball" ? 12 : 0), a: Math.atan2(Y(C2.v) - Y(C1.v), x(C2.u) - x(C1.u)) };
        } else {
          /* Accueil : la planche suit la face avant de la houle qui avance */
          var cr = travelingWave(0, time).crest, su = cr + 0.035;
          ra *= Math.max(0, Math.min(1, (su - 0.02) / 0.08, (0.97 - su) / 0.08));
          if (su > 0 && su < 1) {
            var bi = Math.max(1, Math.min(N - 3, Math.round(su * N))), B1 = pt(bi, 1), B2 = pt(bi + 2, 1);
            target = { x: x(B1.u), y: Y(B1.v) - 4, a: Math.atan2(Y(B2.v) - Y(B1.v), x(B2.u) - x(B1.u)) };
          }
        }
        if (target) {
          if (!rider || Math.hypot(target.x - rider.x, target.y - rider.y) > 120) { rider = { x: target.x, y: target.y, a: target.a }; wakeT = []; }
          rider.x += (target.x - rider.x) * 0.3; rider.y += (target.y - rider.y) * 0.3;
          var da = Math.atan2(Math.sin(target.a - rider.a), Math.cos(target.a - rider.a)); rider.a += da * 0.15;
          wakeT.push({ x: rider.x, y: rider.y }); if (wakeT.length > 40) wakeT.shift();
          if (cfg.rider === "ball") drawBall(ctx, wakeT, rider, ra, time);
          else if (cfg.rider === "dot") drawDot(ctx, wakeT, rider, ra);
          else drawRider(ctx, wakeT, rider, ra, cfg.surfer === "newave" ? 3 : 1, 6 * (1 - asm));
        } else { rider = null; wakeT = []; }
      } else { rider = null; wakeT = []; }
      pinEls.forEach(function (el, k) { el.classList.toggle("on", cfg.pins[k].u <= reach + 0.001); });
    }
    function placeHtml() {
      cfg.pins.forEach(function (p, i) { var el = pinEls[i]; if (el) { el.style.left = x(p.u) + "px"; el.style.top = Y(cfg.strat(p.u)) + "px"; } });
      tickEls.forEach(function (el) { el.style.left = x(+el.dataset.u) + "px"; el.style.top = (Y(0) + 26) + "px"; });
      if (axisEls[0]) { axisEls[0].style.right = M + "px"; axisEls[0].style.top = (Y(1) - 34) + "px"; }
      if (axisEls[1]) { axisEls[1].style.right = M + "px"; axisEls[1].style.top = (Y(0) + (W < 700 ? 50 : 26)) + "px"; }
      if (gapEl) { gapEl.classList.toggle("mob", W < 760); if (W < 760) { gapEl.style.right = "auto"; gapEl.style.left = M + "px"; gapEl.style.top = (Y(0) + 22) + "px"; } else { gapEl.style.left = "auto"; gapEl.style.right = (W - x(cfg.gap[0]) + 12) + "px"; gapEl.style.top = (Y(1) - 4) + "px"; } }
      if (legendEl) { legendEl.style.top = (Y(0) + 54) + "px"; legendEl.style.left = M + "px"; }
      if (titleEl) { titleEl.style.top = (pad.t - 72) + "px"; titleEl.style.left = M + "px"; }
      if (openPin !== null) placeTip(openPin);
    }
    function placeTip(i) {
      var p = cfg.pins[i], px = x(p.u), py = Y(cfg.strat(p.u)), tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(8, px - tw / 2), W - tw - 8) + "px";
      var top = py - th - 24; tip.style.top = (top < 0 ? py + 24 : top) + "px";
    }
    var sticky = false, closeT = null;
    function closeTip() { clearTimeout(closeT); if (tip) { tip.remove(); tip = null; } if (openPin !== null) pinEls[openPin].setAttribute("aria-expanded", "false"); openPin = null; sticky = false; }
    function laterClose() { clearTimeout(closeT); closeT = setTimeout(function () { if (!sticky) closeTip(); }, 220); }
    function openTip(i, stick) {
      clearTimeout(closeT); host.classList.add("used");
      if (openPin === i) { if (stick) sticky = true; return; }
      closeTip(); sticky = !!stick;
      var p = cfg.pins[i], n = cfg.pins.length;
      tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "status");
      tip.innerHTML = '<span class="when"></span><strong></strong><span class="txt"></span><span class="tip-nav"><button type="button" class="tip-prev" aria-label="Repère précédent">←</button><span class="tip-cnt"></span><button type="button" class="tip-next">Suivant →</button></span>';
      tip.querySelector(".when").textContent = p.when; tip.querySelector("strong").textContent = p.title; tip.querySelector(".txt").textContent = p.text;
      tip.querySelector(".tip-cnt").textContent = (i + 1) + " / " + n;
      var pv = tip.querySelector(".tip-prev"), nx = tip.querySelector(".tip-next");
      if (i === 0) pv.disabled = true;
      if (i === n - 1) nx.textContent = "Fermer";
      pv.addEventListener("click", function (e) { e.stopPropagation(); if (i > 0) openTip(i - 1, true); });
      nx.addEventListener("click", function (e) { e.stopPropagation(); if (i < n - 1) openTip(i + 1, true); else closeTip(); });
      tip.addEventListener("click", function (e) { e.stopPropagation(); sticky = true; });
      tip.addEventListener("pointerenter", function () { clearTimeout(closeT); });
      tip.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") laterClose(); });
      host.appendChild(tip); openPin = i; pinEls[i].setAttribute("aria-expanded", "true"); placeTip(i);
      if (stick) { var tb = tip.getBoundingClientRect(), hb = (document.querySelector(".bar") || {}).offsetHeight || 64; if (tb.top < hb + 8) window.scrollBy({ top: tb.top - hb - 12, behavior: "smooth" }); else if (tb.bottom > window.innerHeight - 8) window.scrollBy({ top: tb.bottom - window.innerHeight + 12, behavior: "smooth" }); }
    }
    cfg.pins.forEach(function (p, i) {
      var b = document.createElement("button"); b.type = "button"; b.className = "pin " + p.type + (p.below ? " below" : "") + (i === 0 ? " invite" : "");
      b.setAttribute("aria-label", p.title + ", " + p.when); b.setAttribute("aria-expanded", "false");
      var lab = document.createElement("span"); lab.className = "pin-label"; lab.textContent = p.title; lab.setAttribute("aria-hidden", "true"); b.appendChild(lab);
      b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") openTip(i, false); });
      b.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && openPin === i) laterClose(); });
      b.addEventListener("focus", function () { if (b.matches(":focus-visible")) openTip(i, false); });
      b.addEventListener("click", function (e) { e.stopPropagation(); if (openPin === i && sticky) closeTip(); else openTip(i, true); });
      host.appendChild(b); pinEls.push(b);
    });
    (cfg.ticks || (cfg.bands || []).map(function (b) { return [(b[0] + b[1]) / 2, b[2]]; })).forEach(function (t) {
      var el = document.createElement("span"); el.className = "tick"; el.dataset.u = t[0]; el.textContent = t[1]; el.setAttribute("aria-hidden", "true"); host.appendChild(el); tickEls.push(el);
    });
    [cfg.axisY, cfg.axisX].forEach(function (t, k) {
      if (!t) return;
      var el = document.createElement("span"); el.className = "axis"; el.textContent = k ? t + " →" : "↑ " + t; el.setAttribute("aria-hidden", "true"); host.appendChild(el); axisEls[k] = el;
    });
    var gapEl = null;
    if (cfg.gapLabel) {
      gapEl = document.createElement("span"); gapEl.className = "gap-lbl"; gapEl.setAttribute("aria-hidden", "true");
      gapEl.innerHTML = "<b></b><span class='g-d'></span><span class='g-m'></span>"; gapEl.querySelector("b").textContent = cfg.gapLabel[0]; gapEl.querySelector(".g-d").textContent = cfg.gapLabel[1]; gapEl.querySelector(".g-m").textContent = cfg.gapLabel[2];
      host.appendChild(gapEl);
    }
    if (cfg.title) {
      titleEl = document.createElement("h2"); titleEl.className = "titre curve-title"; titleEl.textContent = cfg.title; host.appendChild(titleEl);
      var hintEl = document.createElement("span"); hintEl.className = "curve-hint"; hintEl.setAttribute("aria-hidden", "true"); hintEl.innerHTML = '<i></i><span class="h-d">Survolez ou cliquez sur les points pour en savoir plus</span><span class="h-m">Touchez les points pour en savoir plus</span>'; titleEl.appendChild(hintEl);
    }
    if (cfg.legend) {
      legendEl = document.createElement("div"); legendEl.className = "legend-pins"; legendEl.setAttribute("aria-hidden", "true");
      legendEl.innerHTML = '<span><i style="background:#16323A"></i>Formation</span><span><i style="background:#FFF133"></i>Expérience</span><span><i style="background:#FFFFFF"></i>Aujourd\'hui</span>';
      host.appendChild(legendEl);
    }
    host.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && !sticky) laterClose(); });
    document.addEventListener("pointerdown", function (e) { if (tip && !e.target.closest(".tip, .pin")) closeTip(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeTip(); });

    var lastTs = null;
    function loop(ts) {
      var dt = lastTs === null ? 16 : Math.min(50, ts - lastTs); lastTs = ts;
      mix += (target - mix) * 0.07; if (Math.abs(target - mix) < 0.002) mix = target;
      time += dt / 1000;
      if (!drawn) { prog = Math.min(1, prog + dt / 1800); if (prog >= 1) drawn = true; } else ride += dt / 9000;
      if (mix > 0.95) asm = Math.min(1, asm + dt / 1400); else if (mix < 0.5) asm = 0;
      draw();
      if (visible && !document.hidden) requestAnimationFrame(loop); else { running = false; lastTs = null; }
    }
    function kick() { if (reduce) { mix = target; prog = 1; drawn = true; asm = 1; draw(); return; } if (!running) { running = true; requestAnimationFrame(loop); } }
    listeners.push(function (m) { target = m === "terrain" ? 1 : 0; if (m === "terrain") closeTip(); if (root.classList.contains("instant")) mix = target; kick(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
    new ResizeObserver(size).observe(host);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }, { threshold: 0.1 }).observe(host);
    size();
  }
  document.querySelectorAll(".curve").forEach(function (h) { Curve(h); });

  /* ---------- Barre de chapitres et mini-courbe qui suit le récit ---------- */
  var chapbar = document.querySelector(".chapbar"), chapLinks = document.querySelectorAll(".chapbar a"), chapIds = [].map.call(chapLinks, function (a) { return a.getAttribute("href").slice(1); });
  var chapU = chapbar ? chapbar.dataset.u.split(",").map(Number) : [0, 1], miniCfg = chapbar ? CURVES[chapbar.dataset.curve] : null;
  var mini = document.getElementById("mini"), mctx = mini ? mini.getContext("2d") : null, miniU = chapU[0], mlo = 0, mhi = 1;
  if (miniCfg) { mlo = 9; mhi = -9; for (var q = 0; q <= 60; q++) { var vq = miniCfg.strat(q / 60); mlo = Math.min(mlo, vq); mhi = Math.max(mhi, vq); } }
  function drawMini(u) {
    if (!mini || !miniCfg) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = 120, h = 40;
    if (mini.width !== w * dpr) { mini.width = w * dpr; mini.height = h * dpr; }
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0); mctx.clearRect(0, 0, w, h);
    var ink = css("--ink"); mctx.lineCap = "round";
    function my(uu) { return h - 4 - (h - 10) * (mode === "terrain" ? (0.15 + 0.7 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, uu * 1.15))), 2.2)) : (miniCfg.strat(uu) - mlo) / Math.max(0.01, mhi - mlo)); }
    mctx.strokeStyle = ink; mctx.lineWidth = 2.5; mctx.beginPath();
    for (var i = 0; i <= 60; i++) { var uu = i / 60; if (i === 0) mctx.moveTo(uu * w, my(uu)); else mctx.lineTo(uu * w, my(uu)); }
    mctx.stroke();
    mctx.fillStyle = "#FFF133"; mctx.strokeStyle = "#111110"; mctx.lineWidth = 2;
    mctx.beginPath(); mctx.arc(u * w, my(u), 5, 0, Math.PI * 2); mctx.fill(); mctx.stroke();
  }
  function updateChapters() {
    if (!chapbar) return;
    var vh = window.innerHeight, active = -1, frac = 0;
    chapIds.forEach(function (id, i) { var r = document.getElementById(id).getBoundingClientRect(); if (r.top < vh * 0.5) { active = i; frac = Math.min(1, Math.max(0, (vh * 0.5 - r.top) / Math.max(1, r.height))); } });
    chapLinks.forEach(function (a, i) { a.classList.toggle("on", i === active); });
    var tu = active < 0 ? chapU[0] : chapU[active] + (chapU[active + 1] - chapU[active]) * frac;
    miniU += (tu - miniU) * 0.25; drawMini(miniU);
  }
  listeners.push(function () { drawMini(miniU); });

  /* ---------- Apparitions, compteurs, preuves ---------- */
  function fmt(n, dec, suffix) { var s = n.toFixed(dec).replace(".", ","), p = s.split(","); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, " "); return p.join(",") + (suffix || ""); }
  var vh = window.innerHeight;
  function below(el) { return el.getBoundingClientRect().top > vh * 0.92; }
  if (!reduce && "IntersectionObserver" in window) {
    var pendingCounts = [];
    document.querySelectorAll(".reveal, .proof").forEach(function (el) { if (below(el)) el.classList.add("pending"); });
    document.querySelectorAll(".count").forEach(function (el) { if (below(el)) { pendingCounts.push(el); el.textContent = fmt(0, +el.dataset.dec, el.dataset.suffix); } });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target; el.classList.remove("pending");
        if (pendingCounts.indexOf(el) > -1) countUp(el);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    document.querySelectorAll(".reveal, .proof").forEach(function (el) { io.observe(el); });
    pendingCounts.forEach(function (el) { io.observe(el); });
  }
  function countUp(el) { var to = +el.dataset.to, dec = +el.dataset.dec, suf = el.dataset.suffix, t0 = null; function step(ts) { if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1400), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e, dec, suf); if (p < 1) requestAnimationFrame(step); } requestAnimationFrame(step); }

  /* ---------- Progression et bande horizontale ---------- */
  var prog = document.querySelector(".progress"), band = document.getElementById("band"), tracks = band ? band.querySelectorAll(".track-h") : [], overflow = 0;
  function layoutBand() {
    vh = window.innerHeight;
    if (!band) return;
    if (reduce) { band.classList.add("static"); band.style.height = ""; return; }
    band.classList.remove("static");
    overflow = 0; tracks.forEach(function (t) { overflow = Math.max(overflow, t.scrollWidth - window.innerWidth); });
    if (overflow < 40) { band.classList.add("static"); band.style.height = ""; return; }
    band.style.height = (vh + overflow) + "px";
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - vh;
    prog.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
    if (band && !band.classList.contains("static")) {
      var r = band.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / overflow));
      tracks.forEach(function (t) { t.style.transform = "translate3d(" + (-p * overflow) + "px,0,0)"; });
    }
    updateChapters();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", function () { layoutBand(); onScroll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layoutBand(); onScroll(); });
  layoutBand(); onScroll();

  /* ---------- Curseur et sillage ---------- */
  if (finePointer && !reduce) {
    var cur = document.querySelector(".cursor"), wake = document.getElementById("wake"), kctx = wake.getContext("2d");
    var mx = -100, my = -100, cx = -100, cy = -100, trail = [];
    window.addEventListener("pointermove", function (e) { mx = e.clientX; my = e.clientY; var t = e.target.closest && e.target.closest("a, button, .pin"); cur.classList.toggle("big", !!t); }, { passive: true });
    function sizeWake() { var dpr = Math.min(2, window.devicePixelRatio || 1); wake.width = window.innerWidth * dpr; wake.height = window.innerHeight * dpr; kctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    window.addEventListener("resize", sizeWake); sizeWake();
    (function tick() {
      cx += (mx - cx) * 0.22; cy += (my - cy) * 0.22;
      cur.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      kctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (mode === "terrain") {
        trail.push({ x: cx, y: cy }); if (trail.length > 28) trail.shift();
        kctx.lineCap = "round"; kctx.lineJoin = "round";
        for (var i = 1; i < trail.length; i++) { var a = trail[i - 1], b = trail[i]; kctx.strokeStyle = "rgba(255,241,51," + (i / trail.length * 0.55) + ")"; kctx.lineWidth = 1 + i / trail.length * 5; kctx.beginPath(); kctx.moveTo(a.x, a.y); kctx.lineTo(b.x, b.y); kctx.stroke(); }
      } else trail = [];
      requestAnimationFrame(tick);
    })();
  }

  /* ---------- Signature ---------- */
  var STROKES = [
    { d: "M0,166 C120,156 200,178 300,190 C380,196 470,178 520,142 C560,112 592,86 640,74 C692,62 724,84 726,108 C728,132 712,146 698,141 C686,137 685,126 693,120", speed: 0.95, w: 6.6, pause: 0, tail: 0.12 },
    { d: "M617,99 C619,116 629,125 645,122", speed: 0.8, w: 4.6, pause: 70, tail: 0.35 },
    { d: "M649,99 C651,116 661,126 678,124", speed: 0.8, w: 4.6, pause: 60, tail: 0.35 },
    { d: "M625,141 C621,158 617,174 614,190", speed: 1.1, w: 4.4, pause: 80, tail: 0.5 },
    { d: "M647,141 C642,164 638,184 636,204", speed: 1.1, w: 4.4, pause: 50, tail: 0.5 },
    { d: "M669,138 C660,160 655,185 668,203 C680,218 710,220 760,214 C820,207 900,203 960,210 C1020,216 1070,218 1105,210", speed: 1.1, w: 6.6, pause: 110, tail: 0 }
  ];
  var SIGPTS = [[1105.0,210.0,0],[1107.0,210.0,107],[1110.6,210.0,108],[1113.6,209.0,111],[1117.7,207.5,115],[1122.3,205.4,120],[1126.3,202.9,125],[1130.9,200.9,129],[1135.0,197.8,132],[1139.5,194.8,136],[1144.1,191.7,140],[1148.7,188.7,144],[1153.3,184.6,148],[1158.3,181.0,152],[1162.4,177.5,156],[1167.5,172.9,160],[1172.0,168.4,164],[1177.2,163.8,168],[1182.2,158.2,173],[1186.8,152.6,177],[1191.8,146.5,182],[1196.5,140.9,186],[1201.0,134.8,190],[1205.1,129.3,194],[1208.1,123.6,198],[1211.7,118.6,202],[1214.7,113.5,206],[1217.3,108.9,216],[1218.8,105.4,223],[1220.8,101.8,224],[1222.3,98.8,224],[1223.9,96.2,230],[1224.9,94.7,233],[1226.4,93.2,237],[1227.4,92.2,240],[1228.4,90.6,246],[1228.9,90.2,249],[1230.0,89.6,253],[1231.0,89.1,257],[1232.0,89.1,261],[1233.0,88.6,264],[1234.0,88.6,268],[1235.6,88.6,273],[1236.6,88.6,277],[1237.5,88.6,281],[1238.6,89.1,286],[1239.6,89.6,290],[1241.1,91.6,293],[1241.6,95.7,297],[1242.2,99.3,301],[1243.2,104.3,307],[1244.2,110.0,311],[1244.7,116.6,315],[1245.2,122.7,319],[1245.7,129.8,323],[1246.7,136.8,327],[1247.2,143.4,332],[1247.7,150.5,336],[1248.2,157.1,340],[1248.8,163.8,345],[1249.3,169.4,349],[1249.8,175.5,354],[1249.8,180.0,357],[1250.3,185.1,373],[1250.3,189.7,373],[1250.3,193.7,374],[1250.3,197.8,374],[1250.3,201.4,379],[1250.3,203.9,382],[1250.3,206.9,386],[1250.3,209.5,390],[1250.3,211.5,396],[1250.3,213.5,402],[1250.3,215.1,407],[1250.3,216.1,423],[1250.3,215.1,473],[1250.3,214.1,475],[1250.3,212.5,479],[1250.3,210.5,483],[1250.3,207.5,490],[1250.3,203.4,507],[1250.3,199.3,507],[1250.3,194.3,508],[1250.3,188.7,508],[1250.3,181.6,512],[1250.3,173.9,516],[1250.3,166.3,520],[1250.3,157.7,524],[1251.3,150.1,528],[1252.8,143.0,532],[1254.3,135.9,536],[1256.9,129.8,540],[1258.9,124.1,549],[1262.0,119.6,557],[1264.5,115.5,557],[1268.0,112.0,558],[1272.1,109.5,562],[1276.2,107.4,565],[1281.3,105.9,570],[1286.8,104.8,574],[1291.9,104.3,578],[1298.0,104.3,582],[1303.6,104.3,586],[1309.7,104.3,590],[1315.3,104.3,594],[1320.9,104.3,599],[1325.9,105.4,603],[1330.5,106.4,607],[1334.6,107.9,623],[1337.6,110.9,623],[1340.2,113.5,624],[1342.2,116.6,624],[1342.7,119.6,628],[1342.2,122.1,631],[1341.7,126.2,636],[1341.7,129.8,640],[1337.1,133.8,643],[1331.0,138.4,648],[1323.9,143.0,652],[1316.3,147.0,657],[1307.7,151.6,661],[1298.5,155.2,665],[1288.9,159.7,670],[1279.7,163.8,674],[1270.1,166.8,678],[1260.9,170.4,682],[1252.3,173.9,686],[1243.7,177.0,690],[1236.6,179.0,695],[1229.5,181.6,700],[1224.3,183.6,704],[1219.3,185.1,707],[1216.8,186.6,715],[1214.7,187.6,721],[1213.7,188.2,724],[1213.7,189.2,740],[1217.3,189.2,743],[1221.8,189.2,747],[1227.9,189.2,752],[1234.5,189.2,757],[1242.2,189.2,761],[1250.8,189.2,765],[1260.4,189.2,769],[1270.6,189.2,774],[1280.7,188.7,778],[1291.9,187.6,782],[1303.1,187.6,786],[1314.3,187.6,790],[1324.4,187.6,795],[1335.1,187.6,800],[1343.2,189.7,804],[1350.3,192.2,807],[1355.9,195.8,813],[1359.5,199.8,818],[1361.5,202.4,821],[1361.5,205.4,824],[1362.0,208.0,828],[1361.5,210.5,832],[1360.0,213.0,837],[1358.4,215.1,841],[1353.4,218.1,844],[1346.8,221.2,848],[1338.6,225.2,852],[1330.0,229.8,857],[1320.4,234.9,861],[1309.2,240.0,865],[1298.5,245.5,870],[1287.3,250.6,874],[1276.2,255.7,878],[1265.0,260.3,883],[1255.4,263.8,886],[1246.2,267.4,890],[1238.1,269.9,896],[1231.0,271.4,900],[1225.4,272.5,904],[1220.8,272.5,907],[1218.3,272.5,919],[1217.3,272.5,924],[1218.3,270.4,940],[1220.3,267.4,940],[1225.9,263.8,941],[1233.5,260.3,941],[1241.1,256.2,944],[1250.8,251.6,949],[1260.4,248.1,953],[1270.1,243.5,957],[1279.7,238.9,961],[1289.9,234.9,965],[1299.5,230.3,970],[1309.7,225.7,974],[1318.3,221.7,979],[1326.4,217.1,983],[1333.0,213.0,987],[1338.6,209.5,990],[1342.7,205.4,997],[1345.2,202.4,1001],[1346.2,199.8,1004],[1345.7,197.3,1007],[1345.7,194.8,1010],[1345.7,192.2,1013],[1342.7,189.7,1017],[1337.6,187.1,1024],[1331.5,184.1,1040],[1322.9,181.0,1040],[1313.2,178.5,1041],[1302.1,176.4,1041],[1290.4,175.0,1045],[1277.7,173.9,1049],[1265.5,172.9,1053],[1252.8,172.9,1057],[1240.6,172.9,1061],[1228.4,172.9,1066],[1216.8,172.9,1070],[1205.6,172.9,1074],[1195.9,174.4,1079],[1186.8,176.0,1083],[1179.2,178.5,1087],[1172.0,181.6,1091],[1167.0,185.1,1107],[1162.4,188.7,1107],[1158.3,191.2,1108],[1156.3,194.8,1108],[1154.8,197.8,1113],[1153.3,200.3,1117],[1152.7,202.4,1120],[1152.7,204.9,1124],[1152.7,207.5,1128],[1152.7,210.0,1132],[1154.3,212.5,1137],[1155.8,214.6,1141],[1159.9,217.6,1148],[1166.5,220.1,1157],[1173.1,222.7,1157],[1181.2,225.2,1158],[1190.4,227.3,1162],[1200.0,228.8,1165],[1210.7,230.8,1170],[1222.3,231.8,1174],[1234.0,232.8,1178],[1246.2,233.4,1182],[1258.4,233.4,1186],[1271.6,233.4,1191],[1283.8,233.4,1195],[1296.0,233.4,1199],[1307.7,232.3,1203],[1318.3,230.8,1207],[1327.5,227.3,1212],[1335.1,222.7,1217],[1340.7,217.6,1221],[1344.7,212.5,1224],[1346.8,206.9,1228],[1346.8,201.4,1232],[1346.8,194.8,1237],[1346.8,189.2,1241],[1343.7,183.1,1245],[1339.1,178.0,1248],[1332.5,172.9,1253],[1323.9,168.4,1258],[1313.8,164.8,1262],[1302.6,162.3,1266],[1290.4,160.7,1270],[1277.7,160.2,1274],[1264.5,160.2,1278],[1250.8,160.2,1282],[1237.1,161.8,1287],[1223.9,164.3,1291],[1211.7,167.8,1295],[1199.5,173.4,1300],[1188.8,178.5,1304],[1179.2,184.1,1308],[1170.6,189.7,1313],[1162.4,195.3,1317],[1156.3,200.3,1321],[1150.8,204.9,1324],[1146.7,209.5,1330],[1144.1,213.0,1335],[1142.6,216.1,1338],[1142.1,218.6,1341],[1141.6,220.7,1347],[1142.1,222.2,1351],[1142.1,224.2,1357],[1142.6,225.2,1358],[1146.7,226.2,1361],[1152.2,227.8,1364],[1158.8,228.3,1369],[1167.5,228.8,1374],[1177.7,228.8,1378],[1188.8,228.8,1382],[1201.5,228.8,1386],[1214.7,228.8,1391],[1228.4,228.8,1407],[1242.7,228.8,1407],[1257.9,227.3,1408],[1273.6,225.2,1408],[1289.4,223.2,1412],[1306.1,221.2,1416],[1322.4,219.1,1420],[1338.6,217.6,1424],[1354.9,215.6,1429],[1370.1,214.1,1433],[1384.3,212.5,1437],[1397.5,211.0,1441],[1410.7,209.0,1446],[1423.0,207.5,1450],[1434.6,205.4,1454],[1444.8,203.4,1458],[1453.9,201.9,1463],[1462.1,199.8,1467],[1468.7,197.3,1471],[1475.3,195.3,1474],[1480.3,193.2,1479],[1484.9,191.2,1484],[1488.5,190.2,1488],[1491.5,188.7,1491],[1494.6,187.6,1499],[1496.6,187.1,1504],[1498.1,186.6,1508]];
  var VB = { x: 0, y: 40, w: 1500, h: 250 }, NS = "http://www.w3.org/2000/svg";
  var probe = document.createElementNS(NS, "svg"); probe.setAttribute("width", "0"); probe.setAttribute("height", "0"); probe.style.position = "absolute"; probe.style.visibility = "hidden"; document.body.appendChild(probe);
  function noise(t, s) { return Math.sin(t * 0.021 + s) * 0.6 + Math.sin(t * 0.057 + s * 2.3) * 0.4; }
  var TRACKS = STROKES.map(function (s, k) {
    var p = document.createElementNS(NS, "path"); p.setAttribute("d", s.d); probe.appendChild(p);
    var len = p.getTotalLength(), pts = [];
    for (var l = 0; l <= len; l += 2) {
      var a = p.getPointAtLength(l), b = p.getPointAtLength(Math.min(len, l + 1)), nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1, j = noise(l, k * 7.1) * 0.9, u = l / len;
      var st = Math.min(1, u / 0.05), en = s.tail > 0 ? Math.min(1, (1 - u) / s.tail) : 1, taper = Math.pow(Math.max(0.08, Math.min(st, en)), 0.7), press = 0.78 + 0.22 * noise(l * 1.7, s.w * 3);
      pts.push({ x: a.x + nx / nl * j, y: a.y + ny / nl * j, t: l / s.speed, w: s.w * taper * press });
    }
    return { pts: pts, pause: s.pause };
  });
  (function () {
    var pts = [], n = SIGPTS.length;
    for (var i = 0; i < n; i++) { var a = SIGPTS[Math.max(0, i - 1)], b = SIGPTS[Math.min(n - 1, i + 1)], dt = Math.max(8, b[2] - a[2]), v = Math.hypot(b[0] - a[0], b[1] - a[1]) / dt, u = i / (n - 1), en = Math.min(1, (1 - u) / 0.12); pts.push({ x: SIGPTS[i][0], y: SIGPTS[i][1], t: SIGPTS[i][2], w: Math.max(3.6, Math.min(7.6, 7.6 - v * 3.2)) * Math.pow(Math.max(0.15, en), 0.6) }); }
    TRACKS.push({ pts: pts, pause: 0 });
  })();
  var sign = document.getElementById("sign"), sctx = sign.getContext("2d"), signToken = null;
  function signSetup() { var r = sign.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); sign.width = Math.max(1, Math.round(r.width * dpr)); sign.height = Math.max(1, Math.round(r.width * VB.h / VB.w * dpr)); var k = sign.width / VB.w; sctx.setTransform(k, 0, 0, k, -VB.x * k, -VB.y * k); sctx.lineCap = "round"; sctx.lineJoin = "round"; sctx.strokeStyle = mode === "terrain" ? "#FFF133" : "#111110"; sctx.clearRect(VB.x, VB.y, VB.w, VB.h); }
  function sseg(tr, i) { var a = tr.pts[i - 1], b = tr.pts[i]; sctx.lineWidth = (a.w + b.w) / 2; sctx.beginPath(); sctx.moveTo(a.x, a.y); sctx.lineTo(b.x, b.y); sctx.stroke(); }
  function signAll() { signSetup(); TRACKS.forEach(function (tr) { for (var i = 1; i < tr.pts.length; i++) sseg(tr, i); }); }
  function signPlay() {
    if (reduce) { signAll(); return; }
    signSetup(); var token = {}; signToken = token;
    var t = 0, plan = TRACKS.map(function (tr) { t += tr.pause; var s = t; t += tr.pts[tr.pts.length - 1].t; return { tr: tr, start: s, done: 1 }; }), t0 = null;
    function frame(ts) { if (signToken !== token) return; if (t0 === null) t0 = ts; var el = ts - t0, active = false; plan.forEach(function (p) { var pts = p.tr.pts; while (p.done < pts.length && pts[p.done].t <= el - p.start) { sseg(p.tr, p.done); p.done++; } if (p.done < pts.length) active = true; }); if (active) requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  }
  signAll();
  if ("IntersectionObserver" in window && !reduce) { var sio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { signPlay(); sio.disconnect(); } }, { threshold: 0.7 }); sio.observe(sign); }
  listeners.push(function () { signToken = null; signAll(); });
  window.addEventListener("resize", function () { signToken = null; signAll(); });
  window.signOn = function (cv, color) {
    var tr = TRACKS[TRACKS.length - 1], pts = tr.pts, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    pts.forEach(function (p) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    var pad = 14; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1), bw = x1 - x0, bh = y1 - y0;
    cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.width * bh / bw * dpr)); cv.style.height = (r.width * bh / bw) + "px";
    var c = cv.getContext("2d"), k = cv.width / bw, m = Math.max(1, 5 * bw / (5.6 * r.width));
    c.setTransform(k, 0, 0, k, -x0 * k, -y0 * k); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = color; c.clearRect(x0, y0, bw, bh);
    function seg(i) { var a = pts[i - 1], b = pts[i]; c.lineWidth = (a.w + b.w) / 2 * m; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
    var tok = {}; cv._tok = tok;
    if (reduce) { for (var j = 1; j < pts.length; j++) seg(j); return; }
    var done = 1, t0 = null;
    function frame(ts) { if (cv._tok !== tok) return; if (t0 === null) t0 = ts; var el = (ts - t0) * 1.6; while (done < pts.length && pts[done].t <= el) { seg(done); done++; } if (done < pts.length) requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
  };
  window.signOff = function (cv) { cv._tok = null; var c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); };

  var saved = null;
  try { saved = localStorage.getItem("lecture"); } catch (e) {}
  applyMode(saved === "terrain" ? "terrain" : "strategie");
})();

(function () {
  function seen(k) { try { return localStorage.getItem(k) === "vu"; } catch (e) { return false; } }
  function mark(k) { try { localStorage.setItem(k, "vu"); } catch (e) {} }
  // Bulle d'explication sous les deux boutons (accueil)
  var hint = document.getElementById("hint");
  if (hint && !seen("guide")) {
    var tBtn = document.querySelector('.choice[data-mode="terrain"]'), active = false;
    var T1 = "Chaque étude se lit de deux façons : d'un point de vue stratégique et d'un point de vue terrain. <b>Essayez : cliquez sur Terrain.</b>";
    var T2 = "Voici la lecture Terrain : les mêmes études, racontées aux côtés des personnes concernées. Vous pouvez changer de lecture à tout moment, ici ou dans le bandeau en haut de l'écran.";
    var X = '<button class="x" type="button" aria-label="Fermer l\'explication">×</button>', OK = '<br><button class="ok" type="button">Compris</button>';
    function close() { hint.classList.remove("on"); tBtn.classList.remove("pulse"); active = false; setTimeout(function () { hint.hidden = true; }, 400); }
    function step(n) {
      hint.innerHTML = (n === 2 ? T2 : T1) + (n === 1 ? "" : OK) + X;
      hint.style.setProperty("--ax", (tBtn.offsetLeft + tBtn.offsetWidth / 2 - 8) + "px");
      tBtn.classList.toggle("pulse", n === 1);
      hint.querySelectorAll(".x, .ok").forEach(function (b) { b.addEventListener("click", close); });
    }
    document.querySelectorAll(".chooser [data-mode]").forEach(function (b) {
      b.addEventListener("click", function () { if (active) step(b.dataset.mode === "terrain" ? 2 : 3); });
    });
    setTimeout(function () {
      if (document.documentElement.getAttribute("data-lecture") === "terrain") return;
      hint.hidden = false; step(1); active = true; mark("guide");
      requestAnimationFrame(function () { hint.classList.add("on"); });
    }, 1200);
  }
  // Étiquette à côté du bouton du bandeau, la première fois qu'il apparaît
  var mt = document.getElementById("mini-toggle"), bar = document.querySelector(".bar");
  if (mt && bar && !seen("bandeau")) {
    var tag = document.createElement("span"); tag.className = "toggle-tag"; tag.setAttribute("aria-hidden", "true"); tag.textContent = "Changez de lecture ici, à tout moment"; bar.appendChild(tag);
    var done = false;
    function show() { if (done) return; done = true; mark("bandeau"); tag.classList.add("on"); setTimeout(function () { tag.classList.remove("on"); }, 4500); }
    function check() { if (!mt.classList.contains("away")) setTimeout(show, 600); }
    if (document.getElementById("chooser")) new MutationObserver(check).observe(mt, { attributes: true, attributeFilter: ["class"] });
    else { var onS = function () { if (window.scrollY > window.innerHeight * 0.5) { window.removeEventListener("scroll", onS); setTimeout(show, 300); } }; window.addEventListener("scroll", onS, { passive: true }); }
    mt.addEventListener("click", function () { tag.classList.remove("on"); });
  }
})();

(function () {
  var box = document.getElementById("lanes"); if (!box) return;
  var plot = box.querySelector(".lanes-plot"), tip = null, open = null, sticky = false, closeT = null;
  var btns = [].slice.call(box.querySelectorAll(".lp")).sort(function (a, b) { return +a.dataset.i - +b.dataset.i; });
  function close() { clearTimeout(closeT); if (tip) { tip.remove(); tip = null; } if (open) open.setAttribute("aria-expanded", "false"); open = null; sticky = false; }
  function later() { clearTimeout(closeT); closeT = setTimeout(function () { if (!sticky) close(); }, 220); }
  function show(b, stick) {
    clearTimeout(closeT); box.classList.add("used");
    if (open === b) { if (stick) sticky = true; return; }
    close(); sticky = !!stick;
    var k = btns.indexOf(b), n = btns.length;
    tip = document.createElement("div"); tip.className = "ltip"; tip.setAttribute("role", "status");
    tip.innerHTML = '<span class="when"></span><strong></strong><span class="txt"></span><span class="tip-nav"><button type="button" class="tip-prev" aria-label="Repère précédent">←</button><span class="tip-cnt"></span><button type="button" class="tip-next">Suivant →</button></span>';
    tip.querySelector(".when").textContent = b.dataset.when; tip.querySelector("strong").textContent = b.dataset.title; tip.querySelector(".txt").textContent = b.dataset.text;
    tip.querySelector(".tip-cnt").textContent = (k + 1) + " / " + n;
    var pv = tip.querySelector(".tip-prev"), nx = tip.querySelector(".tip-next");
    if (k === 0) pv.disabled = true; if (k === n - 1) nx.textContent = "Fermer";
    pv.addEventListener("click", function (e) { e.stopPropagation(); if (k > 0) show(btns[k - 1], true); });
    nx.addEventListener("click", function (e) { e.stopPropagation(); if (k < n - 1) show(btns[k + 1], true); else close(); });
    tip.addEventListener("click", function (e) { e.stopPropagation(); sticky = true; });
    tip.addEventListener("pointerenter", function () { clearTimeout(closeT); });
    tip.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") later(); });
    plot.appendChild(tip); open = b; b.setAttribute("aria-expanded", "true");
    var pr = plot.getBoundingClientRect(), br = b.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    var cx = br.left + br.width / 2 - pr.left, cy = br.top + br.height / 2 - pr.top;
    tip.style.left = Math.min(Math.max(0, cx - tw / 2), pr.width - tw) + "px";
    var lr = box.getBoundingClientRect(), top = cy - th - 22;
    if (top + pr.top < lr.top - 120) top = Math.min(cy + 22, lr.bottom - pr.top - th);
    tip.style.top = top + "px";
    if (stick) { var tb = tip.getBoundingClientRect(), hb = (document.querySelector(".bar") || {}).offsetHeight || 64; if (tb.top < hb + 8) window.scrollBy({ top: tb.top - hb - 12, behavior: "smooth" }); else if (tb.bottom > window.innerHeight - 8) window.scrollBy({ top: tb.bottom - window.innerHeight + 12, behavior: "smooth" }); }
  }
  btns.forEach(function (b, k) {
    if (k === 0) b.classList.add("invite");
    b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") show(b, false); });
    b.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && open === b) later(); });
    b.addEventListener("focus", function () { if (b.matches(":focus-visible")) show(b, false); });
    b.addEventListener("click", function (e) { e.stopPropagation(); if (open === b && sticky) close(); else show(b, true); });
  });
  document.addEventListener("pointerdown", function (e) { if (tip && !e.target.closest(".ltip, .lp")) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
})();

(function () {
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  if (!location.hash) window.scrollTo(0, 0);
  window.addEventListener("pageshow", function (e) { document.documentElement.classList.remove("leaving"); document.querySelectorAll(".card.pressed").forEach(function (c) { c.classList.remove("pressed"); }); if (e.persisted && !location.hash) window.scrollTo(0, 0); });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll('a[href$=".html"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.getAttribute("aria-disabled") === "true") return;
      if ("onpagereveal" in window) return;
      e.preventDefault();
      var go = function () { window.location.href = a.href; };
      if (reduce) return go();
      if (a.classList.contains("card")) {
        a.classList.add("pressed");
        setTimeout(function () { document.documentElement.classList.add("leaving"); }, 260);
        setTimeout(go, 560);
      } else {
        document.documentElement.classList.add("leaving");
        setTimeout(go, 320);
      }
    });
  });
})();

(function () {
  var run = document.getElementById("pin-run"); if (!run) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function pick(imgs, q, cur) { var k = q >= 1 ? imgs.length - 1 : Math.min(imgs.length - 1, Math.floor(q * imgs.length)); if (k !== cur) imgs.forEach(function (im, i) { im.classList.toggle("on", i === k); }); return k; }
  var text = run.querySelector(".stage-text"), bar = document.querySelector(".bar");
  var f = document.getElementById("hero-ph"), m = document.getElementById("hero-mob");
  var kick = text.querySelector(".pro-kicker") || text, title = text.querySelector(".pro-pos") || text, duo = text.querySelector(".duo") || text.querySelector(".sport-intro");
  var mode = "", R = 0, stick = 0, T0 = 0, cur = -1, signed = false, lastW = 0;
  var rel0 = 0, rel1 = 0, W0 = 0, H0 = 0, S = 0;                 /* grand écran */
  var mW = 0, mH = 0, mS = 120;                                   /* mobile */
  var target = null, imgs = [], cv = null;
  function measure() {
    lastW = window.innerWidth;
    mode = (f && getComputedStyle(f).display !== "none") ? "d" : (m && getComputedStyle(m).display !== "none") ? "m" : "";
    if (!mode) { run.style.setProperty("--run", "0px"); return; }
    target = mode === "d" ? f : m; imgs = [].slice.call(target.querySelectorAll("img")); cv = target.querySelector(".hero-sig");
    var vh = window.innerHeight, hb = bar ? bar.offsetHeight : 64;
    if (mode === "d") {
      f.style.width = ""; f.style.height = ""; f.style.top = "0px";
      var tr = text.getBoundingClientRect(), kr = kick.getBoundingClientRect(), dr = duo.getBoundingClientRect(), r = f.getBoundingClientRect();
      rel0 = kr.top - tr.top; W0 = r.width; H0 = r.height; S = Math.max(150, Math.min(200, W0 * 0.46));
      rel1 = Math.max(rel0, dr.bottom - tr.top - S);
      R = Math.round(vh * 0.7); stick = Math.min(hb + 2, vh - text.offsetHeight - 16);
    } else {
      mW = Math.min(window.innerWidth * 0.7, 300); mH = mW * 1.25;
      m.style.setProperty("--mw", mW + "px"); m.style.setProperty("--mh", mH + "px");
      var tr2 = text.getBoundingClientRect(), pr = title.getBoundingClientRect();
      R = Math.round(vh * 0.6); stick = hb + 8 - (pr.top - tr2.top);
    }
    run.style.setProperty("--run", R + "px"); run.style.setProperty("--stick", stick + "px");
    T0 = run.getBoundingClientRect().top + window.scrollY;
  }
  function update() {
    if (!mode) return;
    var S0 = T0 - stick, d = Math.min(R, Math.max(0, window.scrollY - S0)), q = reduce ? (window.scrollY > S0 + 4 ? 1 : 0) : d / R, e = ease(q);
    if (mode === "d") {
      f.style.top = (rel0 + (rel1 - rel0) * e) + "px";
      f.style.width = (W0 + (S - W0) * e) + "px"; f.style.height = (H0 + (S - H0) * e) + "px";
    } else {
      m.style.setProperty("--mw", (mW + (mS - mW) * e) + "px"); m.style.setProperty("--mh", (mH + (mS - mH) * e) + "px");
    }
    cur = pick(imgs, q, cur);
    if (q >= .85 && !signed) { signed = true; target.classList.add("signed"); if (window.signOn) window.signOn(cv, "#FFF133"); }
    else if (q < .7 && signed) { signed = false; target.classList.remove("signed"); if (window.signOff) window.signOff(cv); }
  }
  var tk = false;
  window.addEventListener("scroll", function () { if (!tk) { tk = true; requestAnimationFrame(function () { tk = false; update(); }); } }, { passive: true });
  function init() { var y = window.scrollY; measure(); if (signed && target) { target.classList.remove("signed"); signed = false; } cur = -1; update(); }
  window.addEventListener("resize", function () { if (window.innerWidth !== lastW) init(); });
  window.addEventListener("load", init);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  if (window.ResizeObserver) { var lastH = 0; new ResizeObserver(function () { if (mode === "d" && Math.abs(text.offsetHeight - lastH) > 2) { lastH = text.offsetHeight; measure(); update(); } }).observe(text); }
  init();
})();

(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* La carte retournée */
  var egg = document.querySelector(".egg button"), note = document.getElementById("egg-note");
  if (egg && note) {
    egg.addEventListener("click", function () { var o = egg.getAttribute("aria-expanded") !== "true"; egg.setAttribute("aria-expanded", String(o)); note.classList.toggle("on", o); note.hidden = false; });
    document.addEventListener("pointerdown", function (e) { if (egg.getAttribute("aria-expanded") === "true" && !egg.contains(e.target) && !note.contains(e.target)) { egg.setAttribute("aria-expanded", "false"); note.classList.remove("on"); } });
  }
  /* Bande grise du parcours pro : elle commence au début de la courbe */
  var hero = document.querySelector(".hero.stage"), sf = hero && hero.querySelector(".stage-foot");
  if (hero && sf) { var pf = function () { hero.style.setProperty("--pf", (sf.offsetTop + 30) + "px"); }; pf(); window.addEventListener("resize", pf); window.addEventListener("load", pf); }
  /* Toujours arriver en haut d'une nouvelle page (sauf lien vers une section) */
  var touched = false; ["wheel", "touchstart", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { touched = true; }, { once: true, passive: true }); });
  var toTop = function () { if (location.hash || touched) return; window.scrollTo(0, 0); var t = document.getElementById("top"); if (t && window.self !== window.top) { try { t.scrollIntoView({ block: "start" }); } catch (e) {} } };
  window.addEventListener("pagereveal", toTop); window.addEventListener("load", toTop);
  /* La frise sportive se dessine à l'arrivée */
  var band = document.querySelector(".sport-band");
  if (band) { if (!("IntersectionObserver" in window) || reduce) band.classList.add("in"); else new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { band.classList.add("in"); o.disconnect(); } }, { threshold: .35 }).observe(band); }
  /* Lien actif dans le menu */
  var links = document.querySelectorAll('.nav a[href^="#"]');
  if (links.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) links.forEach(function (l) { l.classList.toggle("on", l.getAttribute("href") === "#" + x.target.id); }); }); }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (l) { var t = document.querySelector(l.getAttribute("href")); if (t) io.observe(t); });
  }
  /* Visionneuse des photos */
  var imgs = Array.prototype.slice.call(document.querySelectorAll(".strip img"));
  if (imgs.length) {
    var lb = document.createElement("div"); lb.className = "lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true"); lb.setAttribute("aria-label", "Photo en grand");
    lb.innerHTML = '<img alt=""><p></p><button class="lb-x" type="button" aria-label="Fermer">×</button><button class="lb-p" type="button" aria-label="Photo précédente">←</button><button class="lb-n" type="button" aria-label="Photo suivante">→</button>';
    document.body.appendChild(lb);
    var cur = 0, big = lb.querySelector("img"), cap = lb.querySelector("p");
    function show(i) { cur = (i + imgs.length) % imgs.length; big.src = imgs[cur].src; cap.textContent = imgs[cur].getAttribute("data-cap") || ""; }
    function open(i) { show(i); lb.classList.add("on"); lb.querySelector(".lb-x").focus(); }
    function close() { lb.classList.remove("on"); if (imgs[cur]) imgs[cur].focus(); }
    imgs.forEach(function (im, i) { im.tabIndex = 0; im.addEventListener("click", function () { open(i); }); im.addEventListener("keydown", function (e) { if (e.key === "Enter") open(i); }); });
    lb.querySelector(".lb-x").addEventListener("click", close);
    lb.querySelector(".lb-p").addEventListener("click", function () { show(cur - 1); });
    lb.querySelector(".lb-n").addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) { if (!lb.classList.contains("on")) return; if (e.key === "Escape") close(); if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
  }
})();
