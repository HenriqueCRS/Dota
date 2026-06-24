// Coach: regras de timing e dicas contextuais.
// Recebe o estado a cada atualizacao e dispara "cues" (dicas) via callback.
// Cada cue: { id, text, voice, sound, priority }.
//   text  -> texto exibido no HUD
//   voice -> frase falada (TTS pt-BR); se ausente, usa text
//   sound -> id de som curto a tocar antes da fala (opcional)
//   priority -> 'info' | 'warn' | 'alert' (cor/realce no HUD)
//
// Os timings seguem a convencao de patch recente do Dota 2 e ficam centralizados
// aqui para facilitar ajuste quando a Valve muda os intervalos.

const Coach = (() => {
  // Antecedencia (s) com que avisamos antes do evento, para dar tempo de reagir.
  const LEAD = 8;

  // Configuracao de timings (em segundos de jogo).
  const TIMINGS = {
    bountyEvery: 3 * 60,     // runas de boa-fortuna: 0:00 e a cada 3 min
    powerStart: 6 * 60,      // runas de poder comecam por volta de 6:00
    powerEvery: 2 * 60,      // ... e voltam a cada 2 min
    stackSecond: 53          // empilhar campo neutro: avisar perto de xx:53
  };

  let firedThisMatch = new Set();   // ids de eventos unicos ja disparados
  let lastTick = -9999;
  let lastLhWarnAt = -9999;         // throttle do aviso de farm

  function reset() {
    firedThisMatch = new Set();
    lastTick = -9999;
    lastLhWarnAt = -9999;
  }

  // Evita disparar o mesmo evento (mesmo minuto) mais de uma vez.
  function once(id, emit, cue) {
    if (firedThisMatch.has(id)) { return; }
    firedThisMatch.add(id);
    emit(cue);
  }

  // Proximo multiplo de "every" estritamente apos "t".
  function nextMultiple(t, every, start) {
    const base = start || 0;
    if (t < base) { return base; }
    return Math.ceil((t - base + 1) / every) * every + base;
  }

  // ----- Regras de timing -----
  function checkTimings(t, emit) {
    // Runas de boa-fortuna (bounty)
    const nextBounty = nextMultiple(t, TIMINGS.bountyEvery, 0);
    if (nextBounty - t === LEAD) {
      once(`bounty_${nextBounty}`, emit, {
        id: `bounty_${nextBounty}`,
        text: `Runa de boa-fortuna em ${LEAD}s`,
        voice: 'Runa de boa-fortuna chegando',
        sound: 'ping',
        priority: 'warn'
      });
    }

    // Runas de poder
    if (t >= TIMINGS.powerStart - LEAD) {
      const nextPower = nextMultiple(t, TIMINGS.powerEvery, TIMINGS.powerStart);
      if (nextPower - t === LEAD) {
        once(`power_${nextPower}`, emit, {
          id: `power_${nextPower}`,
          text: `Runa de poder em ${LEAD}s`,
          voice: 'Runa de poder chegando',
          sound: 'ping',
          priority: 'warn'
        });
      }
    }

    // Empilhar campo neutro (stack) perto de xx:53
    const sec = ((t % 60) + 60) % 60;
    if (t > 60 && sec === TIMINGS.stackSecond - LEAD) {
      const minute = Math.floor(t / 60) + 1;
      once(`stack_${minute}`, emit, {
        id: `stack_${minute}`,
        text: 'Hora de empilhar (stack)',
        voice: 'Empilhe o campo neutro agora',
        sound: 'tick',
        priority: 'info'
      });
    }
  }

  // ----- Dicas baseadas em desempenho (benchmark) -----
  // ratings: { gpm: {tier}, lh: {tier} } vindos do modulo Benchmarks.
  function checkPerformance(t, ratings, emit) {
    if (!ratings || t < 5 * 60) { return; } // so a partir de ~5 min ha base
    if (ratings.lh && ratings.lh.tier === 'bad' && t - lastLhWarnAt > 120) {
      lastLhWarnAt = t;
      emit({
        id: `lhwarn_${Math.floor(t)}`,
        text: 'Last hits abaixo do esperado para o heroi',
        voice: 'Seu last hit esta baixo, foque em farmar',
        sound: 'warn',
        priority: 'alert'
      });
    }
  }

  // Chamado pela HUD a cada atualizacao de estado.
  // state: estado do jogador; ratings: avaliacao de benchmark; emit: callback.
  function update(state, ratings, emit) {
    const t = Math.floor(state.clockTime || 0);
    if (t === lastTick) {
      checkPerformance(t, ratings, emit);
      return;
    }
    lastTick = t;
    if (t >= 0) { checkTimings(t, emit); }
    checkPerformance(t, ratings, emit);
  }

  return { update, reset };
})();
