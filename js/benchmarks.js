// Benchmarks via OpenDota.
// Converte o desempenho atual do jogador (GPM, LH/min) em um percentil relativo
// ao heroi jogado, gerando o indicador "bom / medio / ruim" estilo Dota Plus.
//
// Endpoints usados:
//   GET https://api.opendota.com/api/heroes
//        -> [{ id, name: "npc_dota_hero_antimage", localized_name, ... }]
//   GET https://api.opendota.com/api/benchmarks?hero_id=ID
//        -> { result: { gold_per_min: [{percentile, value}], last_hits_per_min: [...] } }

const OD_BASE = 'https://api.opendota.com/api';

const Benchmarks = (() => {
  let heroIndex = null;          // mapa npc_name -> hero_id
  let current = { heroId: null, data: null };

  async function ensureHeroIndex() {
    if (heroIndex) { return heroIndex; }
    const res = await fetch(`${OD_BASE}/heroes`);
    const heroes = await res.json();
    heroIndex = {};
    heroes.forEach((h) => { heroIndex[h.name] = h.id; });
    return heroIndex;
  }

  // Carrega os benchmarks do heroi atual. Idempotente por heroId.
  async function loadForHero(npcName) {
    if (!npcName) { return false; }
    const idx = await ensureHeroIndex();
    const heroId = idx[npcName];
    if (!heroId) { return false; }
    if (current.heroId === heroId && current.data) { return true; }

    const res = await fetch(`${OD_BASE}/benchmarks?hero_id=${heroId}`);
    const json = await res.json();
    current = { heroId, data: json && json.result ? json.result : null };
    return !!current.data;
  }

  // Interpola o percentil de um valor dentro da curva de um metric.
  // metric: 'gold_per_min' | 'last_hits_per_min' | 'xp_per_min'...
  // Retorna percentil em [0,1] ou null se nao houver dados.
  function percentileOf(metric, value) {
    if (!current.data || !current.data[metric]) { return null; }
    const curve = current.data[metric]
      .map((p) => ({ p: Number(p.percentile), v: Number(p.value) }))
      .filter((p) => Number.isFinite(p.p) && Number.isFinite(p.v))
      .sort((a, b) => a.v - b.v);
    if (!curve.length) { return null; }

    if (value <= curve[0].v) { return curve[0].p; }
    if (value >= curve[curve.length - 1].v) { return curve[curve.length - 1].p; }

    for (let i = 1; i < curve.length; i++) {
      if (value <= curve[i].v) {
        const a = curve[i - 1], b = curve[i];
        const t = (value - a.v) / (b.v - a.v || 1);
        return a.p + t * (b.p - a.p);
      }
    }
    return curve[curve.length - 1].p;
  }

  // Classifica um percentil em rotulo + cor para o HUD.
  function classify(percentile) {
    if (percentile == null) { return { label: '--', color: '#9ca3af', tier: 'unknown', percentile: null }; }
    const pct = Math.round(percentile * 100);
    if (percentile >= 0.7) { return { label: 'BOM', color: '#22c55e', tier: 'good', percentile: pct }; }
    if (percentile >= 0.4) { return { label: 'MEDIO', color: '#eab308', tier: 'average', percentile: pct }; }
    return { label: 'RUIM', color: '#ef4444', tier: 'bad', percentile: pct };
  }

  // API publica: avalia um metric para um valor por minuto.
  function rate(metric, perMinuteValue) {
    return classify(percentileOf(metric, perMinuteValue));
  }

  return { loadForHero, rate, hasData: () => !!current.data };
})();
