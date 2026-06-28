'use strict';

/* ════════════════════════════════════════
   CONSTANTES
   ════════════════════════════════════════ */
const TOTAL_FIGURINHAS  = 980;
const FIGURINHAS_PACOTE = 7;

/* ════════════════════════════════════════
   NAVEGAÇÃO — View Transition API
   ════════════════════════════════════════ */

/** IDs das seções navegáveis */
const SECOES = ['inicio', 'como-funciona', 'sobre'];

/** Seção e botão atualmente ativos */
let secaoAtual = 'inicio';

/**
 * Troca a seção visível usando View Transition API.
 * @param {string} novoId - ID da seção de destino
 */
function trocarSecao(novoId) {
    if (novoId === secaoAtual) return;

    const elAtual = document.getElementById(secaoAtual);
    const elProx  = document.getElementById(novoId);
    if (!elAtual || !elProx) return;

    atualizarNavbar(novoId);

    const aplicarMudanca = () => {
        elAtual.classList.remove('ativa');
        elProx.classList.add('ativa');
        secaoAtual = novoId;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (document.startViewTransition) {
        document.startViewTransition(aplicarMudanca);
    } else {
        aplicarMudanca();
    }
}

/** Marca o botão da navbar correto como ativo */
function atualizarNavbar(idAtivo) {
    SECOES.forEach(id => {
        const btn = document.getElementById('nav-' + id);
        if (btn) btn.classList.toggle('ativo', id === idAtivo);
    });
}

/* ════════════════════════════════════════
   ALGORITMO — Problema do Colecionador de Cupons via WASM
   ════════════════════════════════════════ */

/**
 * @param {number} jatem     - Figurinhas únicas já coladas
 * @param {number} repetidas - Figurinhas repetidas disponíveis
 * @param {number} preco     - Preço de cada pacote em R$
 */
function calcular(jatem, repetidas, preco) {
    const faltam   = TOTAL_FIGURINHAS - jatem;
    const efetivas = Math.max(0, faltam - repetidas);

    if (efetivas === 0) {
        return { faltam, figurinhas: 0, pacotes: 0, valor: 0 };
    }

    const calculadora = new moduloWasm.CalculadoraAlbum(TOTAL_FIGURINHAS, efetivas, FIGURINHAS_PACOTE, preco);
    const resultado   = calculadora.calcular();

    const figurinhas = resultado.figurinhasEsperadas;
    const pacotes    = resultado.pacotesEsperados;
    const valor      = resultado.valorEsperado;

    calculadora.delete();

    return { faltam, figurinhas, pacotes, valor };
}

/* ════════════════════════════════════════
   GRÁFICO — Curva de custo acumulado (SVG)
   ════════════════════════════════════════ */

let curvaGlobal = null;

function gerarCurvaWasm(preco) {
    const calc = new moduloWasm.CalculadoraAlbum(TOTAL_FIGURINHAS, 1, FIGURINHAS_PACOTE, preco);
    const vec  = calc.gerarCurva();

    curvaGlobal = [];
    for (let i = 0; i < vec.size(); i++) {
        curvaGlobal.push(vec.get(i));
    }

    vec.delete();
    calc.delete();
}

/* ─────────────────────────────────────────
   Estado do gráfico SVG entre renderizações.
   Criamos os nós DOM uma única vez e depois
   só atualizamos atributos — sem destruir e
   recriar o SVG a cada cálculo ou resize.
   ───────────────────────────────────────── */
const grafico = {
    svg:         null,
    polyline:    null,
    polygon:     null,
    gridLines:   [],   // 5 linhas horizontais
    gridLabels:  [], // 5 labels do eixo Y
    labelsX:     [],   // labels do eixo X
    eixoV:       null,
    eixoH:       null,
    marcadorH:   null,
    marcadorV:   null,
    marcadorPt:  null,
    tooltipEst:  null,
    labelMarcY:  null,
    ttGroup:     null,
    ttLinha:     null,
    ttBola:      null,
    ttRect:      null,
    ttTexto1:    null,
    ttTexto2:    null,
    overlay:     null,
    gradStop0:   null,
    gradStop1:   null,
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}

/**
 * Cria toda a estrutura SVG uma única vez.
 * Só é chamada quando o container ainda não tem SVG.
 */
function criarEstruturaSVG(container) {
    container.textContent = '';

    const svg = svgEl('svg', {
        id: 'grafico-svg',
        xmlns: SVG_NS,
        'aria-label': 'Curva de custo esperado por figurinhas coladas',
    });

    /* Gradiente */
    const defs  = svgEl('defs');
    const grad  = svgEl('linearGradient', { id: 'gradCurva', x1: '0', y1: '0', x2: '0', y2: '1' });
    const stop0 = svgEl('stop', { offset: '0%',   'stop-color': 'var(--cor-curva)', 'stop-opacity': '0.8' });
    const stop1 = svgEl('stop', { offset: '100%', 'stop-color': 'var(--cor-curva)', 'stop-opacity': '0.0' });
    grad.appendChild(stop0);
    grad.appendChild(stop1);
    defs.appendChild(grad);
    svg.appendChild(defs);

    /* Grade horizontal (5 linhas + 5 labels Y) */
    const LABELS_X_FALTANDO = [980, 800, 600, 400, 200, 1];
    for (let t = 0; t <= 4; t++) {
        const linha = svgEl('line', {
            stroke: 'var(--cor-grade)', 'stroke-width': '1', 'stroke-dasharray': '4 4',
        });
        const label = svgEl('text', { 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'grafico-label' });
        svg.appendChild(linha);
        svg.appendChild(label);
        grafico.gridLines.push(linha);
        grafico.gridLabels.push(label);
    }

    /* Área preenchida sob a curva */
    const polygon = svgEl('polygon', { fill: 'url(#gradCurva)', opacity: '0.25' });
    svg.appendChild(polygon);

    /* Linha da curva */
    const polyline = svgEl('polyline', {
        fill: 'none', stroke: 'var(--cor-curva)', 'stroke-width': '2.5',
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    });
    svg.appendChild(polyline);

    /* Eixos */
    const eixoV = svgEl('line', { stroke: 'var(--cor-eixo)', 'stroke-width': '1.5' });
    const eixoH = svgEl('line', { stroke: 'var(--cor-eixo)', 'stroke-width': '1.5' });
    svg.appendChild(eixoV);
    svg.appendChild(eixoH);

    /* Labels eixo X */
    const labelsX = [];
    for (const faltando of LABELS_X_FALTANDO) {
        const txt = svgEl('text', { 'text-anchor': 'middle', class: 'grafico-label' });
        txt.textContent = faltando === 1 ? '980' : String(TOTAL_FIGURINHAS - (TOTAL_FIGURINHAS - faltando));
        /* o conteúdo de texto correto é recalculado em atualizarSVG, aqui só criamos o nó */
        svg.appendChild(txt);
        labelsX.push({ el: txt, faltando });
    }

    /* Label eixo X (título) */
    const labelEixoX = svgEl('text', { 'text-anchor': 'middle', class: 'grafico-label grafico-label-eixo' });
    labelEixoX.textContent = 'Figurinhas já coladas';
    svg.appendChild(labelEixoX);

    /* Marcador: linhas tracejadas + label Y + ponto */
    const marcadorH  = svgEl('line', { stroke: 'var(--cor-marcador)', 'stroke-width': '1', 'stroke-dasharray': '4 3', opacity: '0.5' });
    const labelMarcY = svgEl('text', { 'text-anchor': 'end', 'dominant-baseline': 'middle', class: 'grafico-label grafico-label-marcador' });
    const marcadorV  = svgEl('line', { stroke: 'var(--cor-marcador)', 'stroke-width': '1.5', 'stroke-dasharray': '5 3', opacity: '0.7' });
    const marcadorPt = svgEl('circle', { r: '5', fill: 'var(--cor-marcador)', stroke: 'var(--cor-fundo-card)', 'stroke-width': '2' });
    const tooltipEst = svgEl('text', { class: 'grafico-label grafico-label-marcador' });
    svg.appendChild(marcadorH);
    svg.appendChild(labelMarcY);
    svg.appendChild(marcadorV);
    svg.appendChild(marcadorPt);
    svg.appendChild(tooltipEst);

    /* Tooltip interativo */
    const ttGroup  = svgEl('g', { id: 'svg-tooltip', class: 'svg-tooltip-oculto', 'pointer-events': 'none' });
    const ttLinha  = svgEl('line',   { stroke: 'var(--cor-tooltip-linha)', 'stroke-width': '1', 'stroke-dasharray': '3 3', opacity: '0.6' });
    const ttBola   = svgEl('circle', { r: '4', fill: 'var(--cor-curva)', stroke: 'var(--cor-fundo-card)', 'stroke-width': '2' });
    const ttRect   = svgEl('rect',   { rx: '5', ry: '5', fill: 'var(--cor-tooltip-bg)', stroke: 'var(--cor-tooltip-borda)', 'stroke-width': '1', opacity: '0.92' });
    const ttTexto1 = svgEl('text',   { class: 'grafico-label tt-texto' });
    const ttTexto2 = svgEl('text',   { class: 'grafico-label tt-texto tt-destaque' });
    ttGroup.appendChild(ttLinha);
    ttGroup.appendChild(ttBola);
    ttGroup.appendChild(ttRect);
    ttGroup.appendChild(ttTexto1);
    ttGroup.appendChild(ttTexto2);
    svg.appendChild(ttGroup);

    /* Overlay transparente para capturar mouse/touch */
    const overlay = svgEl('rect', { fill: 'transparent' });
    svg.appendChild(overlay);

    container.appendChild(svg);

    /* Salva referências globais */
    grafico.svg        = svg;
    grafico.polyline   = polyline;
    grafico.polygon    = polygon;
    grafico.eixoV      = eixoV;
    grafico.eixoH      = eixoH;
    grafico.marcadorH  = marcadorH;
    grafico.marcadorV  = marcadorV;
    grafico.marcadorPt = marcadorPt;
    grafico.tooltipEst = tooltipEst;
    grafico.labelMarcY = labelMarcY;
    grafico.ttGroup    = ttGroup;
    grafico.ttLinha    = ttLinha;
    grafico.ttBola     = ttBola;
    grafico.ttRect     = ttRect;
    grafico.ttTexto1   = ttTexto1;
    grafico.ttTexto2   = ttTexto2;
    grafico.overlay    = overlay;
    grafico.labelsX    = labelsX;
    grafico.labelEixoX = labelEixoX;

    /* Eventos: registrados uma única vez */
    function clientParaSVG(clientX) {
        const ctm = svg.getScreenCTM();
        return (clientX - ctm.e) / ctm.a;
    }

    overlay.addEventListener('mousemove',  e => mostrarTooltipSVG(clientParaSVG(e.clientX)));
    overlay.addEventListener('mouseleave', () => ttGroup.classList.add('svg-tooltip-oculto'));
    overlay.addEventListener('touchmove',  e => {
        e.preventDefault();
        mostrarTooltipSVG(clientParaSVG(e.touches[0].clientX));
    }, { passive: false });
    overlay.addEventListener('touchend', () => ttGroup.classList.add('svg-tooltip-oculto'));
}

/* Dimensões atuais do plot — atualizadas por atualizarSVG */
let _PAD, _plotW, _plotH, _W, _H;

function xEsc(i)     { return _PAD.left + (i / (TOTAL_FIGURINHAS - 1)) * _plotW; }
function yEsc(custo) { return _PAD.top  + _plotH - (custo / curvaGlobal[0]) * _plotH; }
function custoGasto(i) { return curvaGlobal[0] - curvaGlobal[i]; }

function xParaIndice(svgX) {
    const i = Math.round((svgX - _PAD.left) / _plotW * (TOTAL_FIGURINHAS - 1));
    return Math.max(0, Math.min(TOTAL_FIGURINHAS - 1, i));
}

/**
 * Atualiza apenas os atributos do SVG existente — sem recriar nós.
 * Chamada a cada cálculo e a cada resize.
 */
function atualizarSVG(jatem) {
    if (!curvaGlobal) return;

    const container = document.getElementById('graficoCurva');
    if (!container) return;

    /* Cria estrutura na primeira vez */
    if (!grafico.svg) criarEstruturaSVG(container);

    const W = container.clientWidth  || 660;
    const H = container.clientHeight || 320;
    const PAD = { top: 16, right: 24, bottom: 48, left: 72 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top  - PAD.bottom;

    _PAD = PAD; _plotW = plotW; _plotH = plotH; _W = W; _H = H;

    const maxCusto = curvaGlobal[0];

    /* viewBox */
    grafico.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    /* Grade horizontal */
    for (let t = 0; t <= 4; t++) {
        const custo = (maxCusto / 4) * t;
        const y     = yEsc(custo).toFixed(1);
        const label = 'R$ ' + custo.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        const linha = grafico.gridLines[t];
        linha.setAttribute('x1', PAD.left);
        linha.setAttribute('y1', y);
        linha.setAttribute('x2', PAD.left + plotW);
        linha.setAttribute('y2', y);

        const lbl = grafico.gridLabels[t];
        lbl.setAttribute('x', PAD.left - 8);
        lbl.setAttribute('y', y);
        lbl.textContent = label;
    }

    /* Pontos da curva (a cada 2 figurinhas + último) */
    const pts = [];
    for (let i = 0; i < TOTAL_FIGURINHAS; i += 2) {
        pts.push(`${xEsc(i).toFixed(1)},${yEsc(custoGasto(i)).toFixed(1)}`);
    }
    pts.push(`${xEsc(979).toFixed(1)},${yEsc(custoGasto(979)).toFixed(1)}`);
    const ptsStr = pts.join(' ');

    grafico.polyline.setAttribute('points', ptsStr);
    grafico.polygon.setAttribute('points',
        `${PAD.left},${(PAD.top + plotH).toFixed(1)} ${ptsStr} ${xEsc(979).toFixed(1)},${(PAD.top + plotH).toFixed(1)}`
    );

    /* Eixos */
    grafico.eixoV.setAttribute('x1', PAD.left);
    grafico.eixoV.setAttribute('y1', PAD.top);
    grafico.eixoV.setAttribute('x2', PAD.left);
    grafico.eixoV.setAttribute('y2', PAD.top + plotH);

    grafico.eixoH.setAttribute('x1', PAD.left);
    grafico.eixoH.setAttribute('y1', PAD.top + plotH);
    grafico.eixoH.setAttribute('x2', PAD.left + plotW);
    grafico.eixoH.setAttribute('y2', PAD.top + plotH);

    /* Labels eixo X */
    const LABELS_X_FALTANDO = [980, 800, 600, 400, 200, 1];
    for (let idx = 0; idx < grafico.labelsX.length; idx++) {
        const { el, faltando } = grafico.labelsX[idx];
        const i = TOTAL_FIGURINHAS - faltando;
        el.setAttribute('x', xEsc(i).toFixed(1));
        el.setAttribute('y', (PAD.top + plotH + 18).toFixed(1));
        el.textContent = faltando === 1 ? '980' : String(i);
    }

    /* Label título eixo X */
    grafico.labelEixoX.setAttribute('x', (PAD.left + plotW / 2).toFixed(1));
    grafico.labelEixoX.setAttribute('y', (H - 6).toFixed(1));

    /* Marcador da posição atual */
    const marcadorX  = xEsc(jatem);
    const marcadorY  = yEsc(custoGasto(jatem));
    const gastoAtual = custoGasto(jatem);
    const labelGasto = 'R$ ' + gastoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    grafico.marcadorH.setAttribute('x1', PAD.left);
    grafico.marcadorH.setAttribute('y1', marcadorY.toFixed(1));
    grafico.marcadorH.setAttribute('x2', marcadorX.toFixed(1));
    grafico.marcadorH.setAttribute('y2', marcadorY.toFixed(1));

    grafico.labelMarcY.setAttribute('x', (PAD.left - 8).toFixed(1));
    grafico.labelMarcY.setAttribute('y', marcadorY.toFixed(1));
    grafico.labelMarcY.textContent = labelGasto;

    grafico.marcadorV.setAttribute('x1', marcadorX.toFixed(1));
    grafico.marcadorV.setAttribute('y1', PAD.top);
    grafico.marcadorV.setAttribute('x2', marcadorX.toFixed(1));
    grafico.marcadorV.setAttribute('y2', (PAD.top + plotH).toFixed(1));

    grafico.marcadorPt.setAttribute('cx', marcadorX.toFixed(1));
    grafico.marcadorPt.setAttribute('cy', marcadorY.toFixed(1));

    const tooltipAnchor = jatem > 800 ? 'end' : 'start';
    const tooltipX      = jatem > 800 ? marcadorX - 8 : marcadorX + 8;
    grafico.tooltipEst.setAttribute('x', tooltipX.toFixed(1));
    grafico.tooltipEst.setAttribute('y', (marcadorY - 10).toFixed(1));
    grafico.tooltipEst.setAttribute('text-anchor', tooltipAnchor);
    grafico.tooltipEst.textContent = `${jatem} fig. → ${labelGasto}`;

    /* Overlay (área interativa) */
    grafico.overlay.setAttribute('x', PAD.left);
    grafico.overlay.setAttribute('y', PAD.top);
    grafico.overlay.setAttribute('width', plotW);
    grafico.overlay.setAttribute('height', plotH);

    /* Linhas y do tooltip precisam de top/bottom atualizados */
    grafico.ttLinha.setAttribute('y1', PAD.top);
    grafico.ttLinha.setAttribute('y2', PAD.top + plotH);
}

/**
 * Move o tooltip interativo para a posição svgX.
 * Usa as dimensões salvas em _PAD/_plotW/_plotH.
 */
function mostrarTooltipSVG(svgX) {
    if (!_PAD || svgX < _PAD.left || svgX > _PAD.left + _plotW) {
        grafico.ttGroup.classList.add('svg-tooltip-oculto');
        return;
    }

    const i        = xParaIndice(svgX);
    const cx       = xEsc(i);
    const gasto    = custoGasto(i);
    const cy       = yEsc(gasto);
    const faltando = TOTAL_FIGURINHAS - i;

    grafico.ttLinha.setAttribute('x1', cx.toFixed(1));
    grafico.ttLinha.setAttribute('x2', cx.toFixed(1));
    grafico.ttBola.setAttribute('cx', cx.toFixed(1));
    grafico.ttBola.setAttribute('cy', cy.toFixed(1));

    const labelFig   = `${i} coladas · ${faltando} faltando`;
    const labelCusto = 'R$ ' + gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    grafico.ttTexto1.textContent = labelFig;
    grafico.ttTexto2.textContent = labelCusto;

    const cardW = Math.max(labelFig.length, labelCusto.length) * 7.2 + 20;
    const cardH = 42;
    const cardY = Math.max(_PAD.top, cy - cardH - 12);
    const cardX = i > TOTAL_FIGURINHAS * 0.72 ? cx - cardW - 8 : cx + 8;

    grafico.ttRect.setAttribute('x', cardX.toFixed(1));
    grafico.ttRect.setAttribute('y', cardY.toFixed(1));
    grafico.ttRect.setAttribute('width', cardW.toFixed(1));
    grafico.ttRect.setAttribute('height', cardH.toFixed(1));

    grafico.ttTexto1.setAttribute('x', (cardX + 10).toFixed(1));
    grafico.ttTexto1.setAttribute('y', (cardY + 15).toFixed(1));
    grafico.ttTexto2.setAttribute('x', (cardX + 10).toFixed(1));
    grafico.ttTexto2.setAttribute('y', (cardY + 32).toFixed(1));

    grafico.ttGroup.classList.remove('svg-tooltip-oculto');
}

/* ════════════════════════════════════════
   FORMATAÇÃO
   ════════════════════════════════════════ */
const fmt  = (n, c = 2) => n.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const fmtI = n => n.toLocaleString('pt-BR');
const fmtR = n => 'R$ ' + fmt(n);

/* ════════════════════════════════════════
   VALIDAÇÃO
   ════════════════════════════════════════ */
function validar(jatem, repetidas, preco) {
    if (!Number.isInteger(jatem) || jatem < 0)
        return 'Informe quantas figurinhas únicas você já tem (pode ser 0).';
    if (jatem >= TOTAL_FIGURINHAS)
        return 'Você já completou o álbum!';
    if (!Number.isInteger(repetidas) || repetidas < 0)
        return 'A quantidade de repetidas deve ser um inteiro positivo (ou deixe em branco).';
    if (isNaN(preco) || preco <= 0)
        return 'O preço do pacote deve ser um valor positivo.';
    return null;
}

/* ════════════════════════════════════════
   ANIMAÇÃO DOS RESULTADOS
   ════════════════════════════════════════ */
function animar(el, texto) {
    el.classList.remove('animando');
    void el.offsetWidth;
    el.textContent = texto;
    el.classList.remove('vazio');
    el.classList.add('animando');
}

/* ════════════════════════════════════════
   UTILITÁRIO
   ════════════════════════════════════════ */

/**
 * Retorna uma função que atrasa a execução de fn por `ms` ms.
 * Chamadas repetidas reiniciam o timer — ideal para resize.
 */
function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/* ════════════════════════════════════════
   WASM
   ════════════════════════════════════════ */
let moduloWasm = null;
let calculouPeloUsuario = false;

/* Último preço usado para gerar a curva */
let precoUltimaCurva = null;

/* ════════════════════════════════════════
   INICIALIZAÇÃO — tudo dentro de DOMContentLoaded
   Garante que o DOM está completo antes de qualquer
   acesso a getElementById, mesmo com SW cache-first.
   ════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

    /* ── Referências ao DOM ── */
    const inJaTem     = document.getElementById('inputJaTem');
    const inRepetidas = document.getElementById('inputRepetidas');
    const inPreco     = document.getElementById('inputPreco');
    const btnCalc     = document.getElementById('btnCalcular');
    const elFig       = document.getElementById('resFigurinhas');
    const elPac       = document.getElementById('resPacotes');
    const elVal       = document.getElementById('resValor');

    /* Valores padrão */
    inJaTem.value = 0;
    inPreco.value = '7,00';

    /* Lê preço aceitando vírgula ou ponto */
    function lerPreco() {
        return parseFloat(inPreco.value.replace(',', '.'));
    }

    /* ── Botões de navegação ── */
    SECOES.forEach(id => {
        const btn = document.getElementById('nav-' + id);
        if (btn) btn.addEventListener('click', () => trocarSecao(id));
    });

    /* ── Logo — impede navegação para "#" ── */
    const logo = document.querySelector('a.logo');
    if (logo) logo.addEventListener('click', e => e.preventDefault());

    /* ── Flag de clique do usuário (para scroll mobile) ── */
    btnCalc.addEventListener('pointerdown', () => {
        if (moduloWasm) calculouPeloUsuario = true;
    });

    /* ── Evento principal: Calcular ── */
    btnCalc.addEventListener('click', () => {
        if (!moduloWasm) return;

        const jatem     = parseInt(inJaTem.value, 10);
        const repetidas = inRepetidas.value.trim() === '' ? 0 : parseInt(inRepetidas.value, 10);
        const preco     = lerPreco();

        const erro = validar(jatem, repetidas, preco);
        if (erro) { alert(erro); return; }

        const r = calcular(jatem, repetidas, preco);
        animar(elFig, fmt(r.figurinhas));
        animar(elPac, fmtI(r.pacotes));
        animar(elVal, fmtR(r.valor));

        const elResultados = document.getElementById('secao-resultados');
        if (elResultados && calculouPeloUsuario && window.innerWidth < 960) {
            setTimeout(() => {
                elResultados.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 80);
        }

        if (preco !== precoUltimaCurva) {
            gerarCurvaWasm(preco);
            precoUltimaCurva = preco;
        }

        atualizarSVG(jatem);
    });

    /* ── Enter em qualquer input dispara o cálculo ── */
    [inJaTem, inRepetidas, inPreco].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') btnCalc.click(); })
    );

    /* ── Redimensionamento — debounced 150ms ── */
    window.addEventListener('resize', debounce(() => {
        const jatem = parseInt(inJaTem.value, 10) || 0;
        atualizarSVG(jatem);
    }, 150));

    /* ── Carrega o módulo WASM e dispara cálculo inicial ── */
    CarregarCalculadora().then(modulo => {
        moduloWasm = modulo;

        const precoInicial = lerPreco();
        gerarCurvaWasm(precoInicial);
        precoUltimaCurva = precoInicial;

        // Dispara o cálculo inicial sem marcar como clique do usuário
        btnCalc.click();
    });

}); // fim DOMContentLoaded