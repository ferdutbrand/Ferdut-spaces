window.FerdutColor=(()=>{
const safe=x=>/^#[0-9a-f]{6}$/i.test(x)?x.toUpperCase():'#777777';
const lum=s=>{let rgb=safe(s).slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
function rgb(hex){const x=safe(hex).slice(1);return [0,2,4].map(i=>parseInt(x.slice(i,i+2),16)/255)}
function toHsl(hex){let [r,g,b]=rgb(hex),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2,h=0,s=0;if(d){s=d/(1-Math.abs(2*l-1));switch(max){case r:h=((g-b)/d)%6;break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4}h=(h*60+360)%360}return [h,s,l]}
function fromHsl(h,s,l){h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let v=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+v.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase()}

return Object.freeze({safe,lum,contrast,rgb,toHsl,fromHsl});})();
