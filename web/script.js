/**
 * script.js — Calculadora de Figurinhas
 * Sprint 4 | Eduardo Mota | Estácio 2026
 *
 * Implementa em JavaScript o mesmo algoritmo do CalculadoraAlbum.cpp.
 * Na Sprint 5, esta lógica será substituída pela chamada ao módulo WASM.
 */

// ============================================================
// Algoritmo — espelho do CalculadoraAlbum.cpp
// ============================================================

/**
 * Calcula o Número Harmônico H(n) = 1 + 1/2 + 1/3 + ... + 1/n
 * Método exato (soma da série).
 * @param {number} n - Quantidade total de figurinhas
 * @returns {number}
 */
function calcularNumeroHarmonico(n) {
    let numeroHarmonico = 0.0;
    for (let i = 1; i <= n; i++) {
        numeroHarmonico += 1.0 / i;
    }
    return numeroHarmonico;
}

/**
 * @param {number} n              - Quantidade total de figurinhas
 * @param {number} numeroHarmonico
 * @returns {number}
 */
function calcularFigurinhasEsperadas(n, numeroHarmonico) {
    return n * numeroHarmonico;
}

/**
 * @param {number} figurinhasEsperadas
 * @param {number} figurinhasPorPacote
 * @returns {number} Inteiro (pacote não existe fracionado)
 */
function calcularPacotesEsperados(figurinhasEsperadas, figurinhasPorPacote) {
    return Math.ceil(figurinhasEsperadas / figurinhasPorPacote);
}

/**
 * @param {number} pacotesEsperados
 * @param {number} precoPacote
 * @returns {number}
 */
function calcularValorEsperado(pacotesEsperados, precoPacote) {
    return pacotesEsperados * precoPacote;
}

// Constantes fixas do álbum da Copa do Mundo
const TOTAL_FIGURINHAS  = 980;
const FIGURINHAS_PACOTE = 7;

/**
 * Ponto de entrada — equivalente ao método calcular() do C++.
 *
 * Recebe quantas figurinhas únicas o usuário já tem e quantas repetidas
 * (opcional). Calcula o esperado para completar o que ainda falta.
 *
 * @param {number} jatem      - Figurinhas únicas já coladas
 * @param {number} repetidas  - Figurinhas repetidas disponíveis (pode ser 0)
 * @param {number} precoPacote
 * @returns {{ faltam: number, figurinhasEsperadas: number, pacotesEsperados: number, valorEsperado: number }}
 */
function calcular(jatem, repetidas, precoPacote) {
    const faltam              = TOTAL_FIGURINHAS - jatem;
    const numeroHarmonico     = calcularNumeroHarmonico(faltam);
    let figurinhasEsperadas   = calcularFigurinhasEsperadas(faltam, numeroHarmonico);

    // Descontar repetidas: cada repetida é uma figurinha a menos para comprar
    const repetidasUtil       = Math.min(repetidas, figurinhasEsperadas);
    figurinhasEsperadas       = Math.max(0, figurinhasEsperadas - repetidasUtil);

    const pacotesEsperados    = calcularPacotesEsperados(figurinhasEsperadas, FIGURINHAS_PACOTE);
    const valorEsperado       = calcularValorEsperado(pacotesEsperados, precoPacote);

    return { faltam, figurinhasEsperadas, pacotesEsperados, valorEsperado };
}

// ============================================================
// Formatação
// ============================================================

function formatarNumero(n, casas = 2) {
    return n.toLocaleString('pt-BR', {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
    });
}

function formatarInteiro(n) {
    return n.toLocaleString('pt-BR');
}

function formatarMoeda(n) {
    return n.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

// ============================================================
// DOM
// ============================================================

const inputJaTem        = document.getElementById('inputJaTem');
const inputRepetidas    = document.getElementById('inputRepetidas');
const inputPreco        = document.getElementById('inputPreco');
const btnCalcular       = document.getElementById('btnCalcular');

const elFigurinhasValor = document.getElementById('resFigurinhas');
const elPacotesValor    = document.getElementById('resPacotes');
const elValorValor      = document.getElementById('resValor');

// Valores padrão — exemplo inicial zerado (usuário ainda não começou)
inputJaTem.value    = 0;
inputPreco.value    = '7,00';

// ============================================================
// Validação
// ============================================================

function lerPreco() {
    // Aceita vírgula ou ponto como separador decimal
    const raw = inputPreco.value.replace(',', '.');
    return parseFloat(raw);
}

function validar(jatem, repetidas, preco) {
    if (!Number.isInteger(jatem) || jatem < 0) {
        return 'Informe quantas figurinhas únicas você já tem (pode ser 0).';
    }
    if (jatem >= TOTAL_FIGURINHAS) {
        return `Você já tem ${TOTAL_FIGURINHAS} ou mais figurinhas — o álbum já está completo!`;
    }
    if (!Number.isInteger(repetidas) || repetidas < 0) {
        return 'A quantidade de repetidas deve ser um número inteiro positivo (ou deixe em branco).';
    }
    if (isNaN(preco) || preco <= 0) {
        return 'O preço do pacote deve ser um valor positivo.';
    }
    return null;
}

// ============================================================
// Animação dos números
// ============================================================

function animarNumero(elemento, novoTexto) {
    elemento.classList.remove('animando');
    // forçar reflow para reiniciar animação
    void elemento.offsetWidth;
    elemento.textContent = novoTexto;
    elemento.classList.add('animando');
    elemento.classList.remove('vazio');
}

// ============================================================
// Exibir resultado
// ============================================================

function exibirResultado(resultado) {
    animarNumero(elFigurinhasValor, formatarNumero(resultado.figurinhasEsperadas));
    animarNumero(elPacotesValor,    formatarInteiro(resultado.pacotesEsperados));
    animarNumero(elValorValor,      'R$ ' + formatarMoeda(resultado.valorEsperado));
}

function limparResultado() {
    elFigurinhasValor.textContent = '—';
    elPacotesValor.textContent    = '—';
    elValorValor.textContent      = '—';
    [elFigurinhasValor, elPacotesValor, elValorValor].forEach(el => {
        el.classList.add('vazio');
    });
}

// ============================================================
// Evento principal
// ============================================================

btnCalcular.addEventListener('click', () => {
    const jatem     = parseInt(inputJaTem.value, 10);
    const repetidas = inputRepetidas.value.trim() === '' ? 0 : parseInt(inputRepetidas.value, 10);
    const preco     = lerPreco();

    const erro = validar(jatem, repetidas, preco);
    if (erro) {
        alert(erro);
        return;
    }

    const resultado = calcular(jatem, repetidas, preco);
    exibirResultado(resultado);
});

// Calcular também com Enter nos inputs
[inputJaTem, inputRepetidas, inputPreco].forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnCalcular.click();
    });
});

// ============================================================
// Calcular automaticamente ao carregar (valores padrão da Copa)
// ============================================================

window.addEventListener('DOMContentLoaded', () => {
    btnCalcular.click();
});

// ============================================================
// Navbar — marcar link ativo conforme scroll
// ============================================================

const secoes   = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.navbar a');

const observer = new IntersectionObserver((entradas) => {
    entradas.forEach(entrada => {
        if (entrada.isIntersecting) {
            const id = entrada.target.id;
            navLinks.forEach(link => {
                link.classList.toggle('ativo', link.getAttribute('href') === `#${id}`);
            });
        }
    });
}, { threshold: 0.4 });

secoes.forEach(secao => observer.observe(secao));