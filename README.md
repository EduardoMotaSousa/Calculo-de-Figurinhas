# Calculadora de Figurinhas — Copa 2026

Aplicação web que calcula quantas figurinhas e pacotes você ainda precisa comprar para completar um álbum, baseada no **Problema do Colecionador de Cupons** com solução exata via série harmônica.

🔗 **[Acesse o projeto](https://eduardomotasousa.github.io/Calculo-de-Figurinhas/)**

> Projeto acadêmico desenvolvido por **Eduardo Mota** — 1º semestre de ADS, Estácio, 2026.  
> Desafio de férias da disciplina de Probabilidade.

---

## Tecnologias

| Tecnologia | Finalidade |
|---|---|
| C++17 | Implementação do algoritmo |
| WebAssembly + Emscripten | Executa o C++ diretamente no navegador |
| Embind | Expõe a classe C++ para o JavaScript |
| HTML5 / CSS3 / JavaScript | Interface e comunicação com o WASM |
| SVG puro | Gráfico de curva de custo |
| GitHub Pages | Hospedagem |
| GitHub Actions | CI/CD |

---

## Como usar

1. Informe quantas figurinhas únicas você já tem coladas
2. Informe o preço do pacote (padrão: R$ 7,00)
3. Opcionalmente, informe figurinhas repetidas disponíveis para troca
4. Clique em **Calcular** — o resultado aparece instantaneamente

O álbum considerado tem **980 figurinhas** com **7 por pacote**, baseado no álbum oficial da Copa do Mundo 2026.

---

## O Algoritmo

O cálculo é baseado no **Problema do Colecionador de Cupons (Coupon Collector Problem)**.

### Por que não é simples dividir o que falta por 7?

Quanto mais perto de completar o álbum, mais difícil fica encontrar as figurinhas que faltam — você continua comprando pacotes com figurinhas que já tem. O cálculo precisa levar isso em conta.

### Fórmula

```
faltam        = 980 − figurinhas já coladas
efetivas      = max(0, faltam − repetidas disponíveis)

H(n) = 1 + 1/2 + 1/3 + ... + 1/n   ← Número Harmônico

Figurinhas esperadas = 980 × H(efetivas)
Pacotes esperados    = ceil(figurinhas esperadas / 7)
Valor esperado       = pacotes × preço
```

O universo de probabilidade é sempre **980** — não o número de figurinhas que faltam. Cada nova figurinha distinta tem probabilidade `efetivas/980` de aparecer em cada pacote, portanto o número esperado de compras para obtê-la é `980/efetivas`. Somando todas as etapas chega-se a `980 × H(efetivas)`.

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

---

## Arquitetura

```
Usuário
   │
   ▼
Interface (HTML/CSS)
   │
   ▼
JavaScript
   │  instancia e chama métodos via Embind
   ▼
WebAssembly  ←  compilado de C++17 com Emscripten
   │
   ▼
CalculadoraAlbum
   │
   ▼
Resultado { figurinhasEsperadas, pacotesEsperados, valorEsperado }
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
│   ├── style.css                — tema escuro, responsivo
│   ├── script.js                — lógica JS + renderização do gráfico
│   ├── manifest.json            — PWA
│   ├── sw.js                    — Service Worker (cache offline)
│   ├── wasm/
│   │   ├── calculadora.js       — módulo gerado pelo Emscripten
│   │   └── calculadora.wasm     — binário WebAssembly
│   ├── logo_figurinhas.svg      — favicon SVG
│   ├── logo_96h.png             — favicon PNG + ícone PWA 96×96
│   ├── logo_192h.png            — apple-touch-icon + ícone PWA 192×192
│   └── banner.jpg               — imagem Open Graph (1200×630)
├── .github/workflows/           — GitHub Actions
├── .vscode/
│   ├── tasks.json               — Ctrl+Shift+B: compila g++ e emcc
│   ├── settings.json            — exclui bindings.cpp do IntelliSense
│   └── c_cpp_properties.json    — includePath do emsdk
└── .gitignore
```

---

## Funcionalidades

### Cálculo principal
Dado quantas figurinhas o usuário já tem (únicas e repetidas) e o preço do pacote, retorna figurinhas esperadas, pacotes e valor total em R$.

### Gráfico de curva de custo
SVG puro com 980 pontos gerados via WASM. Mostra como o custo acumulado cresce conforme o álbum avança — lento no início, quase vertical no final. Inclui:
- Área preenchida com gradiente
- Grade horizontal com labels em R$
- Marcador na posição atual do usuário com linha de referência horizontal
- Tooltip interativo ao passar o mouse (suporte a touch)
- Cache por preço: a curva não é regerada se o preço não mudou

### Navegação com View Transition API
Transição animada entre as seções Início, Como Funciona e Sobre, com fallback silencioso para browsers sem suporte.

### PWA instalável
- `manifest.json` com `start_url` e `scope` corretos para subpasta do GitHub Pages
- Service Worker com cache offline tolerante a falhas (assets opcionais não derrubam a instalação)
- Funciona sem internet após a primeira visita
- Instalável em Android e iOS

### Compartilhamento social
Open Graph e Twitter Card completos com banner 1200×630 para preview no WhatsApp, LinkedIn e X.

---

## Compilação local

### C++ (testes em terminal)

```bash
g++ -Wall -Wextra -g3 cpp/main.cpp cpp/CalculadoraAlbum.cpp -o cpp/output/main
./cpp/output/main
```

Ou **Ctrl+Shift+B** no VS Code (já configurado em `tasks.json`).

Saída esperada com álbum vazio (980 de 980):
```
Figurinhas esperadas: 7315.97
Pacotes esperados:    1046
Valor esperado:       R$ 7322.00
```

### WebAssembly (Emscripten)

```bash
source ~/emsdk/emsdk_env.sh

emcc cpp/CalculadoraAlbum.cpp cpp/bindings.cpp \
     -o web/wasm/calculadora.js \
     -lembind \
     -s MODULARIZE=1 \
     -s EXPORT_NAME="CarregarCalculadora" \
     -O2
```

### Teste local

Abrir `web/index.html` com **Live Server** no VS Code (WASM requer HTTP — não funciona via `file://`).

---

## Padrões de código

- Nomes em português em todo o projeto
- Classes pequenas, métodos curtos, uma responsabilidade por função
- `calculadora.delete()` após cada uso do objeto C++ (libera memória do WASM)
- Sem bibliotecas externas no frontend — SVG, CSS e JS puros
- Código comentado nos pontos não óbvios (ex: otimização O(n) do número harmônico incremental)

---

## Uso de Inteligência Artificial

Este projeto contou com o apoio de ferramentas de inteligência artificial durante o desenvolvimento, principalmente para auxiliar na geração, revisão e refatoração de código.

As decisões de implementação, adaptações, testes e validações foram realizadas ao longo do desenvolvimento, tendo como principal objetivo o aprendizado e a evolução das habilidades em programação.
