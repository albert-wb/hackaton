# StormOps Franca

Protótipo interativo de alta fidelidade de um painel de apoio à coordenação de emergências da Defesa Civil de Franca (SP).
Ele responde a uma pergunta: **em qual região a capacidade de resposta pode ser sobrecarregada primeiro, e em quanto tempo?**

> **MODO DEMONSTRAÇÃO — DADOS SIMULADOS.**
> Nenhum número do painel vem de sensores, de órgãos públicos ou de pessoas reais. As ocorrências, as equipes, a chuva e o
> índice de calor são gerados por cenários determinísticos (`src/data/scenarios.ts`). A estimativa de tempo até a saturação
> é uma extrapolação de tendência e não foi validada. Os limites das zonas do mapa são aproximados e não são oficiais.

## Como rodar

Requisitos: Node.js 20.19 ou mais novo (ou 22.12+), por causa do Vite 8.

```bash
npm install
npm run dev      # painel em http://localhost:5173
npm test         # testes do engine e da geometria do mapa
npm run build    # verifica os tipos (tsc) e gera a pasta dist/
npm run preview  # serve a pasta dist/
```

O painel não faz chamadas de rede em tempo de execução (as fontes Geist vêm empacotadas).

### Estado na URL

O estado do painel fica na URL e é lido dela, o que permite abrir direto cada tela:

| Parâmetro | Valores | Exemplo |
| --- | --- | --- |
| `passo` | 0 a 4 (14:00, 14:10, 14:20, 14:30, 14:40) | `?passo=3` |
| `intensidade` | 0 (Ano normal) a 1 (Super El Niño) | `?intensidade=0` |
| `regiao` | `norte`, `centro`, `leste`, `sul` | `?regiao=leste` |
| `aba` | `chuva`, `calor` | `?aba=calor` |
| `mapa` | `pressao`, `ocorrencias`, `recursos` | `?mapa=recursos` |

Exemplo: `http://localhost:5173/?passo=3&intensidade=1&regiao=norte&aba=chuva&mapa=pressao`.

## O que há no painel

- **Faixa de indicadores:** chuva (ou índice de calor), ocorrências ativas, equipes livres e pressão da cidade, cada um com a variação em relação a 10 minutos antes.
- **Regiões, Condições atuais e Mapa operacional** (abas Pressão, Ocorrências e Recursos; zoom, arrastar, camadas, legenda e callout de alerta).
- **Detalhes da região:** medidor de 0 a 100, tempo até saturação, seis fatores que somam exatamente a pressão exibida, tendência e a comparação "E se +1 equipe?".
- **Evolução da pressão** (Pressão, Ocorrências e Equipes livres), **Alerta operacional** e **Últimas ocorrências**.
- **Replay** de 14:00 a 14:40 (1x, 2x e 4x) e o controle de **intensidade do cenário**, de Ano normal a Super El Niño.
- **Aba Calor:** os mesmos cards, trocando chuva por índice de calor, ocorrências por atendimentos e equipes por equipes e refúgios.
- **Barra lateral:** Mapa operacional e Evolução temporal abrem em tela cheia; Ocorrências e Recursos abrem painéis; "Como funciona" explica a fórmula. Relatórios e Configurações estão fora do escopo do protótipo.

## Pressure Engine

As funções puras ficam em `src/engine/pressure.ts`, sem dependência de UI.

| Fator | Cálculo | Máx. |
| --- | --- | --- |
| Demanda atual | 25 × mín(ocorrências ativas ÷ 12; 1) | 25 |
| Crescimento da demanda | 20 × limitar((ativas − ativas 10 min antes) ÷ 4; 0; 1); em 14:00 vale 0 | 20 |
| Chuva ou calor | chuva: 20 × limitar(mm/h ÷ 80); calor: 20 × limitar((índice de calor − 28) ÷ 14) | 20 |
| Recursos ocupados | 20 × (1 − equipes livres ÷ equipes totais) | 20 |
| Vulnerabilidade | 10 × vulnerabilidade da região (0 a 1) | 10 |
| Infraestrutura crítica | 5 × mín(itens críticos ÷ 2; 1) | 5 |

- **Níveis:** NORMAL 0–25, ATENÇÃO 26–50, ELEVADO 51–75, CRÍTICO 76–100. Cada nível tem ícone, padrão, nome e cor (nunca só cor).
- **Cidade:** 0,5 × a maior região + 0,5 × a média das regiões.
- **Tempo até saturação:** sem equipes livres, "saturado"; se a demanda cresce, (equipes livres ÷ crescimento) × 10 min; senão, sem tendência.
- **Alerta:** pressão de 45 ou mais e tempo até saturação de 15 min ou menos.
- Os pontos exibidos dos fatores são inteiros e somam a pressão exibida (método do maior resto).

Valores de aceitação do cenário Super El Niño (tolerância de ±1), cobertos por `src/engine/pressure.test.ts`:

| Região | 14:00 | 14:10 | 14:20 | 14:30 | 14:40 |
| --- | --- | --- | --- | --- | --- |
| Norte | 21 | 47 | 71 | 86 | 94 |
| Centro | 16 | 28 | 36 | 47 | 51 |
| Leste | 9 | 21 | 29 | 43 | 47 |
| Sul | 11 | 16 | 29 | 26 | 35 |
| Cidade | 18 | 37 | 56 | 68 | 75 |

Eventos: alerta do Norte às 14:10 (~10 min), Norte esgotado às 14:30, alerta do Leste às 14:40. No Ano normal, o Norte chega a no máximo ~43 e nenhum alerta dispara.

A fonte dos dados é a interface `DataProvider` (`src/data/provider.ts`). Hoje há só a `SimulationDataProvider`; uma fonte real
poderá implementar a mesma interface sem mexer no engine.

## Mapa de Franca

O mapa é SVG com dados estáticos, em `src/data/`:

- `franca.geo.json`: mancha urbana, vias, córregos e nomes de bairros.
- `zones.geo.json`: as 4 zonas (Norte, Centro, Leste, Sul). **São editáveis pelo time**; cada zona é um MultiPolygon.

**Atenção: o `franca.geo.json` que está no repositório é uma geometria aproximada**, gerada por `scripts/make-approx.mjs`
porque o ambiente em que o protótipo foi construído não tinha acesso ao OpenStreetMap. Ele é rotulado como
"geometria aproximada" no próprio mapa e não tem vias nem córregos. Para trazer a geometria real, em uma máquina com internet:

```bash
npm run fetch-osm    # Nominatim + Overpass: gera src/data/franca.geo.json (mancha urbana, vias, córregos, bairros)
npm run make-zones   # recalcula as 4 zonas a partir da nova mancha
```

Depois confira o resultado no mapa e ajuste `zones.geo.json` se quiser. Se um córrego (Cubatão, Bagres) não for encontrado
no OSM, o script omite o traçado dele. Os ícones de infraestrutura crítica e de refúgios são ilustrativos, não locais reais.

Dados do mapa, quando vierem do OpenStreetMap: © OpenStreetMap contributors, licença ODbL
(<https://www.openstreetmap.org/copyright>). A atribuição aparece no rodapé do mapa.

## Estrutura

```
src/
  engine/       pressure.ts (funções puras), derived.ts (ocorrências, alertas, condições), types.ts, pressure.test.ts
  data/         regions.ts, scenarios.ts, provider.ts, mapData.ts, franca.geo.json, zones.geo.json
  state/        AppContext.tsx (estado e modelo), urlState.ts (estado na URL)
  components/   um arquivo por card: TopBar, Sidebar, KpiRow, RegionsCard, ConditionsCard, MapCard,
                RegionDetails, PressureEvolution, AlertCard, OccurrencesCard, ReplayBar, Panels
  lib/          geo.ts, levels.ts, hooks.ts, format.ts
scripts/        fetch-osm.mjs, make-zones.mjs, make-approx.mjs, geo-utils.mjs
```

Tema: cinzas neutros, marcas em L nos cantos dos cards, raio de 2 px, sem gradientes nem sombras. As cores dos níveis são
variáveis CSS (`--nivel-*` em `src/index.css`); para um tema só em cinza, basta redefini-las, pois ícones, padrões e rótulos
já diferenciam os níveis.

## Branches

O repositório tem 5 branches individuais, todas criadas a partir do mesmo commit da `main`: `Albert`, `Felipe`, `Lais`,
`Amanda` e `Nathan`. Cada pessoa trabalha na sua branch e abre um Pull Request para a `main`. Antes de abrir o PR, rode
`npm test` e `npm run build`.

## Fora do escopo do protótipo

Autenticação, dados reais de Defesa Civil, previsão meteorológica de verdade, Relatórios e Configurações, e qualquer
integração com órgãos externos.

## Membros do projeto 
- Albert William
- Amanda Albuquerque Silva
- Filipe José
- Laís Bembo de Freitas
- Natthan Silvestri Weis Ferreira da Costa
