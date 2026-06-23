#ifndef CALCULADORA_ALBUM_H
#define CALCULADORA_ALBUM_H

#include "Resultado.h"

// Implementa o Problema do Colecionador de Cupons aplicado a um álbum
// de figurinhas: calcula quantas figurinhas (e pacotes/reais) são
// esperados, em média, até completar o álbum.
// Utiliza o método exato: H(n) = 1 + 1/2 + 1/3 + ... + 1/n.
class CalculadoraAlbum {
public:
    CalculadoraAlbum(int quantidadeFigurinhas, int figurinhasPorPacote, double precoPacote);

    // Executa o cálculo completo e retorna um Resultado.
    Resultado calcular();

private:
    int    quantidadeFigurinhas;
    int    figurinhasPorPacote;
    double precoPacote;

    double calcularNumeroHarmonico();
    double calcularFigurinhasEsperadas(double numeroHarmonico);
    int    calcularPacotesEsperados(double figurinhasEsperadas);
    double calcularValorEsperado(int pacotesEsperados);
};

#endif // CALCULADORA_ALBUM_H