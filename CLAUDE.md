# CLAUDE.md

Projeto pessoal: app de ajuda para Dota 2 no Overwolf (remoto `HenriqueCRS/Dota`). Sem relação com o Sankhya: os
padrões de componentes HTML5, Oracle e Sankhya do `CLAUDE.md` da pasta `GitHub` não valem aqui. Valem as regras de
comunicação gerais (português do Brasil, objetivo, sem emojis).

Última atualização: 06/11/2026.

---

## Objetivo

Reviver o MVP e transformá-lo num app vendido na loja do Overwolf, com interface, dicas e falas em russo, inglês e
português do Brasil.

## Decisões tomadas

- **Plataforma**: Overwolf, só com dados do GEP (integração oficial da Valve, opção `-gamestateintegration`). Nada de
  ler memória, arquivos ou tráfego do cliente.
- **Informação**: só o que o jogador já vê na tela. Nada sobre posição de inimigos ou dados escondidos. Nomes e Steam
  IDs de outros jogadores nunca aparecem antes do fim da escolha (regra do Overwolf para o Dota 2).
- **Público**: geral desde o lançamento, nos três idiomas, sem país principal.
- **Vozes de pessoas conhecidas**: só em português, com streamers brasileiros escolhidos pelo dono do projeto (não
  pesquisar nem contatar ninguém; os contratos são com ele). Em russo e inglês, voz padrão. Pacotes de voz podem ser de
  um idioma só; o seletor mostra só os pacotes do idioma escolhido. Clonagem de voz só com autorização escrita, e nada
  de conteúdo de streamer é implementado antes de o contrato ser confirmado.
- **Monetização**: só a do Overwolf (anúncios, assinatura via Tebex, ou os dois). Distribuição só pela loja.
- **Fora do escopo**: minigames na fila, segunda tela no celular, divulgação (conta no Instagram fica para depois).

## Recursos

**Já existem e continuam** (todos precisam de correção, ver diagnóstico): GPM e last hits contra o benchmark do herói
(OpenDota), KDA, relógio, avisos de runas e de stack, falas por voz, simulador em `dev/`.

**Básicos a adicionar**: picks na escolha; itens por fase, situacionais e aviso de ouro; runas conferidas com o patch;
XPM contra benchmark; Roshan por atalho manual (em revisão, ver decisões em aberto); dicas na partida por função,
relógio e eventos.

**Diferenciais**: (1) plano de jogo após a escolha; (2) treinador que lembra dos erros; (3) modo suporte completo;
(4) vozes de pessoas conhecidas; (5) Turbo bem feito; (6) resumo do patch para os heróis do jogador; (7) proteção
contra tilt; (8) desafio do dia.

## Decisões em aberto

Detalhes e recomendações em [docs/diagnostico-e-plano.md](docs/diagnostico-e-plano.md), seção 6.

1. O que fica grátis e o que fica na assinatura.
2. Tecnologia da voz padrão e dos pacotes de voz.
3. Timer de Roshan: o jogo mostra o timer nativo desde o 7.38.
4. Novo nome do app ("Dota Coach Overlay" é próximo demais do concorrente "Dota Coach").
5. Desenho das janelas diante da regra do Overwolf contra overlay persistente (confirmar com o Overwolf).

## Estado atual

- MVP 0.1.0, commit inicial de 24/06/2026. Nunca rodou no Overwolf nem numa partida.
- Diagnóstico de 06/11/2026 em [docs/diagnostico-e-plano.md](docs/diagnostico-e-plano.md). Pontos principais:
  - A leitura do GEP em `background/background.js` não funciona: pede features inexistentes (`match`, `hero`), lê
    eventos como info updates e procura campos que não existem em `me`. Numa partida real o HUD ficaria zerado.
  - O simulador injeta estado pronto no HUD e não testa o `background.js`.
  - Runa de recompensa a cada 3 min no código; são 4 min desde o 7.38.
  - O HUD persistente contraria a regra de compliance do Overwolf.
- Conta de desenvolvedor do Overwolf: **sem whitelist** ainda. Nada roda no Overwolf até a proposta ser aprovada.
- Plano em etapas aguardando aprovação (seção 5 do diagnóstico). Etapa atual: 0 (diagnóstico entregue).

## Fatos verificados que afetam o código

Conferidos em 06/11/2026; fontes no diagnóstico. "Não testado" = documentado, sem prova em partida.

- **GEP**: `kill`, `death`, `assist`, `cs`, `gold`, `gpm`, `xpm`, `hero_leveled_up`, `clock_time_changed`,
  `match_ended` etc. são **eventos** (`onNewEvents`, `data` em texto JSON). `me`, `game`, `roster`, `match_info` são
  **info updates** (`onInfoUpdates2`). Lista oficial de features na documentação do Dota 2.
- **Painel de status do GEP** (`game-events-status.overwolf.com/7314_prod.json`) não lista `gpm`, `xpm`, `gold`,
  `hero_leveled_up`, `daytime_changed`, `ward_purchase_cooldown_changed` nem `hero_item_*`. Não testado se chegam.
- `hero_item_changed` é marcado como não suportado: inventário atual sem fonte confirmada.
- Valores de `roster.players[].role`, `match_info.game_mode` e o formato de `me.hero` divergem entre documentação e
  exemplos. Só a partida de teste resolve.
- **Compliance Overwolf**: sem overlay persistente durante o jogo; overlays em carregamento, pós-partida e entre
  partidas; sem anúncio durante o jogo; app público precisa de janela desktop.
- **OpenDota**: sem chave, 60 chamadas/min e 3.000/dia; com chave, US$ 0,01 por 100 chamadas. Termos de uso
  comercial não encontrados (perguntar antes de depender). Benchmarks são médias da partida inteira.
- **Feeds da Valve** (não documentados, tratar falha de forma visível): `datafeed/patchnoteslist`,
  `datafeed/patchnotes?version=X&language=english|russian|brazilian`, `datafeed/herolist` e `itemlist` com
  `?language=`. Usar os nomes que o feed devolver, sem traduzir por conta própria.
- **Tempos do patch** (7.41f, 15/09/2026): conferir cada valor antes de usar; mudanças desde o 7.37 listadas no
  diagnóstico, seção 3.5.

## Estrutura

```
manifest.json            manifesto Overwolf (janelas, hotkeys, jogo 7314)
background/              controller: detecta o Dota, registra o GEP, consolida o estado
windows/in_game/         HUD transparente
js/constants.js          classId, features do GEP, canais de mensagem
js/benchmarks.js         OpenDota: percentil -> bom/médio/ruim
js/coach.js              tempos e dicas
js/audio.js              voz (speechSynthesis) e sons
dev/                     simulador no navegador (fora do pacote)
docs/                    diagnóstico, plano e notas técnicas
preparar.ps1             preparação do PC de testes (Steam, Dota, Overwolf)
```

## Como trabalhar neste repositório

- Responder em português, de forma objetiva.
- Pesquisar a documentação oficial do Overwolf, do OpenDota e da Valve antes de usar um evento, campo ou endpoint.
  Não inventar nomes. O que não puder ser testado fica marcado "não testado".
- Textos de interface, dicas e falas em arquivos por idioma (`ru`, `en`, `pt-BR`), nunca fixos no código. Texto em
  russo precisa de revisão de falante nativo antes de publicar.
- Tempos de jogo em arquivo de dados por patch e por modo (normal e Turbo), nunca espalhados no código.
- Não usar subagentes; trabalhar direto na sessão.
- Ao terminar cada tarefa: atualizar este arquivo, fazer commit e push.
