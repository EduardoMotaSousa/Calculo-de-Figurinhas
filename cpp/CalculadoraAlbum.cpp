#include "CalculadoraAlbum.h"
#include <cmath>

CalculadoraAlbum::CalculadoraAlbum(int totalFigurinhas, int quantidadeFaltando,
                                   int figurinhasPorPacote, double precoPacote) {
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