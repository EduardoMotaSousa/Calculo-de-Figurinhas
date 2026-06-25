#ifndef CALCULADORA_ALBUM_H
#define CALCULADORA_ALBUM_H

#include "Resultado.h"
#include <vector>

// Implementa o Problema do Colecionador de Cupons aplicado a um álbum
// de figurinhas: calcula quantas figurinhas (e pacotes/reais) são
// esperados, em média, até completar o álbum.
//
// Fórmula correta:
//   E = totalFigurinhas × H(quantidadeFaltando)
//   onde H(n) = 1 + 1/2 + 1/3 + ... + 1/n
//
// Por quê isso funciona:
//   Quando já há (total - n) figurinhas distintas coladas, cada etapa
//   de coletar a próxima nova tem probabilidades diferentes:
//     - Coletar a 1ª das n faltando: prob n/total  → esperado total/n
//     - Coletar a 2ª (faltam n-1):   prob (n-1)/total → esperado total/(n-1)
//     - ...
//     - Coletar a última (falta 1):   prob 1/total   → esperado total/1
//   Somando: total × (1/n + 1/(n-1) + ... + 1/1) = total × H(n)
//
// Exemplos:
//   Falta 1 de 980:   E = 980 × H(1) = 980 × 1       = 980 figurinhas ✓
//   Faltam 980 de 980: E = 980 × H(980)               = 7315,97 figurinhas ✓
class CalculadoraAlbum {
public:
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

#endif // CALCULADORA_ALBUM_H