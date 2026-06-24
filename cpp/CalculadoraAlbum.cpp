#include "CalculadoraAlbum.h"
#include <cmath>

CalculadoraAlbum::CalculadoraAlbum(int totalFigurinhas, int quantidadeFaltando, int figurinhasPorPacote, double precoPacote) {
    this->totalFigurinhas     = totalFigurinhas;
    this->quantidadeFaltando  = quantidadeFaltando;
    this->figurinhasPorPacote = figurinhasPorPacote;
    this->precoPacote         = precoPacote;
}

// H(n) = 1 + 1/2 + 1/3 + ... + 1/n
// Aqui n = quantidadeFaltando (não o total do álbum).
double CalculadoraAlbum::calcularNumeroHarmonico() {
    double numeroHarmonico = 0.0;
    for (int i = 1; i <= quantidadeFaltando; i++) {
        numeroHarmonico = numeroHarmonico + (1.0 / i);
    }
    return numeroHarmonico;
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