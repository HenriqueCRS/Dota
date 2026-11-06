# Diagnóstico e plano

Data: 06/11/2026. Base: commit `a28bba6` (MVP 0.1.0, 24/06/2026). Nenhum código foi alterado nesta etapa.
Tudo marcado "não testado" depende do Overwolf com conta liberada (whitelist) e de uma partida real.

---

## 1. Resumo

1. **O MVP não leria nada de uma partida real.** Os nomes de features e a forma de leitura em `background/background.js`
   não batem com a documentação do GEP: ouro, last hits, KDA, nível e relógio são eventos (`onNewEvents`, com `data` em
   texto JSON), e o código os procura nos info updates. Em partida real o HUD ficaria em `0:00` com zeros e sem
   benchmark. O simulador em `dev/` não percebe isso porque injeta o estado pronto direto no HUD, sem passar pelo
   `background.js`.
2. **Parte dos dados prometidos pode não existir.** O painel de status oficial do GEP do Dota 2
   (`game-events-status.overwolf.com/7314_prod.json`) lista 19 features ativas e **não** inclui `gpm`, `xpm`, `gold`,
   `hero_leveled_up`, `daytime_changed`, `ward_purchase_cooldown_changed` nem os eventos de item. A documentação lista
   todas. GPM, XPM, aviso de ouro para o próximo item e aviso de wards na loja dependem delas. Confirmar numa partida
   antes de implementar.
3. **As regras do Overwolf proíbem overlay persistente durante o jogo.** O HUD atual fica fixo na tela a partida
   inteira. Isso muda o desenho do produto (seção 4.1) e precisa ser confirmado com o Overwolf na proposta.
4. **O próprio Dota já mostra o timer de Roshan** desde o 7.38 (ícone perto do minimapa com "morto", "talvez vivo" e
   os dois tempos) e o do Tormentor desde o 7.40. O timer manual de Roshan perde boa parte do valor.
5. **Tempo errado no código:** a runa de recompensa passou de 3 para 4 minutos no 7.38; `js/coach.js` usa 3.

---

## 2. Diagnóstico do código existente

### 2.1 `js/constants.js` e `background/background.js` (leitura do GEP)

| # | Problema | Onde | Efeito |
|---|----------|------|--------|
| 1 | Pede as features `match` e `hero`, que não existem no GEP do Dota 2. A documentação não diz se `setRequiredFeatures` falha inteira com um nome inválido. | `js/constants.js:8-22` | Pode impedir o registro de todas as features. Não testado. |
| 2 | `gold`, `cs`, `kill`, `death`, `assist`, `hero_leveled_up` e `clock_time_changed` são **eventos**; o código os lê em `onInfoUpdates2`. | `background.js:106-121` | Relógio, ouro, last hits e KDA ficam em zero. Nenhum aviso de tempo dispara. |
| 3 | `match_state` vem na categoria `game` (`info.game.match_state`); o código lê `game_info`. | `background.js:97-99` | Estado da partida nunca é lido por esse caminho. |
| 4 | A categoria `me` traz `hero`, `team`, `steam_id` e `mmr`. Não existem `hero_name`, `gold` nem `level`. | `background.js:101-108` | Herói nunca detectado, benchmark nunca carrega. |
| 5 | O exemplo oficial de `me.hero` é `keeper_of_the_light`, sem o prefixo `npc_dota_hero_` que o índice do OpenDota usa. | `js/benchmarks.js:22`, `:30` | Mesmo com o campo certo, o herói não seria encontrado. Não testado. |
| 6 | O campo de `hero_leveled_up` é `hero_level`; o código lê `level`. | `background.js:119` | Nível não atualiza. |
| 7 | `data` dos eventos chega como texto JSON e não é convertido; os eventos repassados ao HUD são ignorados por ele. | `background.js:127-145`, `in_game.js:36-38` | Kill, morte e assistência não chegam a lugar nenhum. |
| 8 | A partida é reiniciada duas vezes (`HERO_SELECTION` e `PRE_GAME`). | `background.js:131-136` | Menor; some com a reescrita. |
| 9 | `roster` é pedido e não usado; `gpm` e `xpm` não são pedidos. | `js/constants.js` | Confirmado o que você já tinha visto. |
| 10 | Nova tentativa de `setRequiredFeatures` a cada 2 s, sem limite, inclusive para erros definitivos. A documentação diz que clientes a partir de 0.311.0.6 aguardam o provider internamente; o manifest exige só 0.198.0. | `background.js:73-82`, `manifest.json:7` | Repetição inútil em erros como "Not in a game". |

### 2.2 `windows/in_game/` (HUD)

| # | Problema | Onde | Efeito |
|---|----------|------|--------|
| 1 | GPM calculado pelo ouro atual, que cai a cada compra. | `in_game.js:72` | GPM errado e badge enganoso. |
| 2 | O benchmark do OpenDota é a média por minuto da partida inteira (ex.: Juggernaut, mediana de 656 GPM e 9,3 LH/min). Comparar o ritmo dos primeiros minutos com isso classifica quase todo início de jogo como "RUIM". | `in_game.js:83-89`, `coach.js:93` | Avaliação injusta no começo; o aviso de farm baixo dispara à toa. Precisa de referência por minuto de jogo. |
| 3 | Alternar o clique lê `res.window.clickthrough`, campo que não existe em `WindowInfo`; sempre aplica `InputPassThrough` e nunca chama `removeWindowStyle`. | `in_game.js:125-135` | O overlay nunca fica clicável; o botão de mudo é inalcançável. |
| 4 | Hotkey `toggle_overlay` (`action-type: toggle`) sem tratamento. A documentação diz que o tipo toggle não funciona direito com janela transparente. | `manifest.json:44-49` | `Ctrl+Shift+D` provavelmente não faz nada. Não testado. |
| 5 | Janela fixa de 1920x1080 na posição 0,0. | `manifest.json:32-33` | Desalinha em outras resoluções. |
| 6 | Textos fixos em português, sem acentos, espalhados em HTML e JS; nome do herói derivado do nome interno. | `in_game.html`, `in_game.js:148-151`, `coach.js`, `audio.js` | Bloqueia os três idiomas. |
| 7 | Botão de mudo usa emoji (`&#128266;`). | `in_game.html:15` | Trocar por ícone. |
| 8 | O HUD fica visível a partida inteira. | `manifest.json`, `in_game.css` | Fora das regras do Overwolf (seção 3.2). |

### 2.3 `js/coach.js` (tempos)

| # | Problema | Onde |
|---|----------|------|
| 1 | Runa de recompensa a cada 3 min; desde o 7.38 são 4 min. | `coach.js:18` |
| 2 | Runa de poder (6:00, a cada 2 min) e stack em xx:53: nada mudou nas notas de 7.37 a 7.41f, mas também nada confirma. Conferir. | `coach.js:19-21` |
| 3 | Faltam runas de água, Wisdom Shrines (a cada 7 min desde o 7.38; contagem reversa quando contestado desde o 7.41), Lotus Pools, Tormentor (primeiro aos 20:00 desde o 7.39) e dia/noite. | `coach.js` |
| 4 | O aviso só dispara se o relógio cair exatamente no segundo esperado; se um segundo for pulado, o aviso se perde. | `coach.js:52`, `:65`, `:78` |
| 5 | Sem tabela de tempos do Turbo. | `coach.js` |

### 2.4 `js/audio.js`

- Só procura voz em português. O funcionamento do `speechSynthesis` dentro do Overwolf não é documentado; a voz russa
  depende do pacote de idioma instalado no Windows. Não testado.
- A pasta `assets/sounds/` não existe no repositório: os sons nunca tocam (a falha é silenciosa, `audio.js:47`).

### 2.5 `dev/` (simulador)

- `simulator.js:33` manda o estado já pronto para a janela do HUD. O `background.js` e o formato do GEP ficam fora do
  teste, que é justamente onde estão os erros. O mock cobre só o que `in_game.js` usa.

### 2.6 `manifest.json`, `README.md`, `preparar.ps1`

- **Nome "Dota Coach Overlay"**: próximo demais do concorrente "Dota Coach". As regras do Overwolf proíbem copiar
  funcionalidade, UI/UX ou marca de outros apps. Trocar o nome antes da proposta.
- **Sem janela desktop**: app público precisa de ao menos uma janela desktop visível, e os anúncios ficam em janelas
  do app entre partidas.
- **README:3** diz "plataforma sancionada pela Valve, sem risco de VAC/ban". Reescrever conforme a seção 3.6.
- **`preparar.ps1`**: útil para o seu PC de testes. Para o usuário final, a documentação do GEP indica conferir o
  `-gamestateintegration` pelo próprio app (`overwolf.games.getGameInfo()` → `ProcessCommandLine`) e avisar na tela.

### 2.7 O que está certo e continua

- Detecção do Dota (`classId` 7314, `id / 10`) e `game_events: [7314]`.
- Separação background → janela via `overwolf.windows.sendMessage`.
- Interpolação de percentil em `benchmarks.js`; os endpoints `/heroes` e `/benchmarks` existem.
- Fila de falas sem sobreposição em `audio.js`.

---

## 3. Fatos verificados em 06/11/2026

### 3.1 GEP do Dota 2: documentação x painel de status

Fontes: documentação do GEP e `https://game-events-status.overwolf.com/7314_prod.json` (lista as features que o
Overwolf monitora em produção, com exemplos de payload).

| Feature | Na documentação | No painel de status | Uso previsto |
|---------|-----------------|---------------------|--------------|
| `clock_time_changed` (evento, a cada segundo) | sim | sim | todos os tempos |
| `kill`, `death`, `assist`, `cs` (eventos) | sim | sim | KDA, last hits, histórico de mortes |
| `match_ended` (`winner`: radiant/dire) | sim | sim | proteção contra tilt, histórico |
| `game_state_changed`, `match_state_changed`, `game_state` | sim | sim | ciclo da partida |
| `me` (`hero`, `team`, `steam_id`, `mmr`) | sim | sim | herói, time, conta do jogador |
| `roster` (`players`, `draft`, `bans`) | sim | sim | picks, plano de jogo, função |
| `match_info` (`game_mode`, `pseudo_match_id`) | sim | sim | Turbo |
| `damage`, `counters`, `party`, `hero_ability_*`, `hero_attributes_skilled` | sim | sim | - |
| `gpm`, `xpm` | sim | **não** | GPM e XPM ao vivo |
| `gold` (`gold`, `gold_reliable`, `gold_unreliable`) | sim | **não** | aviso de ouro para o próximo item |
| `hero_leveled_up` | sim | **não** | nível |
| `daytime_changed` | sim | **não** | "cuidado à noite" (dá para calcular pelo relógio, menos Night Stalker) |
| `ward_purchase_cooldown_changed` | sim | **não** | modo suporte: wards na loja |
| `hero_item_*` | `hero_item_changed` marcado como não suportado | **não** | inventário |
| `hero_pool` | sim (só Single Draft e Random Draft) | **não** | - |

Divergências que só o teste resolve:
- `roster.players`: a documentação descreve `steamId`, `name`, `teamId`, `heroId`, `role`, `index`, `team_slot`,
  `rank`, `medal_name`, `medal_stars`; o exemplo do painel traz `steamId`, `name`, `pickConfirmed`, `hero` (nome),
  `team`, `role` (vazio) e `player_index`.
- `role`: 1 Safelane, 2 Offlane, 4 Midlane, 8 Other, 16 HardSupport; "outros valores devem ser ignorados". Não há valor
  próprio para a posição 4. No exemplo do painel o campo vem vazio (partida com bots).
- `game_mode`: o exemplo da documentação é `GameMode_Turbo`; o do painel é `autochess`.
- `gpm`: o exemplo da documentação (363605184) é implausível.
- `death`: a documentação descreve `{deaths}`; o exemplo do painel é só `12`.
- `steamId` e `name` do roster ficam vazios até `STRATEGY_TIME` (limitação da Valve).
- O exemplo do painel tem jogadores bot no roster: o GEP funciona em partida contra bots.

### 3.2 Regras do Overwolf

- **Whitelist**: só contas liberadas carregam apps fora da loja. A liberação vem da aprovação da proposta de app
  (em inglês, pergunta público e monetização; resposta em até 4 dias úteis). App só de uso pessoal não é aprovado.
- **Compliance de overlay** (página "App Compliance for In-Game Overlays and Ads"):
  "Apps that display persistent overlays during gameplay will not be approved"; "Avoid displaying overlays during
  active gameplay"; overlays só em tela de carregamento, após a partida ou entre partidas; fáceis de fechar; sem
  cobrir a UI do jogo. Sem anúncios durante o jogo ativo.
- **Dota 2**: nomes e Steam IDs dos outros jogadores nunca podem aparecer antes do fim da escolha. O próprio nome pode.
- **Conduta**: não copiar funcionalidade, UI/UX ou marca de outros apps; não dar vantagem injusta; seguir os termos
  do jogo.
- **Monetização**: anúncios do Overwolf, assinatura via Tebex, ou os dois; terceiros proibidos; desde 01/11/2026 só
  aprovam apps com essa monetização; distribuição só pela loja.
- **Tebex**: taxa de 15% (10% Overwolf, 5% Tebex) mais o gateway; a Tebex é merchant of record (impostos, fraude,
  chargeback); não converte moeda automaticamente (um pacote por moeda). A página de compliance da Tebex diz que há
  restrições com regimes sancionados, sem publicar lista. Nenhuma política específica para a Rússia encontrada.
- **Pagamento**: NET 60, primeira semana do mês, mínimo de US$ 200 líquidos, Payoneer, só em dólar.
- **APIs úteis**: `overwolf.settings.language.get` e `onLanguageChanged` (código ISO de duas letras);
  hotkeys `toggle` ou `custom`, com a opção `hold` (evento `onHold` na descida e na subida da tecla);
  `overwolf.windows.removeWindowStyle` existe; `WindowInfo` não tem campo `clickthrough`.
- **Voz**: nenhuma documentação do Overwolf sobre `speechSynthesis`. Não testado.

### 3.3 OpenDota

- **Limites** (lidos em `/api/metadata` e nos cabeçalhos `X-Rate-Limit-Remaining-*`): sem chave, 60 chamadas por
  minuto e 3.000 por dia; com chave, US$ 0,01 a cada 100 chamadas, 3.000 por minuto, exige cartão; respostas 404, 429
  e 500 não são cobradas.
- **Uso comercial**: nenhum termo encontrado. O código do OpenDota é MIT, mas isso não cobre os dados. Perguntar aos
  mantenedores antes de depender dele.
- **Endpoints confirmados na especificação** (OpenAPI 3.0.3, versão 31.1.1):
  - `/benchmarks?hero_id=&bracket=1..8&role=core|support`: percentis de 0,1 a 0,99 de GPM, XPM, LH/min, KDA/min,
    dano e cura por minuto. Média da partida inteira, não por minuto de jogo.
  - `/heroes/{hero_id}/matchups`: `games_played` e `wins` contra cada herói. No exemplo do Juggernaut, cerca de 200
    jogos por par; a origem da amostra não é documentada.
  - `/heroes/{hero_id}/durations`: `games_played` e `wins` por faixa de 300 s de duração.
  - `/heroes/{hero_id}/itemPopularity`: itens por fase (início, até 10 min, 10-25 min, após 25 min), de partidas
    profissionais.
  - `/players/{account_id}/heroes`, `/matches`, `/recentMatches`, `/wl`, `/matches/{match_id}`,
    `POST /request/{match_id}` (análise do replay; conta como 10 chamadas), `/scenarios/itemTimings`,
    `/scenarios/laneRoles`, `/heroStats`, `/constants/{resource}`.
- **Dados do jogador**: exigem a opção "Expose Public Match Data" ligada no Dota; só partidas jogadas depois de
  ligar aparecem (FAQ do OpenDota). O GEP entrega `me.steam_id` (SteamID64); o OpenDota usa o account_id de 32 bits
  (SteamID64 menos 76561197960265728).

### 3.4 Feeds da Valve (não documentados)

- `https://www.dota2.com/datafeed/patchnoteslist?language=...`: 118 versões; a última é a 7.41f, de 15/09/2026.
- **Notas de cada versão**: `https://www.dota2.com/datafeed/patchnotes?version=7.41f&language=brazilian` (também
  `english` e `russian`). Respondeu nos três idiomas, com o texto traduzido. Estrutura: `general_notes`, `items`,
  `neutral_items`, `heroes` (`hero_id`, `hero_notes`, `abilities`, `talent_notes`) e `neutral_creeps`.
- `herolist` e `itemlist` com `?language=`: trazem `name_loc` e `name_english_loc`. Em russo os itens consultados
  vieram em inglês, como você observou.

### 3.5 Mudanças de tempos nas notas oficiais (7.37 a 7.41f)

- **7.38**: runa de recompensa de 3 para 4 min; Wisdom Runes trocadas por Wisdom Shrines (ativam a cada 7 min);
  Roshan com dois covis, alternando pelo ciclo dia/noite a partir dos 15:00; ícone nativo de Roshan com os tempos
  (8 a 11 min); Tormentor alternando de lado pelo dia/noite (na época, primeiro aos 15:00, ou 7:30 no Turbo).
- **7.39**: primeiro Tormentor de 15:00 para 20:00 (o valor do Turbo não aparece); tempo de pull dos acampamentos
  alagados reduzido.
- **7.40**: timer nativo do Tormentor perto do minimapa; runa de velocidade sempre 22 s.
- **7.41**: Wisdom Shrines e Lotus Pools com contagem reversa quando contestados; mudanças nos acampamentos de pull.
- **Não aparecem nessas notas** (conferir em notas mais antigas e em jogo): runas de poder e de água, nascimento e
  stack de neutros, duração de dia e noite, estoque de wards e os valores do Turbo depois do 7.38.

### 3.6 Segurança da conta (para o README)

O GEP lê a integração oficial de estado do jogo (Game State Integration, ativada por `-gamestateintegration`), não a
memória do cliente. Em fevereiro de 2023 a Valve baniu mais de 40 mil contas que usavam programas que liam a memória
do jogo. Não há como prometer risco zero; o texto deve dizer o que o app lê e o que não lê.

---

## 4. Impacto no produto

### 4.1 Desenho das janelas (compliance)

Proposta, a confirmar com o Overwolf na proposta do app:
- **Durante a partida**: voz como canal principal; avisos curtos que somem sozinhos; painel de números só enquanto o
  jogador segura uma tecla (hotkey `hold`). Nada fixo na tela.
- **Escolha, estratégia e carregamento**: sugestões de pick e plano de jogo.
- **Pós-partida e entre partidas**: janela desktop com análise, histórico, desafio do dia, resumo do patch,
  configurações e anúncios.

Risco: as regras não dizem se avisos curtos ou painel por hotkey contam como "overlay durante o jogo". O Dota Coach
mostra timers dentro da partida, mas não se sabe se tem acordo próprio. Perguntar por escrito.

### 4.2 Recursos que dependem do teste do GEP

| Recurso | Depende de | Se não existir |
|---------|-----------|----------------|
| GPM e XPM ao vivo | `gpm`, `xpm` | Ao vivo só last hits, KDA e nível; GPM e XPM depois da partida pelo OpenDota. |
| Aviso de ouro para o próximo item | `gold` e inventário | O jogador marca o item comprado, ou o aviso sai do plano. |
| Wards disponíveis na loja | `ward_purchase_cooldown_changed` | Sem esse aviso (não há outro dado do estoque). |
| Nível | `hero_leveled_up` | Estimar pela contagem de `hero_ability_skilled` e `hero_attributes_skilled`. Não testado. |
| Itens principais com horário | inventário | Só depois da partida, pelo OpenDota (compras detalhadas só em partida analisada). |
| Função do jogador | `roster.players[].role` | O jogador escolhe a função. |
| Turbo | `match_info.game_mode` | O jogador marca o modo. |

### 4.3 Roshan

O jogo já mostra quando Roshan morreu, quando talvez esteja vivo e quando com certeza está. O timer manual só
acrescentaria voz ("Roshan pode estar vivo em 1 minuto"), e ainda exige apertar a tecla. Ver decisão 6.4.

---

## 5. Plano em etapas

Cada etapa termina com commit, push e atualização do `CLAUDE.md`.

### Etapa 0. Desbloqueio administrativo (em paralelo, depende de você)
- Escolher um novo nome para o app.
- Enviar a proposta ao Overwolf. Eu redijo o texto em inglês: público geral em russo, inglês e português do Brasil;
  monetização com anúncios e Tebex; pergunta explícita sobre avisos curtos, voz e painel por hotkey durante a partida.
- Pedir ao OpenDota as condições de uso comercial (eu redijo).
- Minha parte: rascunhos da proposta e do pedido ao OpenDota, e o README reescrito (seção 3.6).

### Etapa 1. Simulador fiel ao GEP e coleta de dados reais (destrava os testes)
1. Mock de `overwolf.games.events` (`setRequiredFeatures`, `onInfoUpdates2`, `onNewEvents`), de `overwolf.games` e da
   troca de mensagens entre janelas, alimentando o `background.js` com payloads no formato oficial. Página de teste
   rodando background e HUD juntos.
2. Correção mínima da leitura do GEP no `background.js` (itens 1 a 7 da seção 2.1), só o necessário para a partida de
   teste fazer sentido.
3. Modo diagnóstico: grava todos os payloads crus, a lista `supportedFeatures` devolvida pelo Overwolf e a lista de
   vozes do `speechSynthesis`, com exportação para arquivo.
4. **Partida contra bots (você)**, com roteiro: All Pick e Turbo (se o lobby com bots permitir), anotar quais
   features chegam, o formato de `me.hero`, os campos e a `role` do roster, os valores de `game_mode`, o
   `match_ended`, as vozes disponíveis, as hotkeys e o clique no overlay em tela cheia e em janela sem borda.
5. Os payloads gravados viram fixtures do simulador.

Saída: tabela "documentação x real" no `CLAUDE.md` e decisão sobre os itens da seção 4.2.

### Etapa 2. Base correta
- Idiomas: `locales/ru.json`, `en.json`, `pt-BR.json` com chaves de frase; nomes de heróis e itens pelos feeds da
  Valve, com cache; idioma inicial pelo `overwolf.settings.language`, com troca manual.
- Áudio: cada frase falada é uma chave; um pacote de voz é uma pasta de áudios por chave com manifesto (idioma,
  autor, versão); se faltar a frase, usa a voz padrão. Seletor mostra só os pacotes do idioma escolhido.
- Tempos: arquivo de dados por patch e por modo (normal e Turbo), com a runa de recompensa corrigida e disparo por
  janela de tempo (tolerante a segundo pulado).
- GPM e XPM pelos eventos, se existirem; referência por minuto de jogo em vez da média da partida inteira.
- Janelas conforme a seção 4.1, com clique no overlay corrigido e janela desktop.

### Etapa 3. Recursos básicos
1. Picks: roster (draft e bans) + `/heroes/{id}/matchups` + `/players/{id}/heroes` do próprio jogador. Só heróis,
   nunca nomes de outros jogadores antes do fim da escolha.
2. Itens: ordem por fase (`itemPopularity`, que vem de partidas profissionais; avaliar se serve) e itens situacionais
   por lista própria revisada a cada patch. Aviso de ouro conforme a seção 4.2.
3. Runas: tabela da Etapa 2 conferida em jogo.
4. XP: XPM contra o benchmark, como o GPM.
5. Roshan: conforme a decisão 6.4.
6. Dicas na partida (smoke, wards, agrupar, farmar, empurrar, recuar, noite) por função, relógio e eventos.

### Etapa 4. Diferenciais (ordem sugerida por dependência e risco)
1. Turbo (5): corrige a base; depende do valor real de `game_mode`.
2. Proteção contra tilt (7): `match_ended.winner` + `me.team`, ambos no painel de status.
3. Treinador que lembra (2) e desafio do dia (8): histórico local por partida; OpenDota como complemento.
4. Plano de jogo (1): `durations` + `matchups` + lista própria (heróis invisíveis etc.).
5. Resumo do patch (6): feeds `patchnoteslist` e `patchnotes`, com erro visível se falharem.
6. Modo suporte (3): depende de `ward_purchase_cooldown_changed`; mapa de wards como conteúdo fixo por patch.
7. Vozes (4): a arquitetura sai na Etapa 2; nesta etapa, o roteiro de gravação gerado a partir das chaves. Nada de
   conteúdo de streamer antes do contrato.

### Etapa 5. Monetização e publicação
Anúncios e Tebex, página da loja nos três idiomas, revisão do russo por falante nativo, retorno do OpenDota e envio
ao QA do Overwolf.

---

## 6. Decisões em aberto

### 6.1 O que fica grátis e o que fica na assinatura

| Opção | Prós | Contras |
|-------|------|---------|
| **A. Base completa grátis com anúncios; assinatura tira anúncios e libera plano de jogo, treinador que lembra, desafio do dia, modo suporte completo e pacotes de voz** | Compete com o Dota Coach, que é grátis com anúncios; quem não consegue pagar (Rússia, se o Tebex falhar) ainda gera receita com anúncio; os diferenciais são o motivo de assinar | Menos pressão para assinar |
| B. Grátis mínima (tempos e benchmark), resto pago | Mais pressão para assinar | Menos downloads; base russa sem pagamento vira só custo |
| C. A ou B com teste grátis da assinatura por algumas partidas | Mostra o valor dos diferenciais | Suporte a teste grátis no Tebex não confirmado |

Recomendação: A. Proteção contra tilt e Turbo grátis em qualquer opção (bem-estar e correção da base). Referências de
preço: Lite Coach US$ 1,99/mês; Pro Coach US$ 5/mês.

### 6.2 Tecnologia da voz padrão (russo, inglês e português)

| Opção | Prós | Contras |
|-------|------|---------|
| A. Voz do navegador (`speechSynthesis`, atual) | Sem custo; fala qualquer nome | Funcionamento no Overwolf não documentado; depende das vozes instaladas no Windows; qualidade robótica |
| B. Áudios gerados antes por um serviço de voz sintética, para todas as frases e nomes | Qualidade igual para todos; funciona sem internet; usa a mesma arquitetura dos pacotes | Custo de geração; conferir a licença do serviço para distribuição comercial; gerar de novo a cada herói ou item novo |
| **C. Híbrido: B para frases e nomes, A para o que faltar** | Qualidade de B com cobertura de A | Duas vias de áudio para manter |

Recomendação: C.

### 6.3 Pacotes de voz de streamers (só português)

O número de gravações depende de quantas frases levam nome. Exemplo: 10 frases com herói (127 heróis) e 5 com item
(cerca de 60 itens relevantes) dariam 1.270 + 300 = 1.570 gravações por streamer, além das frases fixas.

| Opção | Prós | Contras |
|-------|------|---------|
| 1. Gravar tudo | Melhor qualidade | Custo e tempo altos; cada herói novo exige nova sessão |
| **2. Montar com pedaços** (frase gravada + nome gravado à parte, cerca de 190 nomes) | Volume viável; herói novo é uma gravação curta | Emenda audível; concordância ("o"/"a"); mitigar escrevendo frases com o nome isolado no fim ("Cuidado: Pudge") |
| 3. Clonar a voz com IA | Cobre tudo, inclusive heróis futuros | Exige autorização escrita e contrato com escopo, revogação e remuneração; risco de imagem; termos do fornecedor; voz é dado pessoal (LGPD). Nada implementado antes do contrato |

Recomendação: 2, com as frases mais frequentes gravadas inteiras e a voz padrão para o que faltar. Clonagem só se
o contrato permitir.

### 6.4 Roshan

Manter o timer manual só como lembrete por voz, ou tirar do plano, já que o jogo mostra o timer desde o 7.38.

### 6.5 Nome do app

Precisa sair antes da proposta ao Overwolf.

---

## 7. Fontes

- GEP Dota 2: https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/dota-2/
- Status do GEP: https://game-events-status.overwolf.com/7314_prod.json
- API de eventos: https://dev.overwolf.com/ow-native/reference/games/events/
- Compliance de overlays e anúncios: https://dev.overwolf.com/ow-native/guides/game-compliance/overview/
- Compliance Dota 2: https://dev.overwolf.com/ow-native/guides/game-compliance/dota-2/
- Fase 1 (proposta): https://dev.overwolf.com/ow-native/getting-started/project-roadmap
- Fase 2 (desenvolvimento): https://dev.overwolf.com/ow-native/getting-started/develop-your-idea
- Ambiente de desenvolvimento: https://dev.overwolf.com/ow-native/getting-started/onboarding-resources/setting-up-dev-environment
- Janelas in-game: https://dev.overwolf.com/ow-native/guides/product-guidelines/app-screen-behavior/in-game-overlays/
- API de janelas: https://dev.overwolf.com/ow-native/reference/windows/ow-windows/
- Hotkeys: https://dev.overwolf.com/ow-native/guides/product-guidelines/app-screen-behavior/hot-key-and-settings/
- Idioma: https://dev.overwolf.com/ow-native/reference/settings/language-api/
- Monetização: https://dev.overwolf.com/ow-native/monetization/overview
- Assinaturas: https://dev.overwolf.com/ow-native/monetization/subscriptions/overview e
  https://dev.overwolf.com/ow-native/monetization/subscriptions/implementation
- Tebex para Overwolf: https://docs.tebex.io/developers/overwolf-apps
- Tebex, sanções: https://www.tebex.io/legal/aml
- OpenDota, especificação: https://api.opendota.com/api ; limites: https://api.opendota.com/api/metadata ;
  preço: https://github.com/odota/web/blob/master/src/components/Api/Api.tsx
- OpenDota, FAQ: https://blog.opendota.com/2014/08/01/faq/
- Valve: https://www.dota2.com/datafeed/patchnoteslist?language=english ,
  https://www.dota2.com/datafeed/patchnotes?version=7.41f&language=brazilian ,
  https://www.dota2.com/datafeed/herolist?language=english , https://www.dota2.com/datafeed/itemlist?language=english
- Banimento de 2023: https://www.pcgamer.com/valve-lured-40000-dota-cheaters-into-a-trap-before-banning-them-in-one-day
