// City backdrop — fetches a random famous-city photo from Wikipedia REST API on each game start.
// No API key. Returns CORS-enabled image URLs. Falls back to gradient on network failure.
(function(global){

const CITIES = [
  { wiki:'Seoul',           label:'Seoul, Korea' },
  { wiki:'Tokyo',            label:'Tokyo, Japan' },
  { wiki:'New_York_City',    label:'New York, USA' },
  { wiki:'Paris',            label:'Paris, France' },
  { wiki:'London',           label:'London, UK' },
  { wiki:'Sydney',           label:'Sydney, Australia' },
  { wiki:'Dubai',            label:'Dubai, UAE' },
  { wiki:'Singapore',        label:'Singapore' },
  { wiki:'Hong_Kong',        label:'Hong Kong' },
  { wiki:'Istanbul',         label:'Istanbul, Türkiye' },
  { wiki:'Rome',             label:'Rome, Italy' },
  { wiki:'Bangkok',          label:'Bangkok, Thailand' },
  { wiki:'San_Francisco',    label:'San Francisco, USA' },
  { wiki:'Rio_de_Janeiro',   label:'Rio de Janeiro, Brazil' },
  { wiki:'Cape_Town',        label:'Cape Town, South Africa' },
  { wiki:'Barcelona',        label:'Barcelona, Spain' },
  { wiki:'Shanghai',         label:'Shanghai, China' },
  { wiki:'Moscow',           label:'Moscow, Russia' },
  { wiki:'Berlin',           label:'Berlin, Germany' },
  { wiki:'Vancouver',        label:'Vancouver, Canada' },
];

let lastIndex = -1;
function pickCity(){
  let i;
  do { i = Math.floor(Math.random() * CITIES.length); }
  while (CITIES.length > 1 && i === lastIndex);
  lastIndex = i;
  return CITIES[i];
}

async function fetchImage(wiki){
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wiki)}`;
  const r = await fetch(url, { headers:{ 'Accept':'application/json' } });
  if(!r.ok) throw new Error('wiki ' + r.status);
  const j = await r.json();
  return j.originalimage?.source || j.thumbnail?.source || null;
}

async function next(){
  const city = pickCity();
  const layer = document.getElementById('bgImage');
  const label = document.getElementById('bgLabel');
  try{
    const src = await fetchImage(city.wiki);
    if(!src) throw new Error('no image');
    // preload to avoid flicker
    await new Promise((res, rej)=>{
      const img = new Image();
      img.onload = res;
      img.onerror = rej;
      img.src = src;
    });
    layer.style.backgroundImage = `url("${src}")`;
    layer.classList.add('loaded');
    if(label) label.textContent = city.label;
  }catch(e){
    // fallback — keep prior or apply neutral gradient
    layer.style.backgroundImage = '';
    layer.classList.remove('loaded');
    if(label) label.textContent = city.label + ' (이미지 로드 실패)';
  }
}

global.TetrisPro = global.TetrisPro || {};
global.TetrisPro.Backdrop = { next };
})(window);
