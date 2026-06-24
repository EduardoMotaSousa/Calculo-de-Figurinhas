#include <iostream>
#include <iomanip>
#include "CalculadoraAlbum.h"

int main() {
    const int    TOTAL     = 980;
    const int    POR_PACOTE = 7;
    const double PRECO     = 7.00;

    std::cout << std::fixed << std::setprecision(2);

    // Teste 1: álbum vazio (caso clássico — igual ao H(980) × 980)
    {
        CalculadoraAlbum calc(TOTAL, TOTAL, POR_PACOTE, PRECO);
        Resultado r = calc.calcular();
        std::cout << "=== Álbum vazio (980 faltando de 980) ===\n";
        std::cout << "Figurinhas esperadas: " << r.figurinhasEsperadas << "\n";
        std::cout << "Pacotes esperados:    " << r.pacotesEsperados    << "\n";
        std::cout << "Valor esperado:       R$ " << r.valorEsperado    << "\n\n";
        // Esperado: ~7315.97 figurinhas, 1046 pacotes, R$ 7322,00
    }

    // Teste 2: falta apenas 1 figurinha de 980
    {
        CalculadoraAlbum calc(TOTAL, 1, POR_PACOTE, PRECO);
        Resultado r = calc.calcular();
        std::cout << "=== Falta 1 figurinha de 980 ===\n";
        std::cout << "Figurinhas esperadas: " << r.figurinhasEsperadas << "\n";
        std::cout << "Pacotes esperados:    " << r.pacotesEsperados    << "\n";
        std::cout << "Valor esperado:       R$ " << r.valorEsperado    << "\n\n";
        // Esperado: 980 figurinhas, 140 pacotes, R$ 980,00
    }

    // Teste 3: faltam 10 figurinhas de 980
    {
        CalculadoraAlbum calc(TOTAL, 10, POR_PACOTE, PRECO);
        Resultado r = calc.calcular();
        std::cout << "=== Faltam 10 figurinhas de 980 ===\n";
        std::cout << "Figurinhas esperadas: " << r.figurinhasEsperadas << "\n";
        std::cout << "Pacotes esperados:    " << r.pacotesEsperados    << "\n";
        std::cout << "Valor esperado:       R$ " << r.valorEsperado    << "\n";
        // Esperado: ~980*(1/980+1/979+...+1/971) ≈ 5215 figurinhas
    }

    return 0;
}