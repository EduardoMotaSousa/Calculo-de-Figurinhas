#ifndef CALCULADORA_ALBUM_H
#define CALCULADORA_ALBUM_H

#include "Resultado.h"
#include <vector>

struct ResultadoMonteCarlo {          // ← sobe para cá
    double mediana;
    double p10;
    double p90;
    double media;
    std::vector<double> histograma;
    double histBucketMin;
    double histBucketTamanho;
};

class CalculadoraAlbum {
public:
    CalculadoraAlbum(int totalFigurinhas, int quantidadeFaltando,
                     int figurinhasPorPacote, double precoPacote);
    Resultado calcular();
    std::vector<double> gerarCurva();
    ResultadoMonteCarlo simularMonteCarlo(int simulacoes) const;
    CalculadoraAlbum(int totalFigurinhas, int quantidadeFaltando, int figurinhasPorPacote, double precoPacote);

    // Executa o cálculo completo e retorna um Resultado.
    Resultado calcular();

    // Gera a curva de custo acumulado esperado (em R$) para todos os pontos
    // de 0 até totalFigurinhas-1 figurinhas já coladas.
    //
    // Retorna um vetor de tamanho totalFigurinhas onde:
    //   curva[i] = custo esperado em R$ quando já há i figurinhas coladas
    //
    // Usa figurinhasPorPacote e precoPacote do próprio objeto.
    // quantidadeFaltando é ignorado aqui — percorremos todos os estados.
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
struct ResultadoMonteCarlo {
    double mediana;
    double p10;      // percentil 10 — lado otimista
    double p90;      // percentil 90 — lado pessimista
    double media;    // deve coincidir com o valor esperado analítico
    std::vector<double> histograma;  // 40 buckets normalizados (frequência relativa)
    double histBucketMin;
    double histBucketTamanho;
};

#endif // CALCULADORA_ALBUM_H