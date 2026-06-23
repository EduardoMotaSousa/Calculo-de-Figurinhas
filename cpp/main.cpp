#include <iostream>
#include <iomanip>
#include "CalculadoraAlbum.h"

int main() {
    int    quantidadeFigurinhas = 980;
    int    figurinhasPorPacote  = 7;
    double precoPacote          = 7.00;

    CalculadoraAlbum calculadora(quantidadeFigurinhas, figurinhasPorPacote, precoPacote);

    Resultado resultado = calculadora.calcular();

    std::cout << std::fixed << std::setprecision(2);
    std::cout << "Figurinhas esperadas: " << resultado.figurinhasEsperadas << "\n";
    std::cout << "Pacotes esperados:    " << resultado.pacotesEsperados    << "\n";
    std::cout << "Valor esperado:       R$ " << resultado.valorEsperado    << "\n";

    return 0;
}