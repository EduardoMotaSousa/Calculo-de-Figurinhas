#include "CalculadoraAlbum.h"
#include <cmath>
#include <iostream>

CalculadoraAlbum::CalculadoraAlbum(int quantidadeFigurinhas, int figurinhasPorPacote, double precoPacote) {
    this->quantidadeFigurinhas = quantidadeFigurinhas;
    this->figurinhasPorPacote = figurinhasPorPacote;
    this->precoPacote = precoPacote;
}

double CalculadoraAlbum::calcularNumeroHarmonico(bool usarMetodoAproximado) {
    double constanteEulerMascheroni = 0.5772;

    if (usarMetodoAproximado) {
        return std::log(quantidadeFigurinhas) + constanteEulerMascheroni;
    }

    double numeroHarmonico = 0.0;
    for (int i = 1; i <= quantidadeFigurinhas; i++) {
        numeroHarmonico = numeroHarmonico + (1.0 / i);
    }
    return numeroHarmonico;
}

double CalculadoraAlbum::calcularFigurinhasEsperadas(double numeroHarmonico) {
    return quantidadeFigurinhas * numeroHarmonico;
}

double CalculadoraAlbum::calcularPacotesEsperados(double figurinhasEsperadas) {
    return std::ceil(figurinhasEsperadas / figurinhasPorPacote);
}

double CalculadoraAlbum::calcularValorEsperado(double pacotesEsperados) {
    return pacotesEsperados * precoPacote;
}

Resultado CalculadoraAlbum::calcular(bool usarMetodoAproximado) {
    Resultado resultado;

    double numeroHarmonico = calcularNumeroHarmonico(usarMetodoAproximado);
    resultado.figurinhasEsperadas = calcularFigurinhasEsperadas(numeroHarmonico);
    resultado.pacotesEsperados = calcularPacotesEsperados(resultado.figurinhasEsperadas);
    resultado.valorEsperado = calcularValorEsperado(resultado.pacotesEsperados);

    return resultado;
}
