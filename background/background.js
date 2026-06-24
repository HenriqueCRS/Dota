// Controller de background.
// Responsabilidades:
//  - detectar quando o Dota 2 esta rodando;
//  - registrar as features do GEP e escutar info updates / eventos;
//  - manter o estado consolidado do jogador;
//  - abrir/fechar a janela de overlay e enviar o estado para ela.

let overlayWindowId = null;
let setFeaturesRetry = null;

// Estado consolidado da partida atual. Reiniciado a cada nova partida.
const state = {
  inMatch: false,
  matchState: null,
  heroName: null,
  level: 1,
  gold: 0,
  lastHits: 0,
  denies: 0,
  kills: 0,
  deaths: 0,
  assists: 0,
  clockTime: 0 // segundos desde o inicio (pode ser negativo na fase de pre-jogo)
};

function resetState() {
  state.inMatch = true;
  state.matchState = null;
  state.heroName = null;
  state.level = 1;
  state.gold = 0;
  state.lastHits = 0;
  state.denies = 0;
  state.kills = 0;
  state.deaths = 0;
  state.assists = 0;
  state.clockTime = 0;
}

// ---------------------------------------------------------------------------
// Deteccao do jogo
// ---------------------------------------------------------------------------

function isDota(gameInfo) {
  return gameInfo && gameInfo.isRunning &&
    Math.floor(gameInfo.id / 10) === DOTA2_CLASS_ID;
}

function onGameInfoUpdated(res) {
  if (res && res.gameInfo && isDota(res.gameInfo)) {
    if (res.runningChanged || res.gameChanged) {
      onDotaLaunched();
    }
  } else if (res && res.gameInfo && Math.floor((res.gameInfo.id || 0) / 10) === DOTA2_CLASS_ID && !res.gameInfo.isRunning) {
    onDotaClosed();
  }
}

function onDotaLaunched() {
  registerEvents();
  setRequiredFeatures();
  openOverlay();
}

function onDotaClosed() {
  closeOverlay();
}

// ---------------------------------------------------------------------------
// GEP
// ---------------------------------------------------------------------------

function setRequiredFeatures() {
  overwolf.games.events.setRequiredFeatures(REQUIRED_FEATURES, (info) => {
    if (!info || info.success === false) {
      // O GEP pode nao estar pronto logo apos o launch. Tenta de novo.
      setFeaturesRetry = setTimeout(setRequiredFeatures, 2000);
    } else {
      if (setFeaturesRetry) { clearTimeout(setFeaturesRetry); setFeaturesRetry = null; }
    }
  });
}

function registerEvents() {
  overwolf.games.events.onInfoUpdates2.removeListener(onInfoUpdate);
  overwolf.games.events.onNewEvents.removeListener(onNewEvent);
  overwolf.games.events.onInfoUpdates2.addListener(onInfoUpdate);
  overwolf.games.events.onNewEvents.addListener(onNewEvent);
}

// Info updates: estado continuo (gold, cs, level, tempo...).
function onInfoUpdate(info) {
  if (!info || !info.info) { return; }
  const d = info.info;
  let changed = false;

  if (d.game_info) {
    if (d.game_info.match_state) { state.matchState = d.game_info.match_state; changed = true; }
  }

  if (d.me) {
    if (d.me.hero_name && d.me.hero_name !== state.heroName) {
      state.heroName = d.me.hero_name;
      sendToOverlay(MSG.HERO, { heroName: state.heroName });
    }
    if (d.me.gold != null) { state.gold = toNum(d.me.gold); changed = true; }
    if (d.me.level != null) { state.level = toNum(d.me.level); changed = true; }
  }

  // Algumas versoes do provider entregam gold/cs em features dedicadas.
  if (d.gold != null) { state.gold = toNum(typeof d.gold === 'object' ? d.gold.gold : d.gold); changed = true; }
  if (d.cs) {
    if (d.cs.last_hits != null) { state.lastHits = toNum(d.cs.last_hits); changed = true; }
    if (d.cs.denies != null) { state.denies = toNum(d.cs.denies); changed = true; }
  }
  if (d.kill && d.kill.kills != null) { state.kills = toNum(d.kill.kills); changed = true; }
  if (d.death && d.death.deaths != null) { state.deaths = toNum(d.death.deaths); changed = true; }
  if (d.assist && d.assist.assists != null) { state.assists = toNum(d.assist.assists); changed = true; }
  if (d.hero_leveled_up && d.hero_leveled_up.level != null) { state.level = toNum(d.hero_leveled_up.level); changed = true; }
  if (d.clock_time != null) { state.clockTime = toNum(d.clock_time); changed = true; }
  if (d.clock_time_changed != null) { state.clockTime = toNum(d.clock_time_changed); changed = true; }

  if (changed) { pushState(); }
}

// Eventos pontuais: kill, morte, etc.
function onNewEvent(events) {
  if (!events || !events.events) { return; }
  events.events.forEach((e) => {
    switch (e.name) {
      case 'match_state_changed':
        if (e.data && /PRE_GAME|HERO_SELECTION/.test(String(e.data))) {
          resetState();
          sendToOverlay(MSG.RESET, {});
        }
        break;
      case 'kill':
      case 'death':
      case 'assist':
      case 'hero_leveled_up':
        sendToOverlay(MSG.EVENT, { name: e.name, data: e.data });
        break;
    }
  });
}

function pushState() {
  sendToOverlay(MSG.STATE, state);
}

// ---------------------------------------------------------------------------
// Overlay window
// ---------------------------------------------------------------------------

function openOverlay() {
  overwolf.windows.obtainDeclaredWindow(OVERLAY_WINDOW, (res) => {
    if (!res || res.success === false) { return; }
    overlayWindowId = res.window.id;
    overwolf.windows.restore(OVERLAY_WINDOW, () => {});
  });
}

function closeOverlay() {
  overwolf.windows.close(OVERLAY_WINDOW, () => {});
}

function sendToOverlay(channel, payload) {
  overwolf.windows.sendMessage(OVERLAY_WINDOW, channel, payload, () => {});
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

function init() {
  overwolf.games.onGameInfoUpdated.addListener(onGameInfoUpdated);
  overwolf.games.getRunningGameInfo((info) => {
    if (isDota(info)) { onDotaLaunched(); }
  });
}

init();
