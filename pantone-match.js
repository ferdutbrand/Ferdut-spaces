/* Digital samples are approximate and deliberately small. Import a catalog to expand coverage. */
window.FerdutPantone=(()=>{
 const seed=[
  ['11-0103 TCX','#F3ECE0'],['11-0602 TCX','#F2F0EB'],['11-0601 TCX','#F4F5F0'],
  ['11-4201 TCX','#F0EEE9'],['11-4800 TCX','#E7E9E7'],['13-4403 TCX','#D2CFC4']
 ];
 const key='ferdut-pantone-import-v1';
 function parse(value){
  const text=String(value).trim();
  if(/^#?[0-9a-f]{6}$/i.test(text))return '#'+text.replace(/^#/,'').toUpperCase();
  if(/^#?[0-9a-f]{3}$/i.test(text))return '#'+[...text.replace(/^#/,'')].map(x=>x+x).join('').toUpperCase();
  const rgb=text.match(/^(?:rgb\(\s*)?(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i);
  if(rgb&&rgb.slice(1).every(x=>Number(x)<=255))return '#'+rgb.slice(1).map(x=>Number(x).toString(16).padStart(2,'0')).join('').toUpperCase();
  throw Error('Use HEX ou RGB, por exemplo #004645 ou 0, 70, 69.');
 }
 function lab(hex){
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
  const f=x=>x>.008856?Math.cbrt(x):(903.3*x+16)/116;
  const x=f((.4124564*r+.3575761*g+.1804375*b)/.95047);
  const y=f(.2126729*r+.7151522*g+.072175*b);
  const z=f((.0193339*r+.119192*g+.9503041*b)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
 }
 function catalog(text){
  const rows=[];
  for(const line of text.split(/\r?\n/)){
   const match=line.match(/^\s*"?((?:[\w-]+\s+)(?:TCX|C|U))"?\s*[,;\t]\s*"?(#?[0-9a-f]{6})"?\s*$/i);
   if(match)rows.push([match[1].toUpperCase().replace(/\s+/g,' '),parse(match[2])]);
  }
  if(!rows.length)throw Error('CSV sem amostras. Use duas colunas: código e HEX.');
  return rows.slice(0,12000);
 }
 function colorBookHTML(text){
  const pairs=new Map();
  const pattern=/data-testid=["']button-copy-(hex|secondary)-([\da-f-]{36})["'][^>]*>\s*<span[^>]*>\s*(#[\da-f]{6}|\d{2}-\d{4} TCX)\s*<\/span>/gi;
  for(const [,kind,id,value] of text.matchAll(pattern)){
   if(!pairs.has(id))pairs.set(id,{});
   pairs.get(id)[kind.toLowerCase()]=value.toUpperCase();
  }
  return catalog([...pairs.values()].filter(p=>p.hex&&p.secondary).map(p=>p.secondary+','+p.hex).join('\n'));
 }
 const family=code=>code.split(' ').at(-1);
 function nearest(input,rows,book='all'){
  const point=lab(parse(input));
  return rows.filter(([code])=>book==='all'||family(code)===book).map(([code,hex])=>{
   const sample=lab(hex);
   return {code,hex,distance:Math.hypot(...sample.map((v,i)=>v-point[i]))};
  }).sort((a,b)=>a.distance-b.distance).slice(0,5);
 }
 function install(){
  let imported=[],pms=[],pending;
  try{imported=catalog(localStorage.getItem(key)||'')}catch{}
  const dialog=document.createElement('dialog');
  dialog.setAttribute('aria-label','Pantone aproximado');
  dialog.innerHTML=`<form><label>HEX ou RGB <input name="color" required placeholder="#004645"></label>
  <label>Coleção <select name="book"><option value="all">Todas</option><option value="C">PMS C</option><option value="U">PMS U</option><option value="TCX">TCX</option></select></label>
  <button>Buscar</button> <button type="button" data-pantone-close>Fechar</button>
  <p>Match digital: índice de 0 a 100 calculado como 100 − ΔE76 (mínimo 0). Não é percentual de fidelidade de impressão.</p>
  <label>Importar CSV (código, HEX) ou HTML salvo do ColorBook <input name="catalog" type="file" accept=".csv,.tsv,.html,.htm,text/csv,text/html"></label>
  <p><a href="https://pantoneconverter.com/pantone-finder/" target="_blank" rel="noopener noreferrer">PantoneConverter · PMS</a> ·
  <a href="https://www.colorbook.online/" target="_blank" rel="noopener noreferrer">ColorBook · TCX</a></p>
  <p role="status"></p><ol data-pantone-results></ol></form>`;
  const form=dialog.querySelector('form'),results=dialog.querySelector('ol'),status=dialog.querySelector('[role=status]');
  form.onsubmit=e=>{
   e.preventDefault();results.replaceChildren();
   try{
    const rows=[...new Map([...pms,...seed,...imported]).entries()];
    const matches=nearest(form.elements.color.value,rows,form.elements.book.value);
    status.textContent=matches.length?('PMS C/U: '+pms.length+' amostras · TCX inicial: '+seed.length+' · importadas: '+imported.length+'.'):'Coleção sem amostras. Importe um catálogo CSV.';
    for(const m of matches){
     const row=document.createElement('li'),chip=document.createElement('span');
     chip.className='pantone-chip';chip.style.background=m.hex;chip.setAttribute('aria-hidden','true');
     row.append(chip,document.createTextNode(m.code+' · '+m.hex+' · Match digital ≈ '+FerdutSamples.score(m.distance).toFixed(1).replace('.',',')+'% · ΔE '+m.distance.toFixed(1)));results.append(row);
    }
   }catch(error){status.textContent=error.message}
  };
  form.elements.catalog.onchange=async()=>{
   try{
    const file=form.elements.catalog.files[0];if(!file)return;
    const html=/\.html?$/i.test(file.name);
    if(file.size>(html?8*1024*1024:512000))throw Error('Limite: HTML de 8 MB ou CSV de 500 KB.');
    const source=await file.text();
    const batch=html?colorBookHTML(source):catalog(source);
    imported=[...new Map([...imported,...batch]).entries()].slice(0,12000);
    try{localStorage.setItem(key,imported.map(row=>row.join(',')).join('\n'))}catch{status.textContent='Catálogo disponível apenas nesta sessão.';return}
    status.textContent=imported.length+' amostras importadas.';
    if(form.elements.color.value)form.requestSubmit();
   }catch(error){status.textContent=error.message}
  };
  dialog.querySelector('[data-pantone-close]').onclick=()=>dialog.close();
  for(const type of ['keydown','paste','copy','cut','drop'])dialog.addEventListener(type,e=>e.stopPropagation());
  document.body.append(dialog);
  const button=document.createElement('button');button.type='button';button.textContent='Pantone aproximado';
  button.onclick=()=>{
   if(!form.elements.color.value)form.elements.color.value=FerdutPalette.draft().colors[0]||'';
   dialog.showModal();
   if(!pending){
    const submit=form.querySelector('button:not([type])');submit.disabled=true;
    status.textContent='Carregando catálogo local…';
    pending=fetch('data/pantone-pms.json').then(r=>{if(!r.ok)throw Error();return r.json()})
     .then(rows=>{pms=rows;status.textContent=pms.length+' referências PMS disponíveis.'})
     .catch(()=>{status.textContent='Catálogo PMS indisponível. Use a importação local.';pending=null})
     .finally(()=>{submit.disabled=false});
   }
  };
  document.getElementById('plSecondaryActions').append(button);
 }
 let samplesPromise;const matches=new Map();
 async function approximate(input){const hex=parse(input);if(matches.has(hex))return matches.get(hex);if(!samplesPromise)samplesPromise=fetch('data/pantone-pms.json').then(r=>{if(!r.ok)throw Error('Catálogo indisponível');return r.json()}).then(rows=>rows.filter(([code,c])=>/ C$/.test(code)&&/^#[0-9a-f]{6}$/i.test(c)).map(([code,c])=>({code,hex:c,point:lab(c)}))).catch(e=>{samplesPromise=null;throw e});const rows=await samplesPromise,point=lab(hex);let best=null,distance=Infinity;for(const row of rows){const d=row.point.reduce((sum,v,i)=>sum+(v-point[i])**2,0);if(d<distance){distance=d;best=row}}if(!best)throw Error('Catálogo vazio');const value={code:best.code,hex:best.hex,distance:Math.sqrt(distance)};if(matches.size>=256)matches.delete(matches.keys().next().value);matches.set(hex,value);return value}
 return {parse,catalog,colorBookHTML,nearest,install,approximate};
})();
FerdutPantone.install();
