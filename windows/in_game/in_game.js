// HUD in-game.
// Recebe o estado do background, atualiza os indicadores, avalia o desempenho
// contra os benchmarks do heroi e dispara as dicas (visuais + audio).

const el = {
  hero: document.getElementById('hero'),
  clock: document.getElementById('clock'),
  mute: document.getElementById('mute'),
  nwValue: document.getElementById('nw-value'),
  nwBadge: document.getElementById('nw-badge'),
  lhValue: document.getElementById('lh-value'),
  lhBadge: document.getElementById('lh-badge'),
  kda: document.getElementById('kda-value'),
  lvl: document.getElementById('lvl-value'),
  tips: document.getElementById('tips')
};

let lastState = null;

AudioCues.init();

// ---------------------------------------------------------------------------
// Recebimento de mensagens do background
// ---------------------------------------------------------------------------
overwolf.windows.onMessageReceived.addListener((msg) => {
  switch (msg.id) {
    case MSG.HERO:
      onHero(msg.content);
      break;
    case MSG.STATE:
      onState(msg.content);
      break;
    case MSG.RESET:
      onReset();
      break;
    case MSG.EVENT:
      // Eventos pontuais reservados para evolucao (ex.: anuncio de kill).
      break;
  }
});

async function onHero(content) {
  const npc = content && content.heroName;
  el.hero.textContent = localizedHero(npc);
  if (npc) {
    try { await Benchmarks.loadForHero(npc); } catch (_) { /* sem rede: HUD segue sem badge */ }
  }
}

function onReset() {
  Coach.reset();
  AudioCues.stop();
  el.tips.innerHTML = '';
  render({ heroName: el.hero.textContent, level: 1, gold: 0, lastHits: 0,
           denies: 0, kills: 0, deaths: 0, assists: 0, clockTime: 0 });
}

function onState(state) {
  lastState = state;
  const ratings = render(state);
  Coach.update(state, ratings, emitCue);
}

// ---------------------------------------------------------------------------
// Render dos indicadores
// ---------------------------------------------------------------------------
function render(state) {
  const minutes = Math.max(state.clockTime / 60, 0);

  // GPM aproximado a partir do ouro atual. Net worth exato (ouro + itens)
  // exige o campo net_worth do GSI cru; fica como evolucao.
  const gpm = minutes > 0 ? Math.round(state.gold / minutes) : 0;
  const lhPerMin = minutes > 0 ? +(state.lastHits / minutes).toFixed(1) : 0;

  el.clock.textContent = formatClock(state.clockTime);
  el.lvl.textContent = state.level;
  el.kda.textContent = `${state.kills} / ${state.deaths} / ${state.assists}`;
  // Valor exibido = GPM (coerente com o badge), com o ouro atual como referencia.
  el.nwValue.innerHTML = `${gpm.toLocaleString('pt-BR')} <small>ouro ${state.gold.toLocaleString('pt-BR')}</small>`;
  el.lhValue.innerHTML = `${state.lastHits} <small>/min ${lhPerMin}</small>`;

  let ratings = null;
  if (Benchmarks.hasData() && minutes >= 1) {
    const gpmR = Benchmarks.rate('gold_per_min', gpm);
    const lhR = Benchmarks.rate('last_hits_per_min', lhPerMin);
    applyBadge(el.nwBadge, gpmR);
    applyBadge(el.lhBadge, lhR);
    ratings = { gpm: gpmR, lh: lhR };
  }
  return ratings;
}

function applyBadge(node, rating) {
  node.textContent = rating.percentile != null ? `${rating.label} ${rating.percentile}%` : rating.label;
  node.style.background = hexToRgba(rating.color, 0.18);
  node.style.color = rating.color;
}

// ---------------------------------------------------------------------------
// Dicas (toast + audio)
// ---------------------------------------------------------------------------
function emitCue(cue) {
  showToast(cue);
  AudioCues.cue(cue);
}

function showToast(cue) {
  const div = document.createElement('div');
  div.className = `toast ${cue.priority || 'info'}`;
  div.textContent = cue.text;
  el.tips.appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// ---------------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------------
el.mute.addEventListener('click', () => {
  const on = !AudioCues.isEnabled();
  AudioCues.setEnabled(on);
  el.mute.innerHTML = on ? '&#128266;' : '&#128263;';
});

// Hotkey para alternar clickthrough (interagir com o overlay vs jogar).
overwolf.settings.hotkeys.onPressed.addListener((e) => {
  if (e.name === 'toggle_clickthrough') {
    overwolf.windows.getCurrentWindow((res) => {
      if (res && res.window) {
        const click = !res.window.clickthrough;
        overwolf.windows.setWindowStyle(res.window.id,
          click ? overwolf.windows.enums.WindowStyle.InputPassThrough : null, () => {});
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatClock(sec) {
  const s = Math.floor(Math.abs(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const sign = sec < 0 ? '-' : '';
  return `${sign}${m}:${String(r).padStart(2, '0')}`;
}

function localizedHero(npc) {
  if (!npc) { return '--'; }
  return npc.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ');
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
