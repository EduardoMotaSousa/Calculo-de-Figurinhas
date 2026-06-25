#include "CalculadoraAlbum.h"
#include <cmath>
#include <random>
#include <algorithm>
#include <numeric>

CalculadoraAlbum::CalculadoraAlbum(int totalFigurinhas, int quantidadeFaltando, int figurinhasPorPacote, double precoPacote) {
    this->totalFigurinhas     = totalFigurinhas;
    this->quantidadeFaltando  = quantidadeFaltando;
    this->figurinhasPorPacote = figurinhasPorPacote;
    this->precoPacote         = precoPacote;
}

// H(n) = 1 + 1/2 + 1/3 + ... + 1/n
// Aqui n = quantidadeFaltando (não o total do álbum).
double CalculadoraAlbum::calcularNumeroHarmonico() {
    return calcularNumeroHarmonicoAte(quantidadeFaltando);
}

// Versão parametrizada — usada por gerarCurva() para calcular H(n)
// para qualquer n sem criar um novo objeto.
double CalculadoraAlbum::calcularNumeroHarmonicoAte(int n) {
    double h = 0.0;
    for (int i = 1; i <= n; i++) {
        h += 1.0 / i;
    }
    return h;
}

// E = totalFigurinhas × H(quantidadeFaltando)
double CalculadoraAlbum::calcularFigurinhasEsperadas(double numeroHarmonico) {
    return totalFigurinhas * numeroHarmonico;
}

int CalculadoraAlbum::calcularPacotesEsperados(double figurinhasEsperadas) {
    return static_cast<int>(std::ceil(figurinhasEsperadas / figurinhasPorPacote));
}

double CalculadoraAlbum::calcularValorEsperado(int pacotesEsperados) {
    return pacotesEsperados * precoPacote;
}

Resultado CalculadoraAlbum::calcular() {
    Resultado resultado;

    double numeroHarmonico        = calcularNumeroHarmonico();
    resultado.figurinhasEsperadas = calcularFigurinhasEsperadas(numeroHarmonico);
    resultado.pacotesEsperados    = calcularPacotesEsperados(resultado.figurinhasEsperadas);
    resultado.valorEsperado       = calcularValorEsperado(resultado.pacotesEsperados);

    return resultado;
}

// Gera a curva de custo esperado para todos os estados do álbum.
//
// Para cada i (figurinhas já coladas, de 0 até totalFigurinhas-1):
//   faltando = totalFigurinhas - i
//   E = totalFigurinhas × H(faltando)
//   pacotes = ceil(E / figurinhasPorPacote)
//   custo = pacotes × precoPacote
//
// O cálculo é otimizado: H(n) é construído incrementalmente de n=980
// até n=1, subtraindo 1/n a cada passo (percorrendo do álbum vazio
// para o quase completo), evitando recalcular do zero a cada ponto.
std::vector<double> CalculadoraAlbum::gerarCurva() {
    std::vector<double> curva(totalFigurinhas);

    // Começa com H(totalFigurinhas) — estado do álbum vazio
    double h = calcularNumeroHarmonicoAte(totalFigurinhas);

    for (int i = 0; i < totalFigurinhas; i++) {
        int faltando = totalFigurinhas - i;

        // h agora é H(faltando)
        double figurinhasEsperadas = totalFigurinhas * h;
        int    pacotes             = static_cast<int>(std::ceil(figurinhasEsperadas / figurinhasPorPacote));
        curva[i]                   = pacotes * precoPacote;

        // Prepara H(faltando - 1) para a próxima iteração:
        // H(n-1) = H(n) - 1/n
        if (faltando > 1) {
            h -= 1.0 / faltando;
        }
    }

    return curva;
}

ResultadoMonteCarlo CalculadoraAlbum::simularMonteCarlo(int simulacoes) const {
    const int N_BUCKETS = 40;
    std::mt19937 rng(42);

    std::vector<double> custos;
    custos.reserve(simulacoes);

    for (int sim = 0; sim < simulacoes; sim++) {
        std::vector<bool> album(totalFigurinhas, false);  // ← era quantidadeTotal
        int coladas = 0;
        double gasto = 0.0;

        while (coladas < totalFigurinhas) {               // ← era quantidadeTotal
            gasto += precoPacote;
            for (int f = 0; f < figurinhasPorPacote; f++) {
                std::uniform_int_distribution<int> dist(0, totalFigurinhas - 1); // ← era quantidadeTotal - 1
                int fig = dist(rng);
                if (!album[fig]) {
                    album[fig] = true;
                    coladas++;
                }
            }
        }
        custos.push_back(gasto);
    }

    std::sort(custos.begin(), custos.end());

    ResultadoMonteCarlo r;
    r.media   = std::accumulate(custos.begin(), custos.end(), 0.0) / simulacoes;
    r.mediana = custos[simulacoes / 2];
    r.p10     = custos[static_cast<int>(simulacoes * 0.10)];
    r.p90     = custos[static_cast<int>(simulacoes * 0.90)];

    // Histograma: 40 buckets entre p5 e p95 (corta caudas extremas)
    double bMin = custos[static_cast<int>(simulacoes * 0.05)];
    double bMax = custos[static_cast<int>(simulacoes * 0.95)];
    double bTam = (bMax - bMin) / N_BUCKETS;

    std::vector<int> contagem(N_BUCKETS, 0);
    for (double c : custos) {
        int b = static_cast<int>((c - bMin) / bTam);
        b = std::max(0, std::min(N_BUCKETS - 1, b));
        contagem[b]++;
    }

    int pico = *std::max_element(contagem.begin(), contagem.end());
    r.histograma.resize(N_BUCKETS);
    for (int b = 0; b < N_BUCKETS; b++) {
        r.histograma[b] = static_cast<double>(contagem[b]) / pico; // normalizado 0–1
    }

    r.histBucketMin    = bMin;
    r.histBucketTamanho = bTam;
    return r;
}