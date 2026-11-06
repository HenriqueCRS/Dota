# Proposta de app ao Overwolf (rascunho)

Rascunho de 06/11/2026 para o formulário https://dev.overwolf.com/app-idea-form/ (exige login com conta Overwolf).
A documentação atual não lista os campos do formulário: adapte os blocos abaixo às perguntas que aparecerem.
O texto vai em inglês. Trocar `[APP NAME]` pelo nome escolhido antes de enviar.

Regras que a proposta precisa respeitar (fontes no diagnóstico, seção 3.2):
- App privado ou de uso pessoal não é aprovado: a proposta descreve o app público.
- Monetização só do Overwolf (anúncios, Tebex ou os dois).
- Não citar concorrentes nem copiar nome, UI ou marca de outro app.

---

## App name

[APP NAME]

## Game

Dota 2

## Framework

Overwolf Native.

## Short description

[APP NAME] is a voice-first coaching companion for Dota 2. It helps players improve during and after each match
using only the official game data provided by the Overwolf Game Events Provider, in Russian, English and Brazilian
Portuguese.

## Target audience

Dota 2 players of all skill levels who want to improve, from launch in three languages: Russian, English and
Brazilian Portuguese (interface, tips and voice lines). No single primary country.

## Core features

- Hero draft: pick suggestions during hero selection based on the draft, bans, public hero matchup statistics and the
  heroes the player plays most. No information about other players is shown before the picking phase ends.
- Game plan: once all ten heroes are picked, three short sentences (shown and spoken) about each team's strongest
  phase, threats (for example invisible heroes that call for detection) and the enemy's weak point.
- Timing reminders by voice: runes, neutral stacks and pulls, with a separate timing table for Turbo.
- Performance: last hits, GPM and XPM compared with public per-hero benchmarks, where the data is available.
- Item guidance: item order by game phase and situational items against the enemy heroes.
- Support mode: reminders for wards, detection against invisible heroes and stack/pull timings.
- Post-match coach: after each match the app compares the player's own stats with benchmarks and with previous
  matches, finds repeated mistakes and reminds the player at the right moment in future matches.
- Daily challenge based on the player's weakest area, with a streak counter.
- Patch summary for the player's most played heroes, in the player's language.
- Tilt protection: after two losses in a row, an optional, dismissible suggestion to take a break. It never blocks
  the game or the queue.

## Data sources and fair play

- Live data only from the Overwolf Game Events Provider (Dota 2 Game State Integration). The app does not read game
  memory, game files or network traffic.
- Only information the player can already see in the game. Nothing about enemy positions or hidden data.
- Other players' names and Steam IDs are never shown before the picking phase ends.
- Public statistics from the OpenDota API and public data from the Dota 2 website (hero, item and patch lists).
- Match history is stored locally on the player's computer.

## Windows and in-game experience

- A desktop window for settings, post-match analysis, history, daily challenge, patch summary and ads.
- During hero selection, strategy time and loading: draft suggestions and the game plan.
- During active gameplay: voice reminders as the main channel, plus short notifications that disappear by
  themselves. A stats panel appears only while the player holds a hotkey. No persistent overlay and no ads during
  gameplay.

## Monetization

Overwolf ads in the desktop window, shown between matches or when the player opens the app. A Tebex subscription
removes ads and unlocks premium features (post-match coach, game plan, daily challenge, full support mode and optional
licensed voice packs in Brazilian Portuguese). The core features stay free.

## Question for the DevRel team

The compliance guidelines say that apps with persistent overlays during gameplay will not be approved. Could you
confirm that the in-game design above is acceptable for Dota 2: voice reminders, short self-dismissing notifications,
and a stats panel that is visible only while a hotkey is held? If not, what would you recommend?

## Developer

Solo developer based in Brazil. [Contato: preencher]
