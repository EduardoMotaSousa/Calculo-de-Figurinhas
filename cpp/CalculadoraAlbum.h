#ifndef CALCULADORA_ALBUM_H
#define CALCULADORA_ALBUM_H

#include "Resultado.h"
#include <vector>

class CalculadoraAlbum {
public:
    CalculadoraAlbum(int totalFigurinhas, int quantidadeFaltando,
                     int figurinhasPorPacote, double precoPacote);

    Resultado calcular();
    std::vector<double> gerarCurva();

private:
    int    totalFigurinhas;
    int    quantidadeFaltando;
    int    figurinhasPorPacote;
    double precoPacote;

    double calcularNumeroHarmonico();
    double calcularNumeroHarmonicoAte(int n);
    double calcularFigurinhasEsperadas(double numeroHarmonico);
    int    calcularPacotesEsperados(double figurinhasEsperadas);
    double calcularValorEsperado(int pacotesEsperados);
};

#endif // CALCULADORA_ALBUM_H