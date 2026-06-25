/**
 * script.js — Calculadora de Figurinhas
 * Eduardo Mota | Estácio 2026
 *
 * Navegação por View Transition API (com fallback CSS),
 * algoritmo do Colecionador de Cupons delegado ao WebAssembly.
 * Sprint 6: gráfico de custo acumulado renderizado em SVG puro.
 */

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
 * A API captura snapshots dos elementos com view-transition-name
 * antes e depois da mudança de classe, animando entre eles.
 *
 * IMPORTANTE: as seções nunca usam display:none — ficam com
 * opacity:0 + visibility:hidden + position:absolute para que
 * o browser consiga capturar o snapshot da seção saindo.
 *
 * @param {string} novoId - ID da seção de destino
 */
function trocarSecao(novoId) {
    if (novoId === secaoAtual) return;

    const elAtual = document.getElementById(secaoAtual);
    const elProx  = document.getElementById(novoId);
    if (!elAtual || !elProx) return;

    /* Atualiza navbar antes da transição */
    atualizarNavbar(novoId);

    const aplicarMudanca = () => {
        elAtual.classList.remove('ativa');
        elProx.classList.add('ativa');
        secaoAtual = novoId;
    };

    if (document.startViewTransition) {
        /*
         * startViewTransition():
         * 1. Captura snapshot do estado atual (secao.ativa = antiga)
         * 2. Executa o callback (muda as classes)
         * 3. Captura snapshot do novo estado
         * 4. Anima entre os dois snapshots via CSS pseudo-elementos
         *    ::view-transition-old(secao) e ::view-transition-new(secao)
         */
        document.startViewTransition(aplicarMudanca);
    } else {
        /* Fallback: sem animação de transição, só muda classe */
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
 * Ponto de entrada do cálculo.
 *
 * Delega o algoritmo ao módulo WebAssembly (CalculadoraAlbum em C++).
 *
 * A fórmula correta é:  E = TOTAL × H(faltamEfetivas)
 * onde H(n) = 1 + 1/2 + ... + 1/n.
 *
 * O C++ recebe o total do álbum e quantas faltam SEPARADAMENTE,
 * pois o universo de probabilidade é sempre 980 — não o número de
 * faltando. Passar apenas "faltando" como se fosse o universo gerava
 * resultado errado (ex: falta 1 → retornava 1 figurinha em vez de 980).
 *
 * @param {number} jatem     - Figurinhas únicas já coladas
 * @param {number} repetidas - Figurinhas repetidas disponíveis para troca
 * @param {number} preco     - Preço de cada pacote em R$
 * @returns {{ faltam:number, figurinhas:number, pacotes:number, valor:number }}
 */
function calcular(jatem, repetidas, preco) {
    const faltam   = TOTAL_FIGURINHAS - jatem;
    const efetivas = Math.max(0, faltam - repetidas);

    if (efetivas === 0) {
        return { faltam, figurinhas: 0, pacotes: 0, valor: 0 };
    }

    // Construtor C++: CalculadoraAlbum(totalFigurinhas, quantidadeFaltando, figurinhasPorPacote, precoPacote)
    const calculadora = new moduloWasm.CalculadoraAlbum(TOTAL_FIGURINHAS, efetivas, FIGURINHAS_PACOTE, preco);
    const resultado   = calculadora.calcular();

    const figurinhas = resultado.figurinhasEsperadas;
    const pacotes    = resultado.pacotesEsperados;
    const valor      = resultado.valorEsperado;

    calculadora.delete(); // libera memória do objeto C++

    return { faltam, figurinhas, pacotes, valor };
}

/* ════════════════════════════════════════
   GRÁFICO — Curva de custo acumulado (SVG)
   ════════════════════════════════════════ */

/**
 * Pontos da curva gerados pelo C++.
 * curvaGlobal[i] = custo esperado (R$) quando há i figurinhas coladas.
 * Preenchido uma vez quando o WASM carrega; atualizado se o preço mudar.
 */
let curvaGlobal = null;

/**
 * Gera os 980 pontos de custo esperado via WASM e armazena em curvaGlobal.
 * Chamado ao carregar o WASM e novamente se o preço for alterado.
 *
 * @param {number} preco - Preço do pacote em R$
 */
function gerarCurvaWasm(preco) {
    // Usamos quantidadeFaltando=1 apenas para satisfazer o construtor;
    // gerarCurva() percorre todos os estados internamente.
    const calc = new moduloWasm.CalculadoraAlbum(TOTAL_FIGURINHAS, 1, FIGURINHAS_PACOTE, preco);
    const vec  = calc.gerarCurva();

    // Copia o VectorDouble (objeto C++) para um Array JS nativo
    curvaGlobal = [];
    for (let i = 0; i < vec.size(); i++) {
        curvaGlobal.push(vec.get(i));
    }

    vec.delete();
    calc.delete();
}

/**
 * Renderiza o gráfico SVG dentro de #graficoCurva.
 *
 * @param {number} jatem  - Figurinhas já coladas (posição do marcador)
 * @param {number} preco  - Preço do pacote em R$ (para regenerar curva se mudou)
 */
function renderizarGrafico(jatem, preco) {
    if (!curvaGlobal) return;

    const container = document.getElementById('graficoCurva');
    if (!container) return;

    /* ── Dimensões ── */
    const W = container.clientWidth  || 660;
    const H = container.clientHeight || 320;
    const PAD = { top: 16, right: 24, bottom: 48, left: 72 };
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top  - PAD.bottom;

    /* ── Escala ── */
    const maxCusto = curvaGlobal[0]; // ponto mais caro = álbum vazio
    // Eixo X: figurinhas coladas (0 → 979), leitura natural esquerda→direita.
    // Eixo Y: custo JÁ GASTO esperado = maxCusto - custo_restante[i]
    // Quanto mais figurinhas coladas, mais dinheiro foi gasto → curva sobe.
    const custoGasto = i => maxCusto - curvaGlobal[i];
    const xEsc = i     => PAD.left + (i / (TOTAL_FIGURINHAS - 1)) * plotW;
    const yEsc = custo => PAD.top  + plotH - (custo / maxCusto) * plotH;

    /* ── Polyline path ── */
    const pts = [];
    for (let i = 0; i < TOTAL_FIGURINHAS; i += 2) {
        pts.push(`${xEsc(i).toFixed(1)},${yEsc(custoGasto(i)).toFixed(1)}`);
    }
    pts.push(`${xEsc(979).toFixed(1)},${yEsc(custoGasto(979)).toFixed(1)}`);

    /* ── Linhas de grade horizontais (5 níveis) ── */
    const grades = [];
    for (let t = 0; t <= 4; t++) {
        const custo = (maxCusto / 4) * t;
        const y     = yEsc(custo).toFixed(1);
        const label = 'R$ ' + custo.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        grades.push(`
            <line x1="${PAD.left}" y1="${y}" x2="${PAD.left + plotW}" y2="${y}"
                  stroke="var(--cor-grade)" stroke-width="1" stroke-dasharray="4 4"/>
            <text x="${PAD.left - 8}" y="${y}" text-anchor="end" dominant-baseline="middle"
                  class="grafico-label">${label}</text>`);
    }

    /* ── Labels do eixo X: figurinhas coladas (0 → 980) ── */
    const labelsXFaltando = [980, 800, 600, 400, 200, 1];
    const eixoX = labelsXFaltando.map(faltando => {
        const i = TOTAL_FIGURINHAS - faltando;
        const x = xEsc(i).toFixed(1);
        const y = (PAD.top + plotH + 18).toFixed(1);
        const txt = faltando === 1 ? '980' : TOTAL_FIGURINHAS - faltando;
        return `<text x="${x}" y="${y}" text-anchor="middle" class="grafico-label">${txt}</text>`;
    }).join('');

    /* ── Marcador do ponto atual ── */
    const marcadorX     = xEsc(jatem);
    const marcadorY     = yEsc(custoGasto(jatem));
    const custoAtual    = curvaGlobal[jatem];
    const gastoAtual    = custoGasto(jatem);
    const faltandoAtual = TOTAL_FIGURINHAS - jatem;
    const labelGasto    = 'R$ ' + gastoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const tooltipX      = jatem > 800 ? marcadorX - 8 : marcadorX + 8;
    const tooltipAnchor = jatem > 800 ? 'end' : 'start';

    const marcador = `
        <line x1="${marcadorX.toFixed(1)}" y1="${PAD.top}" x2="${marcadorX.toFixed(1)}" y2="${(PAD.top + plotH).toFixed(1)}"
              stroke="var(--cor-marcador)" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.7"/>
        <circle cx="${marcadorX.toFixed(1)}" cy="${marcadorY.toFixed(1)}" r="5"
                fill="var(--cor-marcador)" stroke="var(--cor-fundo-card)" stroke-width="2"/>
        <text x="${tooltipX.toFixed(1)}" y="${(marcadorY - 10).toFixed(1)}"
              text-anchor="${tooltipAnchor}" class="grafico-label grafico-label-marcador">${jatem} fig. → ${labelGasto}</text>`;

    /* ── Monta SVG ── */
    container.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"
             aria-label="Curva de custo esperado por figurinhas coladas"
             style="width:100%;height:100%;overflow:visible;">

            <!-- Grade horizontal -->
            ${grades.join('')}

            <!-- Área preenchida sob a curva -->
            <polygon
                points="${PAD.left},${(PAD.top + plotH).toFixed(1)} ${pts.join(' ')} ${xEsc(979).toFixed(1)},${(PAD.top + plotH).toFixed(1)}"
                fill="url(#gradCurva)" opacity="0.25"/>

            <!-- Definição do gradiente -->
            <defs>
                <linearGradient id="gradCurva" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stop-color="var(--cor-curva)" stop-opacity="0.8"/>
                    <stop offset="100%" stop-color="var(--cor-curva)" stop-opacity="0.0"/>
                </linearGradient>
            </defs>

            <!-- Curva principal -->
            <polyline points="${pts.join(' ')}"
                      fill="none" stroke="var(--cor-curva)" stroke-width="2.5"
                      stroke-linejoin="round" stroke-linecap="round"/>

            <!-- Eixos -->
            <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + plotH}"
                  stroke="var(--cor-eixo)" stroke-width="1.5"/>
            <line x1="${PAD.left}" y1="${PAD.top + plotH}" x2="${PAD.left + plotW}" y2="${PAD.top + plotH}"
                  stroke="var(--cor-eixo)" stroke-width="1.5"/>

            <!-- Labels eixo X -->
            ${eixoX}

            <!-- Título eixo X -->
            <text x="${(PAD.left + plotW / 2).toFixed(1)}" y="${(H - 6).toFixed(1)}"
                  text-anchor="middle" class="grafico-label grafico-label-eixo">
                Figurinhas já coladas
            </text>

            <!-- Marcador do ponto atual -->
            ${marcador}

        </svg>`;
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
    void el.offsetWidth; /* força reflow para reiniciar a animação CSS */
    el.textContent = texto;
    el.classList.remove('vazio');
    el.classList.add('animando');
}

/* ════════════════════════════════════════
   DOM — referências
   ════════════════════════════════════════ */
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

/* Último preço usado para gerar a curva — detecta mudança */
let precoUltimaCurva = null;

/* ════════════════════════════════════════
   WASM — carregamento do módulo
   ════════════════════════════════════════ */
let moduloWasm = null;

CriadorCalculadora().then(modulo => {
    moduloWasm = modulo;

    // Gera a curva inicial com o preço padrão
    const precoInicial = lerPreco();
    gerarCurvaWasm(precoInicial);
    precoUltimaCurva = precoInicial;

    btnCalc.click(); // dispara o cálculo inicial com os valores padrão
});

/* ════════════════════════════════════════
   EVENTO PRINCIPAL — Calcular
   ════════════════════════════════════════ */
btnCalc.addEventListener('click', () => {
    if (!moduloWasm) return; // WASM ainda carregando

    const jatem     = parseInt(inJaTem.value, 10);
    const repetidas = inRepetidas.value.trim() === '' ? 0 : parseInt(inRepetidas.value, 10);
    const preco     = lerPreco();

    const erro = validar(jatem, repetidas, preco);
    if (erro) { alert(erro); return; }

    const r = calcular(jatem, repetidas, preco);
    animar(elFig, fmt(r.figurinhas));
    animar(elPac, fmtI(r.pacotes));
    animar(elVal, fmtR(r.valor));

    // Regenera curva somente se o preço mudou (evita 980 cálculos desnecessários)
    if (preco !== precoUltimaCurva) {
        gerarCurvaWasm(preco);
        precoUltimaCurva = preco;
    }

    // Atualiza gráfico com a posição atual do usuário
    renderizarGrafico(jatem, preco);
});

/* Enter em qualquer input dispara o cálculo */
[inJaTem, inRepetidas, inPreco].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') btnCalc.click(); })
);

/* Atualiza o gráfico ao redimensionar a janela */
window.addEventListener('resize', () => {
    const jatem = parseInt(inJaTem.value, 10) || 0;
    renderizarGrafico(jatem, lerPreco());
});

/* Cálculo automático ao carregar com os valores padrão */
window.addEventListener('DOMContentLoaded', () => {
    // O cálculo inicial é disparado pelo .then() do CriadorCalculadora acima,
    // garantindo que o WASM já esteja pronto quando o botão for clicado.
});