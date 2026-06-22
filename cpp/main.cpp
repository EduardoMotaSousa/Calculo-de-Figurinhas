#include <iostream>
#include <iomanip>
#include "CalculadoraAlbum.h"

int main() {
    int quantidadeFigurinhas = 980;
    int figurinhasPorPacote = 7;
    double precoPacote = 7.00;

    CalculadoraAlbum calculadora(quantidadeFigurinhas, figurinhasPorPacote, precoPacote);

    std::cout << std::fixed << std::setprecision(2);

    Resultado resultadoExato = calculadora.calcular(false);
    std::cout << "--- Metodo Exato ---\n";
    std::cout << "Figurinhas esperadas: " << resultadoExato.figurinhasEsperadas << "\n";
    std::cout << "Pacotes esperados:    " << resultadoExato.pacotesEsperados << "\n";
    std::cout << "Valor esperado:       R$ " << resultadoExato.valorEsperado << "\n\n";

    Resultado resultadoAproximado = calculadora.calcular(true);
    std::cout << "--- Metodo Aproximado ---\n";
    std::cout << "Figurinhas esperadas: " << resultadoAproximado.figurinhasEsperadas << "\n";
    std::cout << "Pacotes esperados:    " << resultadoAproximado.pacotesEsperados << "\n";
    std::cout << "Valor esperado:       R$ " << resultadoAproximado.valorEsperado << "\n";

    return 0;
}
