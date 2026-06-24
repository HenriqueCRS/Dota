// Constantes compartilhadas entre as janelas do app.
// classId do Dota 2 na plataforma Overwolf.
const DOTA2_CLASS_ID = 7314;

// Features do GEP que precisamos receber. A lista exata depende da versao do
// provider Overwolf para Dota 2 (ver doc oficial). Pedimos um conjunto amplo e
// tratamos a ausencia de cada campo no controller.
const REQUIRED_FEATURES = [
  'game_state_changed',
  'match_state_changed',
  'match',
  'me',
  'hero',
  'kill',
  'death',
  'assist',
  'cs',
  'gold',
  'hero_leveled_up',
  'clock_time_changed',
  'roster'
];

// Janela do overlay (deve bater com o nome em manifest.json -> data.windows).
const OVERLAY_WINDOW = 'in_game';

// Mensagens enviadas do background para o overlay via overwolf.windows.sendMessage.
const MSG = {
  STATE: 'state',     // estado consolidado do jogador
  EVENT: 'event',     // evento pontual (kill, runa, etc.)
  RESET: 'reset',     // nova partida -> zera HUD
  HERO: 'hero'        // heroi detectado -> carregar benchmark
};
