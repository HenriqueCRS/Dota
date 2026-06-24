# Dota Coach Overlay

Overlay para Dota 2 construido sobre o **Overwolf** (plataforma sancionada pela Valve, sem risco de VAC/ban). Mostra, sobre a tela do jogo, indicadores de desempenho e dicas com voz em portugues.

## Funcionalidades (MVP 0.1.0)

- **Net worth (GPM) e Last hits** com indicador colorido **BOM / MEDIO / RUIM** estilo Dota Plus, calculado por percentil contra o benchmark do heroi jogado (dados do OpenDota).
- **KDA, nivel e tempo de jogo** em tempo real.
- **Timings** com aviso antecipado: runas de boa-fortuna, runas de poder e hora de empilhar (stack).
- **Dicas de desempenho**: alerta quando o last hit cai abaixo do esperado para o heroi.
- **Falas em portugues (TTS pt-BR)** via Web Speech API + sons curtos de alerta. Botao de mute no HUD.

## Arquitetura

```
manifest.json              # manifesto do app Overwolf (janelas, hotkeys, jogo alvo)
background/                # controller: detecta o Dota, registra o GEP, consolida o estado
windows/in_game/           # HUD transparente renderizado sobre o jogo
js/
  constants.js             # classId do Dota, features do GEP, canais de mensagem
  benchmarks.js            # OpenDota: percentil -> rating bom/medio/ruim
  coach.js                 # regras de timing e dicas contextuais
  audio.js                 # TTS pt-BR + sons
assets/sounds/             # ping.mp3 / tick.mp3 / warn.mp3 (opcionais)
icons/                     # icones do app (ver abaixo)
```

Fluxo: `background.js` escuta o GEP do Dota 2 (`overwolf.games.events`), consolida o
estado e envia para a janela `in_game` via `overwolf.windows.sendMessage`. O HUD
avalia GPM/LH contra o benchmark do heroi e o `Coach` dispara as dicas.

## Pre-requisitos para rodar

1. **Overwolf instalado** (https://www.overwolf.com/).
2. No Dota 2, adicionar a opcao de inicializacao **`-gamestateintegration`**
   (Steam > Dota 2 > Propriedades > Opcoes de inicializacao). Sem isso o GEP nao
   recebe os dados ao vivo.

## Carregar o app em modo desenvolvedor

1. Abra o Overwolf > engrenagem > **Suporte** > **Development options** (ou
   `Pacote de desenvolvimento`).
2. **Load unpacked extension** e selecione a pasta deste projeto (a que contem
   `manifest.json`).
3. Inicie o Dota 2 (com o launch option acima). O overlay aparece ao entrar em
   partida.

### Hotkeys padrao

- `Ctrl+Shift+D` — mostrar/ocultar overlay
- `Ctrl+Shift+F` — travar/destravar o clique no overlay (para interagir vs jogar)

## Pendencias conhecidas / proximos passos

- **Net worth exato**: hoje o GPM e aproximado pelo ouro atual. O net worth real
  (ouro + valor de itens) exige ler o campo `net_worth` do GSI cru ou somar itens.
- **Icones**: o `manifest.json` referencia `icons/icon256.png`, `icon256_gray.png`
  e `icon.ico`. Inclua esses arquivos antes de empacotar (o Overwolf exige icone).
- **Sons**: `assets/sounds/*.mp3` sao opcionais; se ausentes, apenas a fala toca.
- **Nomes de features do GEP**: a lista em `js/constants.js` segue a doc do
  provider Overwolf para Dota 2. Confirme contra a versao atual em
  https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2/
  e ajuste o parsing em `background.js` se algum campo mudar de formato.
- **Timings**: centralizados em `js/coach.js` (`TIMINGS`). Ajuste quando a Valve
  alterar os intervalos de runas.

## Status

Nao testado em partida real. Estrutura e logica completas; requer Overwolf +
Dota 2 instalados para validacao funcional.
