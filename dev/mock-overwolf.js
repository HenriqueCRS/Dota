// Mock minimo da API overwolf.* para testar o HUD no navegador, sem o cliente
// Overwolf. Cobre apenas o que in_game.js usa. NAO entra no pacote final.

(function () {
  const msgListeners = [];
  const hotkeyListeners = [];

  window.overwolf = {
    windows: {
      onMessageReceived: {
        addListener: (fn) => msgListeners.push(fn)
      },
      getCurrentWindow: (cb) => cb({ window: { id: 'mock', clickthrough: false } }),
      setWindowStyle: (_id, _style, cb) => cb && cb({ success: true }),
      enums: { WindowStyle: { InputPassThrough: 'InputPassThrough' } }
    },
    settings: {
      hotkeys: {
        onPressed: { addListener: (fn) => hotkeyListeners.push(fn) }
      }
    }
  };

  // Ponte usada pelo simulador para injetar mensagens como se viessem do background.
  window.MockOW = {
    send: (id, content) => msgListeners.forEach((fn) => fn({ id, content })),
    pressHotkey: (name) => hotkeyListeners.forEach((fn) => fn({ name }))
  };
})();
