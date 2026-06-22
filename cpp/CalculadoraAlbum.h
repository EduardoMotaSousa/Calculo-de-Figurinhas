#ifndef CALCULADORA_ALBUM_H
#define CALCULADORA_ALBUM_H

#include "Resultado.h"

// Implementa o Problema do Colecionador de Cupons aplicado a um álbum
// de figurinhas: calcula quantas figurinhas (e pacotes/reais) são
// esperados, em média, até completar o álbum.
class CalculadoraAlbum {
public:
    CalculadoraAlbum(int quantidadeFigurinhas, int figurinhasPorPacote, double precoPacote);

    // Executa o cálculo completo.
    // Se usarMetodoAproximado for true, usa a fórmula ln(n) + 0.5772.
    // Se for false, usa a soma exata 1 + 1/2 + 1/3 + ... + 1/n.
    Resultado calcular(bool usarMetodoAproximado);

    double calcularNumeroHarmonico(bool usarMetodoAproximado);
    double calcularFigurinhasEsperadas(double numeroHarmonico);
    double calcularPacotesEsperados(double figurinhasEsperadas);
    double calcularValorEsperado(double pacotesEsperados);

private:
    int quantidadeFigurinhas;
    int figurinhasPorPacote;
    double precoPacote;
};

#endif
