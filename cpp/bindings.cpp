#include <emscripten/bind.h>
#include "CalculadoraAlbum.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(calculadora) {
    // Expõe o struct Resultado para o JS
    value_object<Resultado>("Resultado")
        .field("figurinhasEsperadas", &Resultado::figurinhasEsperadas)
        .field("pacotesEsperados",    &Resultado::pacotesEsperados)
        .field("valorEsperado",       &Resultado::valorEsperado);

    // Permite que o JS receba std::vector<double> como Array
    register_vector<double>("VectorDouble");

    // Expõe a classe CalculadoraAlbum para o JS
    // Construtor recebe 4 parâmetros:
    //   totalFigurinhas, quantidadeFaltando, figurinhasPorPacote, precoPacote
    class_<CalculadoraAlbum>("CalculadoraAlbum")
        .constructor<int, int, int, double>()
        .function("calcular",   &CalculadoraAlbum::calcular)
        .function("gerarCurva", &CalculadoraAlbum::gerarCurva);
}