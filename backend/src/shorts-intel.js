const DEFAULT_NICHES = [
  {
    id: 'niche-productivity',
    name: 'Productividad AI',
    audience: 'Fundadores, freelancers y creadores',
    momentumScore: 86
  },
  {
    id: 'niche-money',
    name: 'Dinero y side hustles',
    audience: 'Jóvenes 18-34 buscando ingresos extra',
    momentumScore: 91
  },
  {
    id: 'niche-fitness',
    name: 'Fitness rápido en casa',
    audience: 'Personas sin tiempo para gym',
    momentumScore: 78
  }
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomViews(base = 100000) {
  const n = Math.floor(base * (0.35 + Math.random() * 1.9));
  return Math.round(n / 1000) * 1000;
}

function randomDurationSec() {
  return 18 + Math.floor(Math.random() * 33);
}

function whyItWorked(video) {
  const reasons = [];
  if (video.views > 500000) reasons.push('alto alcance por hook claro en 1-2s');
  if (video.durationSec <= 30) reasons.push('retención alta por formato corto y ritmo rápido');
  if (video.callToAction.toLowerCase().includes('comenta')) reasons.push('CTA de comentario elevó engagement');
  if (video.pattern.toLowerCase().includes('antes')) reasons.push('estructura transformación antes/después facilita shares');
  return reasons.length ? reasons.join('; ') : 'mezcla de hook curioso + patrón repetible + CTA simple';
}

function buildVideos(channelId, nicheName) {
  const hooks = [
    'Nadie te cuenta esto sobre',
    '3 errores que arruinan tu',
    'Haz esto 7 días y verás',
    'Si empiezas hoy, en 30 días',
    'Esto parece falso pero funciona:'
  ];
  const patterns = [
    'Problema -> Demo -> Resultado',
    'Antes / Después',
    'Lista de 3 pasos',
    'Storytime con prueba social',
    'Mito vs realidad'
  ];
  const ctas = [
    'Comenta "plantilla" y te la paso',
    'Sígueme para la parte 2',
    'Guárdalo para aplicarlo hoy',
    'Comparte esto con un amigo',
    'Escribe "quiero" para el checklist'
  ];

  return Array.from({ length: 20 }).map((_, i) => {
    const publishedAt = new Date(Date.now() - i * 36e5).toISOString();
    const hook = `${pick(hooks)} ${nicheName.toLowerCase()}`;
    const pattern = pick(patterns);
    const callToAction = pick(ctas);
    const views = randomViews(120000 + Math.floor(Math.random() * 500000));
    const durationSec = randomDurationSec();
    const video = {
      id: `${channelId}-v-${i + 1}`,
      channelId,
      title: `${nicheName} short #${i + 1}`,
      publishedAt,
      hook,
      pattern,
      callToAction,
      views,
      durationSec,
      inferredWhyItWorked: ''
    };
    video.inferredWhyItWorked = whyItWorked(video);
    return video;
  });
}

export function generateMockShortsIntel() {
  const channels = [];
  const videos = [];

  for (const niche of DEFAULT_NICHES) {
    const topChannels = Array.from({ length: 5 }).map((_, idx) => {
      const id = `${niche.id}-ch-${idx + 1}`;
      const avgViews = randomViews(200000 + idx * 60000);
      const velocityScore = 65 + Math.floor(Math.random() * 35);
      return {
        id,
        nicheId: niche.id,
        name: `${niche.name} Channel ${idx + 1}`,
        handle: `@${niche.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}${idx + 1}`,
        subscribers: randomViews(300000 + idx * 50000),
        avgViews,
        velocityScore,
        winRate: Math.round((0.35 + Math.random() * 0.45) * 100) / 100
      };
    });

    channels.push(...topChannels);
    for (const ch of topChannels) videos.push(...buildVideos(ch.id, niche.name));
  }

  return {
    generatedAt: new Date().toISOString(),
    niches: DEFAULT_NICHES,
    channels,
    videos
  };
}
