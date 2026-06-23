#include "CalculadoraAlbum.h"
#include <cmath>

CalculadoraAlbum::CalculadoraAlbum(int quantidadeFigurinhas, int figurinhasPorPacote, double precoPacote) {
    this->quantidadeFigurinhas = quantidadeFigurinhas;
    this->figurinhasPorPacote  = figurinhasPorPacote;
    this->precoPacote          = precoPacote;
}

double CalculadoraAlbum::calcularNumeroHarmonico() {
    double numeroHarmonico = 0.0;
    for (int i = 1; i <= quantidadeFigurinhas; i++) {
        numeroHarmonico = numeroHarmonico + (1.0 / i);
    }
    return numeroHarmonico;
}

double CalculadoraAlbum::calcularFigurinhasEsperadas(double numeroHarmonico) {
    return quantidadeFigurinhas * numeroHarmonico;
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