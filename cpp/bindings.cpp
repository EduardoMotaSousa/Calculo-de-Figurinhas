#include <emscripten/bind.h>
#include "CalculadoraAlbum.h"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(calculadora) {
    // Expõe o struct Resultado para o JS
    value_object<Resultado>("Resultado")
        .field("figurinhasEsperadas", &Resultado::figurinhasEsperadas)
        .field("pacotesEsperados",    &Resultado::pacotesEsperados)
        .field("valorEsperado",       &Resultado::valorEsperado);

    // Expõe a classe CalculadoraAlbum para o JS
    class_<CalculadoraAlbum>("CalculadoraAlbum")
        .constructor<int, int, double>()
        .function("calcular", &CalculadoraAlbum::calcular);
}
