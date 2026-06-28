<div align="center">

<img src="web/logo_figurinhas.svg" width="120" alt="Logo Calculadora de Figurinhas">

# Calculadora de Figurinhas — Copa 2026

Aplicação web que calcula quantas figurinhas e pacotes você ainda precisa comprar para completar o álbum, baseada no **Problema do Colecionador de Cupons** com solução exata via série harmônica.

**[▶ Acessar o projeto](https://eduardomotasousa.github.io/Calculo-de-Figurinhas/)**

![Lighthouse Performance](https://img.shields.io/badge/Lighthouse_Performance-100-00c853?logo=lighthouse&logoColor=white)
![Lighthouse Accessibility](https://img.shields.io/badge/Acessibilidade-100-00c853?logo=lighthouse&logoColor=white)
![Lighthouse Best Practices](https://img.shields.io/badge/Best_Practices-100-00c853?logo=lighthouse&logoColor=white)
![Lighthouse SEO](https://img.shields.io/badge/SEO-100-00c853?logo=lighthouse&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalável-5a0fc8?logo=pwa)

> Projeto acadêmico — **Eduardo Mota** · 1º semestre de ADS, Estácio, 2026  
> Desafio de férias

</div>

---

## Como usar

1. Informe quantas figurinhas únicas você já tem coladas no álbum
2. Informe o preço do pacote (padrão: R$ 7,00)
3. Opcionalmente, informe figurinhas repetidas disponíveis para troca
4. Clique em **Calcular Resultados** — o resultado aparece instantaneamente

O álbum considerado tem **980 figurinhas** distribuídas em pacotes de **7**, baseado no álbum oficial da Copa do Mundo 2026.

---

## Tecnologias

| Tecnologia | Finalidade |
|---|---|
| C++17 | Implementação do algoritmo |
| WebAssembly + Emscripten | Executa o C++ diretamente no navegador |
| Embind | Expõe a classe C++ para o JavaScript |
| HTML5 / CSS3 / JavaScript | Interface e comunicação com o WASM |
| SVG puro | Gráfico interativo de curva de custo |
| GitHub Pages | Hospedagem |
| GitHub Actions | CI/CD |

---

## O Algoritmo

O cálculo é baseado no **Problema do Colecionador de Cupons (Coupon Collector Problem)**.

### Por que não é simples dividir o que falta por 7?

Quanto mais perto de completar o álbum, mais difícil fica encontrar as figurinhas que faltam — você continua comprando pacotes com figurinhas que já tem. O cálculo precisa levar esse efeito em conta.

### Fórmula

```
faltam        = 980 − figurinhas já coladas
efetivas      = max(0, faltam − repetidas disponíveis)

H(n) = 1 + 1/2 + 1/3 + ... + 1/n   ← Número Harmônico (exato)

Figurinhas esperadas = 980 × H(efetivas)
Pacotes esperados    = ceil(figurinhas esperadas / 7)
Valor esperado       = pacotes × preço
```

O universo de probabilidade é sempre **980** — não o número de figurinhas que faltam. Cada nova figurinha distinta tem probabilidade `efetivas/980` de aparecer em cada compra, portanto o número esperado de compras para obtê-la é `980/efetivas`. Somando todas as etapas chega-se a `980 × H(efetivas)`.

### Exemplo

Você já tem 350 figurinhas únicas e 120 repetidas, pacote R$ 7,00:

```
faltam    = 980 − 350 = 630
efetivas  = 630 − 120 = 510
H(510)    ≈ 6,87
Figurinhas esperadas = 980 × 6,87 ≈ 6.732
Pacotes esperados    = ceil(6.732 / 7) = 962
Valor esperado       = 962 × R$ 7,00 = R$ 6.734,00
```

### Otimização do número harmônico incremental

A curva de custo exige calcular `H(n)` para todos os 980 estados do álbum. Em vez de recalcular do zero a cada ponto (O(n²)), o algoritmo percorre do álbum vazio para o quase-completo subtraindo `1/n` a cada passo (O(n)):

```cpp
double h = calcularNumeroHarmonicoAte(totalFigurinhas); // H(980)
for (int i = 0; i < totalFigurinhas; i++) {
    int faltando = totalFigurinhas - i;
    // h == H(faltando) aqui
    curva[i] = pacotes * precoPacote;
    if (faltando > 1) h -= 1.0 / faltando; // H(n-1) = H(n) - 1/n
}
```

---

## Funcionalidades

### Cálculo principal
Dado quantas figurinhas o usuário já tem (únicas e repetidas) e o preço do pacote, retorna figurinhas esperadas (inteiro arredondado), pacotes necessários e valor total em R$.

### Gráfico de curva de custo
SVG gerado e atualizado de forma incremental — a estrutura de nós DOM é criada uma única vez e apenas os atributos são atualizados a cada cálculo ou redimensionamento (sem recriar o SVG). Inclui:
- 980 pontos calculados via WASM com otimização incremental
- Área preenchida com gradiente e linha da curva
- Grade horizontal com valores em R$
- Marcador da posição atual do usuário com linhas de referência
- Tooltip interativo ao passar o mouse (suporte a touch)
- Cache por preço: a curva não é regerada se o preço não mudou
- Debounce de 150 ms no resize para evitar recálculos desnecessários

### Navegação com View Transition API
Transição animada entre as seções Início, Como Funciona e Sobre, com fallback silencioso para browsers sem suporte.

### PWA instalável
- Service Worker com estratégia **Network First** para HTML e **Cache First** para assets estáticos (WASM, JS, CSS, imagens)
- Instalação tolerante a falhas: assets opcionais não derrubam o precache
- Funciona offline após a primeira visita
- Instalável em Android e iOS

### Segurança
- **Content Security Policy** com `default-src 'self'`, sem `unsafe-inline` em `script-src`
- Emscripten compilado com `-sDYNAMIC_EXECUTION=0` (autoriza apenas WebAssembly, não `eval` genérico)
- Scripts carregados com `defer` — sem execução inline

### Acessibilidade (WCAG AA)
- Todos os elementos de texto passam contraste mínimo 4.5:1
- Hierarquia de headings sequencial (`h1 → h2 → h3`)
- `aria-live` nos resultados, `aria-label` no gráfico, `role="note"` no box informativo

### Compartilhamento social
Open Graph e Twitter Card completos com banner 1200×630 para preview no WhatsApp, LinkedIn e X.

---

## Arquitetura

```
Usuário
   │
   ▼
Interface (HTML/CSS)
   │
   ▼
JavaScript (script.js)
   │  instancia e chama métodos via Embind
   ▼
WebAssembly  ←  compilado de C++17 com Emscripten
   │
   ▼
CalculadoraAlbum::calcular()   →  Resultado { figurinhasEsperadas, pacotesEsperados, valorEsperado }
CalculadoraAlbum::gerarCurva() →  std::vector<double> (980 pontos)
```

---

## Estrutura do Projeto

```
Calculo-de-Figurinhas/
├── cpp/
│   ├── Resultado.h              — struct de saída do cálculo
│   ├── CalculadoraAlbum.h       — declaração da classe
│   ├── CalculadoraAlbum.cpp     — implementação do algoritmo
│   ├── bindings.cpp             — Embind: expõe a classe para o JS
│   └── main.cpp                 — testes locais em terminal
├── web/
│   ├── index.html               — interface completa
│   ├── style.css                — tema escuro, responsivo, WCAG AA
│   ├── script.js                — lógica JS + SVG incremental do gráfico
│   ├── sw.js                    — Service Worker (Network First / Cache First)
│   ├── registrar-sw.js          — registro do SW (externo para CSP)
│   ├── manifest.json            — PWA
│   ├── wasm/
│   │   ├── calculadora.js       — módulo gerado pelo Emscripten
│   │   └── calculadora.wasm     — binário WebAssembly
│   ├── logo_figurinhas.svg      — favicon SVG (fonte master do logo)
│   ├── icon_96x96.png           — favicon PNG + ícone PWA 96×96
│   ├── icon_192x192.png         — apple-touch-icon + ícone PWA 192×192
│   ├── icon_512x512.png         — ícone PWA 512×512
│   └── banner.jpg               — imagem Open Graph (1200×630)
├── .github/workflows/           — GitHub Actions (deploy para Pages)
├── .vscode/
│   ├── tasks.json               — Ctrl+Shift+B: compila g++ e emcc
│   ├── settings.json            — exclui bindings.cpp do IntelliSense
│   └── c_cpp_properties.json    — includePath do emsdk
└── .gitignore
```

---

## Compilação local

### C++ — testes em terminal

```bash
g++ -Wall -Wextra -g3 cpp/main.cpp cpp/CalculadoraAlbum.cpp -o cpp/output/main
./cpp/output/main
```

Saída esperada:

```
=== Álbum vazio (980 faltando de 980) ===
Figurinhas esperadas: 7315.97
Pacotes esperados:    1046
Valor esperado:       R$ 7322.00

=== Falta 1 figurinha de 980 ===
Figurinhas esperadas: 980.00
Pacotes esperados:    140
Valor esperado:       R$ 980.00

=== Faltam 10 figurinhas de 980 ===
Figurinhas esperadas: 2870.39
Pacotes esperados:    411
Valor esperado:       R$ 2877.00
```

> O terminal mostra o `double` bruto com duas casas decimais (formato do `main.cpp`). A interface web exibe `figurinhasEsperadas` arredondado para inteiro.

### WebAssembly — Emscripten

```bash
source ~/emsdk/emsdk_env.sh

emcc cpp/CalculadoraAlbum.cpp cpp/bindings.cpp \
     -o web/wasm/calculadora.js \
     -lembind \
     -s MODULARIZE=1 \
     -s EXPORT_NAME="CarregarCalculadora" \
     -s DYNAMIC_EXECUTION=0 \
     -O2
```

> `-sDYNAMIC_EXECUTION=0` é obrigatório para compatibilidade com a Content Security Policy do projeto (proíbe `eval` genérico, autoriza apenas WebAssembly).

---

## Uso de Inteligência Artificial

Este projeto contou com o apoio de ferramentas de IA durante o desenvolvimento, principalmente para auxiliar na geração, revisão e refatoração de código.

As decisões de implementação, adaptações, testes e validações foram realizadas ao longo do desenvolvimento, tendo como principal objetivo o aprendizado e a evolução das habilidades em programação.
