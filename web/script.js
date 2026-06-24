/**
 * script.js — Calculadora de Figurinhas
 * Eduardo Mota | Estácio 2026
 *
 * Navegação por View Transition API (com fallback CSS),
 * algoritmo do Colecionador de Cupons delegado ao WebAssembly.
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

/* ════════════════════════════════════════
   WASM — carregamento do módulo
   ════════════════════════════════════════ */
let moduloWasm = null;

CriadorCalculadora().then(modulo => {
    moduloWasm = modulo;
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
});

/* Enter em qualquer input dispara o cálculo */
[inJaTem, inRepetidas, inPreco].forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') btnCalc.click(); })
);

/* Cálculo automático ao carregar com os valores padrão */
window.addEventListener('DOMContentLoaded', () => {
    // O cálculo inicial é disparado pelo .then() do CriadorCalculadora acima,
    // garantindo que o WASM já esteja pronto quando o botão for clicado.
});