// Simulador de partida para o harness de teste.
// Avanca o relogio, sobe ouro e last hits e injeta o estado via MockOW.send,
// imitando o que o background.js faria a partir do GEP.

(function () {
  const HERO = 'npc_dota_hero_juggernaut'; // troque para testar outros herois

  // "Qualidade" do farm simulado. Ajuste para ver os badges mudarem de cor:
  //   gpmRate alto + lhRate alto  -> BOM (verde)
  //   valores baixos              -> RUIM (vermelho)
  const gpmRate = 9;   // ouro ganho por segundo (~540/min)
  const lhRate = 0.13; // last hits por segundo (~7.8/min)

  const state = {
    inMatch: true, matchState: 'GAME_IN_PROGRESS', heroName: HERO,
    level: 1, gold: 0, lastHits: 0, denies: 0,
    kills: 0, deaths: 0, assists: 0, clockTime: 0
  };

  // Anuncia o heroi (dispara o carregamento do benchmark no HUD).
  MockOW.send(MSG.HERO, { heroName: HERO });

  let speed = 30; // ticks de jogo por segundo real (acelera a simulacao)

  setInterval(() => {
    for (let i = 0; i < speed; i++) {
      state.clockTime += 1;
      state.gold = Math.round(state.gold + gpmRate);
      if (Math.random() < lhRate) { state.lastHits += 1; }
      state.level = Math.min(30, 1 + Math.floor(state.clockTime / 60));
      if (state.clockTime % 90 === 0) { state.kills += 1; }
    }
    MockOW.send(MSG.STATE, { ...state });
  }, 1000);

  // Expor controles simples no console: window.sim.reset(), sim.fast(n)
  window.sim = {
    reset: () => MockOW.send(MSG.RESET, {}),
    fast: (n) => { speed = n; },
    state: () => state
  };
})();
