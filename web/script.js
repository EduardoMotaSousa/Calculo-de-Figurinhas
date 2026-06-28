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

function renderizarGrafico(jatem, preco) {
    if (!curvaGlobal) return;

    const container = document.getElementById('graficoCurva');
    if (!container) return;

    const W = container.clientWidth  || 660;
    const H = container.clientHeight || 320;
    const PAD = { top: 16, right: 24, bottom: 48, left: 72 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top  - PAD.bottom;

    const maxCusto  = curvaGlobal[0];
    const custoGasto = i => maxCusto - curvaGlobal[i];
    const xEsc = i     => PAD.left + (i / (TOTAL_FIGURINHAS - 1)) * plotW;
    const yEsc = custo => PAD.top  + plotH - (custo / maxCusto) * plotH;

    const pts = [];
    for (let i = 0; i < TOTAL_FIGURINHAS; i += 2) {
        pts.push(`${xEsc(i).toFixed(1)},${yEsc(custoGasto(i)).toFixed(1)}`);
    }
    pts.push(`${xEsc(979).toFixed(1)},${yEsc(custoGasto(979)).toFixed(1)}`);

    const marcadorX     = xEsc(jatem);
    const marcadorY     = yEsc(custoGasto(jatem));
    const gastoAtual    = custoGasto(jatem);
    const labelGasto    = 'R$ ' + gastoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const tooltipAnchor = jatem > 800 ? 'end' : 'start';
    const tooltipX      = jatem > 800 ? marcadorX - 8 : marcadorX + 8;

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function svgEl(tag, attrs = {}) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
        return el;
    }

    container.textContent = '';
    const svg = svgEl('svg', {
        id: 'grafico-svg',
        viewBox: `0 0 ${W} ${H}`,
        xmlns: SVG_NS,
        'aria-label': 'Curva de custo esperado por figurinhas coladas',
    });
    container.appendChild(svg);

    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: 'gradCurva', x1: '0', y1: '0', x2: '0', y2: '1' });
    const stop0 = svgEl('stop', { offset: '0%',   'stop-color': 'var(--cor-curva)', 'stop-opacity': '0.8' });
    const stop1 = svgEl('stop', { offset: '100%', 'stop-color': 'var(--cor-curva)', 'stop-opacity': '0.0' });
    grad.appendChild(stop0);
    grad.appendChild(stop1);
    defs.appendChild(grad);
    svg.appendChild(defs);

    for (let t = 0; t <= 4; t++) {
        const custo = (maxCusto / 4) * t;
        const y     = yEsc(custo).toFixed(1);
        const label = 'R$ ' + custo.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        svg.appendChild(svgEl('line', {
            x1: PAD.left, y1: y, x2: PAD.left + plotW, y2: y,
            stroke: 'var(--cor-grade)', 'stroke-width': '1', 'stroke-dasharray': '4 4',
        }));
        const txt = svgEl('text', {
            x: PAD.left - 8, y, 'text-anchor': 'end', 'dominant-baseline': 'middle',
            class: 'grafico-label',
        });
        txt.textContent = label;
        svg.appendChild(txt);
    }

    svg.appendChild(svgEl('polygon', {
        points: `${PAD.left},${(PAD.top + plotH).toFixed(1)} ${pts.join(' ')} ${xEsc(979).toFixed(1)},${(PAD.top + plotH).toFixed(1)}`,
        fill: 'url(#gradCurva)', opacity: '0.25',
    }));

    svg.appendChild(svgEl('polyline', {
        points: pts.join(' '),
        fill: 'none', stroke: 'var(--cor-curva)', 'stroke-width': '2.5',
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));

    svg.appendChild(svgEl('line', {
        x1: PAD.left, y1: PAD.top, x2: PAD.left, y2: PAD.top + plotH,
        stroke: 'var(--cor-eixo)', 'stroke-width': '1.5',
    }));
    svg.appendChild(svgEl('line', {
        x1: PAD.left, y1: PAD.top + plotH, x2: PAD.left + plotW, y2: PAD.top + plotH,
        stroke: 'var(--cor-eixo)', 'stroke-width': '1.5',
    }));

    const labelsXFaltando = [980, 800, 600, 400, 200, 1];
    for (const faltando of labelsXFaltando) {
        const i   = TOTAL_FIGURINHAS - faltando;
        const txt = svgEl('text', {
            x: xEsc(i).toFixed(1),
            y: (PAD.top + plotH + 18).toFixed(1),
            'text-anchor': 'middle',
            class: 'grafico-label',
        });
        txt.textContent = faltando === 1 ? '980' : String(TOTAL_FIGURINHAS - i);
        svg.appendChild(txt);
    }

    const labelEixoX = svgEl('text', {
        x: (PAD.left + plotW / 2).toFixed(1),
        y: (H - 6).toFixed(1),
        'text-anchor': 'middle',
        class: 'grafico-label grafico-label-eixo',
    });
    labelEixoX.textContent = 'Figurinhas já coladas';
    svg.appendChild(labelEixoX);

    svg.appendChild(svgEl('line', {
        x1: PAD.left,              y1: marcadorY.toFixed(1),
        x2: marcadorX.toFixed(1), y2: marcadorY.toFixed(1),
        stroke: 'var(--cor-marcador)', 'stroke-width': '1',
        'stroke-dasharray': '4 3', opacity: '0.5',
    }));

    const labelMarcador = svgEl('text', {
        x: (PAD.left - 8).toFixed(1), y: marcadorY.toFixed(1),
        'text-anchor': 'end', 'dominant-baseline': 'middle',
        class: 'grafico-label grafico-label-marcador',
    });
    labelMarcador.textContent = labelGasto;
    svg.appendChild(labelMarcador);

    svg.appendChild(svgEl('line', {
        x1: marcadorX.toFixed(1), y1: PAD.top,
        x2: marcadorX.toFixed(1), y2: (PAD.top + plotH).toFixed(1),
        stroke: 'var(--cor-marcador)', 'stroke-width': '1.5',
        'stroke-dasharray': '5 3', opacity: '0.7',
    }));

    svg.appendChild(svgEl('circle', {
        cx: marcadorX.toFixed(1), cy: marcadorY.toFixed(1), r: '5',
        fill: 'var(--cor-marcador)', stroke: 'var(--cor-fundo-card)', 'stroke-width': '2',
    }));

    const tooltipEstatico = svgEl('text', {
        x: tooltipX.toFixed(1), y: (marcadorY - 10).toFixed(1),
        'text-anchor': tooltipAnchor,
        class: 'grafico-label grafico-label-marcador',
    });
    tooltipEstatico.textContent = `${jatem} fig. → ${labelGasto}`;
    svg.appendChild(tooltipEstatico);

    const ttGroup = svgEl('g', { id: 'svg-tooltip', class: 'svg-tooltip-oculto', 'pointer-events': 'none' });

    const ttLinha  = svgEl('line',   { id: 'tt-linha',   stroke: 'var(--cor-tooltip-linha)', 'stroke-width': '1', 'stroke-dasharray': '3 3', opacity: '0.6', y1: PAD.top, y2: PAD.top + plotH });
    const ttBola   = svgEl('circle', { id: 'tt-bolinha', r: '4', fill: 'var(--cor-curva)', stroke: 'var(--cor-fundo-card)', 'stroke-width': '2' });
    const ttRect   = svgEl('rect',   { id: 'tt-rect',   rx: '5', ry: '5', fill: 'var(--cor-tooltip-bg)', stroke: 'var(--cor-tooltip-borda)', 'stroke-width': '1', opacity: '0.92' });
    const ttTexto1 = svgEl('text',   { id: 'tt-linha1', class: 'grafico-label tt-texto' });
    const ttTexto2 = svgEl('text',   { id: 'tt-linha2', class: 'grafico-label tt-texto tt-destaque' });

    ttGroup.appendChild(ttLinha);
    ttGroup.appendChild(ttBola);
    ttGroup.appendChild(ttRect);
    ttGroup.appendChild(ttTexto1);
    ttGroup.appendChild(ttTexto2);
    svg.appendChild(ttGroup);

    const overlay = svgEl('rect', {
        id: 'grafico-overlay',
        x: PAD.left, y: PAD.top,
        width: plotW, height: plotH,
        fill: 'transparent',
    });
    svg.appendChild(overlay);

    function clientParaSVG(clientX, clientY) {
        const ctm = svg.getScreenCTM();
        return {
            x: (clientX - ctm.e) / ctm.a,
            y: (clientY - ctm.f) / ctm.d,
        };
    }

    function xParaIndice(svgX) {
        const i = Math.round((svgX - PAD.left) / plotW * (TOTAL_FIGURINHAS - 1));
        return Math.max(0, Math.min(TOTAL_FIGURINHAS - 1, i));
    }

    function mostrarTooltip(clientX, clientY) {
        const { x: svgX } = clientParaSVG(clientX, clientY);
        if (svgX < PAD.left || svgX > PAD.left + plotW) {
            ttGroup.classList.add('svg-tooltip-oculto');
            return;
        }

        const i        = xParaIndice(svgX);
        const cx       = xEsc(i);
        const gasto    = custoGasto(i);
        const cy       = yEsc(gasto);
        const faltando = TOTAL_FIGURINHAS - i;

        ttLinha.setAttribute('x1', cx.toFixed(1));
        ttLinha.setAttribute('x2', cx.toFixed(1));
        ttBola.setAttribute('cx', cx.toFixed(1));
        ttBola.setAttribute('cy', cy.toFixed(1));

        const labelFig   = `${i} coladas · ${faltando} faltando`;
        const labelCusto = 'R$ ' + gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        ttTexto1.textContent = labelFig;
        ttTexto2.textContent = labelCusto;

        const cardW  = Math.max(ttTexto1.textContent.length, ttTexto2.textContent.length) * 7.2 + 20;
        const cardH  = 42;
        const cardY  = Math.max(PAD.top, cy - cardH - 12);
        const cardX  = i > TOTAL_FIGURINHAS * 0.72 ? cx - cardW - 8 : cx + 8;

        ttRect.setAttribute('x', cardX.toFixed(1));
        ttRect.setAttribute('y', cardY.toFixed(1));
        ttRect.setAttribute('width', cardW.toFixed(1));
        ttRect.setAttribute('height', cardH.toFixed(1));

        ttTexto1.setAttribute('x', (cardX + 10).toFixed(1));
        ttTexto1.setAttribute('y', (cardY + 15).toFixed(1));
        ttTexto2.setAttribute('x', (cardX + 10).toFixed(1));
        ttTexto2.setAttribute('y', (cardY + 32).toFixed(1));

        ttGroup.classList.remove('svg-tooltip-oculto');
    }

    overlay.addEventListener('mousemove', e => mostrarTooltip(e.clientX, e.clientY));
    overlay.addEventListener('mouseleave', () => { ttGroup.classList.add('svg-tooltip-oculto'); });
    overlay.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0];
        mostrarTooltip(t.clientX, t.clientY);
    }, { passive: false });
    overlay.addEventListener('touchend', () => { ttGroup.classList.add('svg-tooltip-oculto'); });
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

        renderizarGrafico(jatem, preco);
    });

    /* ── Enter em qualquer input dispara o cálculo ── */
    [inJaTem, inRepetidas, inPreco].forEach(el =>
        el.addEventListener('keydown', e => { if (e.key === 'Enter') btnCalc.click(); })
    );

    /* ── Redimensionamento ── */
    window.addEventListener('resize', () => {
        const jatem = parseInt(inJaTem.value, 10) || 0;
        renderizarGrafico(jatem, lerPreco());
    });

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