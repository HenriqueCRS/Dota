// Audio: falas em portugues (TTS) + sons curtos de alerta.
// Usa a Web Speech API (speechSynthesis) disponivel no Chromium do Overwolf,
// entao o MVP fala em pt-BR sem precisar produzir arquivos de voz.
// Sons curtos sao arquivos opcionais em assets/sounds/; se faltarem, a falha
// de reproducao e ignorada (nao quebra a fala).

const AudioCues = (() => {
  let enabled = true;
  let ptVoice = null;
  const sounds = {};
  let speaking = false;
  const queue = [];

  // Mapa de ids de som -> arquivo. Coloque os .mp3 em assets/sounds/.
  const SOUND_FILES = {
    ping: 'assets/sounds/ping.mp3',
    tick: 'assets/sounds/tick.mp3',
    warn: 'assets/sounds/warn.mp3'
  };

  function pickPortugueseVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    ptVoice = voices.find((v) => /pt[-_]BR/i.test(v.lang)) ||
              voices.find((v) => /^pt/i.test(v.lang)) || null;
  }

  function init() {
    if (!window.speechSynthesis) { return; }
    pickPortugueseVoice();
    // A lista de vozes costuma carregar de forma assincrona.
    window.speechSynthesis.onvoiceschanged = pickPortugueseVoice;

    Object.keys(SOUND_FILES).forEach((id) => {
      const a = new Audio(SOUND_FILES[id]);
      a.preload = 'auto';
      a.volume = 0.6;
      sounds[id] = a;
    });
  }

  function setEnabled(v) { enabled = !!v; if (!enabled) { stop(); } }
  function isEnabled() { return enabled; }

  function playSound(id) {
    const a = sounds[id];
    if (!a) { return; }
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (_) {}
  }

  function speak(text) {
    if (!window.speechSynthesis || !text) { return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    if (ptVoice) { u.voice = ptVoice; }
    u.rate = 1.05;
    u.pitch = 1.0;
    u.onend = () => { speaking = false; dequeue(); };
    u.onerror = () => { speaking = false; dequeue(); };
    speaking = true;
    window.speechSynthesis.speak(u);
  }

  function dequeue() {
    if (speaking || !queue.length) { return; }
    const next = queue.shift();
    if (next.sound) { playSound(next.sound); }
    speak(next.voice);
  }

  // Enfileira uma cue de audio. Evita sobreposicao de falas.
  function cue({ voice, sound }) {
    if (!enabled || !voice) {
      if (enabled && sound) { playSound(sound); }
      return;
    }
    queue.push({ voice, sound });
    dequeue();
  }

  function stop() {
    queue.length = 0;
    speaking = false;
    if (window.speechSynthesis) { window.speechSynthesis.cancel(); }
  }

  return { init, cue, playSound, setEnabled, isEnabled, stop };
})();
