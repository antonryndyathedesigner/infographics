import {escapeText as esc} from './data.js';
const number=n=>new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(n);
export const layoutNames={bars:'Полосы',columns:'Столбцы',donut:'Кольцевая',cards:'Карточки',overview:'Обзор',editorial:'Текст',modules:'Модули'};
export function actualLayout(data,options,variant){
  const layout=options.layouts?.[variant]||['bars','cards','donut'][variant];
  if(layout==='donut'&&(data.some(d=>d.value<0)||data.reduce((a,d)=>a+d.value,0)<=0))return 'bars';
  if(layout==='columns'&&data.length>12)return 'bars';
  return layout;
}
function wrap(text,max){
  const lines=[];let current='';
  for(let word of String(text||'').split(/\s+/)){while(word.length>max){if(current){lines.push(current);current='';}lines.push(word.slice(0,max));word=word.slice(max);}if((current+' '+word).trim().length>max){lines.push(current);current=word;}else current=(current+' '+word).trim();}
  if(current)lines.push(current);return lines;
}
function canvas(options,height){
  const {title='',subtitle='',palette=[],fontScale=1,hidden={},ink='#20221F',background='#FAFAF7',fontWeight=500}=options;
  const colors=palette.length?palette:['#20221F','#9A9A94','#D1D1CB'];
  const text=(x,y,value,size=16,attrs='')=>`<text x="${x}" y="${y}" font-size="${size*fontScale}" ${attrs}>${esc(value)}</text>`;
  const line=(x,y,end)=>hidden.grid?'':`<path d="M${x} ${y}H${end}" stroke="${ink}" opacity=".13"/>`;
  const heading=hidden.title?'':wrap(title,Math.floor(43/fontScale)).map((s,i)=>text(48,65+i*44*fontScale,s,32,`font-weight="${fontWeight}"`)).join('');
  const titleLines=hidden.title?0:wrap(title,Math.floor(43/fontScale)).length;
  const top=titleLines?78+titleLines*44*fontScale:48;
  const sub=subtitle?wrap(subtitle,Math.floor(90/fontScale)).map((s,i)=>text(48,top+i*22*fontScale,s,15,'opacity=".6"')).join(''):'';
  const start=top+(subtitle?wrap(subtitle,Math.floor(90/fontScale)).length*22*fontScale+32:20);
  return {colors,text,line,start,finish:body=>`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${Math.ceil(height+start)}" viewBox="0 0 960 ${Math.ceil(height+start)}" role="img" aria-label="${esc(title||'Инфографика')}"><rect width="960" height="100%" fill="${background}"/><g fill="${ink}" font-family="Arial, Helvetica, sans-serif">${heading}${sub}${body}</g></svg>`};
}
export function makeChart(data,options,variant=0){
  const layout=actualLayout(data,options,variant), hidden=options.hidden||{}, scale=options.fontScale||1;
  const spacing=(options.spacing||1)*(1.25-(options.density||.3)*.5);
  const rowHeights=data.map(d=>Math.max(64,wrap(d.label,Math.floor(29/scale)).length*23*scale+30)*spacing);
  const gridHeights=[];for(let i=0;i<data.length;i+=3)gridHeights.push(Math.max(...data.slice(i,i+3).map(d=>wrap(d.label,Math.floor(25/scale)).length*23*scale+90))*spacing);
  const h=layout==='bars'?rowHeights.reduce((a,b)=>a+b,0)+48:layout==='cards'?gridHeights.reduce((a,b)=>a+b,0)+48:layout==='donut'?Math.max(450,rowHeights.reduce((a,b)=>a+b,0))+48:500;
  const {colors,text,line,start,finish}=canvas(options,h);let body='';
  const color=i=>colors[i%colors.length], max=Math.max(1,...data.map(d=>Math.abs(d.value))),sum=data.reduce((a,d)=>a+d.value,0);
  const val=d=>number(d.value)+(options.unit?' '+options.unit:'');
  const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${c}"/>`;
  const labels=(x,y,label,maxChars,size=15,attrs='')=>hidden.labels?'':wrap(label,maxChars).map((s,i)=>text(x,y+i*23*scale,s,size,attrs)).join('');
  if(layout==='bars'){
    const signed=data.some(d=>d.value<0),zero=signed?590:340,span=signed?190:450;let y=start;
    if(signed&&!hidden.grid)body+=`<path d="M590 ${start}V${start+h-48}" stroke="${options.ink||'#20221F'}" opacity=".3" stroke-dasharray="3 5"/>`;
    data.forEach((d,i)=>{const w=Math.abs(d.value)/max*span;body+=labels(48,y+24,d.label,Math.floor(29/scale));body+=rect(d.value<0?zero-w:zero,y+4,w,28,color(i));if(!hidden.values)body+=text(912,y+26,val(d),16,'text-anchor="end"');body+=line(48,y+rowHeights[i]-14,912);y+=rowHeights[i];});
  }else if(layout==='cards'){
    let y=start;data.forEach((d,i)=>{const x=48+i%3*296;body+=rect(x,y,5,37,color(i));if(!hidden.values)body+=text(x+18,y+31,val(d),30,`font-weight="${options.fontWeight||500}"`);body+=labels(x+18,y+65,d.label,Math.floor(25/scale));body+=line(x,y+gridHeights[Math.floor(i/3)]-20,x+264);if(i%3===2)y+=gridHeights[Math.floor(i/3)];});
  }else if(layout==='columns'){
    const signed=data.some(d=>d.value<0),baseline=start+(signed?200:340),slot=864/data.length,span=signed?170:300;
    body+=line(48,baseline,912);data.forEach((d,i)=>{const x=48+i*slot,barW=Math.min(80,slot*.65),barH=Math.abs(d.value)/max*span;body+=rect(x+(slot-barW)/2,d.value>=0?baseline-barH:baseline,barW,barH,color(i));if(!hidden.values)body+=text(x+slot/2,d.value>=0?baseline-barH-12:baseline+barH+25,val(d),12,'text-anchor="middle"');body+=labels(x+slot/2,start+420,d.label,Math.floor(slot/(8*scale)),12,'text-anchor="middle"');});
  }else{
    const cx=250,cy=start+195,r=148,circ=2*Math.PI*r;let offset=0;data.forEach((d,i)=>{const length=d.value/sum*circ;body+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color(i)}" stroke-width="50" stroke-dasharray="${length} ${circ-length}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})"/>`;offset+=length;});
    let y=start+20;data.forEach((d,i)=>{body+=rect(490,y+9,10,10,color(i));body+=labels(516,y+23,d.label,Math.floor(27/scale));if(!hidden.values)body+=text(912,y+23,val(d),15,'text-anchor="end"');y+=rowHeights[i];});
  }
  return finish(body);
}
export function makeTextChart(data,options,variant=0){
  const scale=options.fontScale||1,hidden=options.hidden||{},columns=variant===2?2:1;
  const sizes=data.map(d=>Math.max(70,((hidden.labels?0:wrap(d.label,Math.floor((columns===2?30:60)/scale)).length)*28*scale+(hidden.values?0:wrap(d.text,Math.floor((columns===2?42:88)/scale)).length)*22*scale+45)*(options.spacing||1)));
  const groups=[];for(let i=0;i<sizes.length;i+=columns)groups.push(Math.max(...sizes.slice(i,i+columns)));
  const {colors,text,line,start,finish}=canvas(options,groups.reduce((a,b)=>a+b,0)+48);let body='',y=start;
  data.forEach((d,i)=>{const x=48+(i%columns)*448,w=columns===2?416:864,blockH=groups[Math.floor(i/columns)];body+=`<rect x="${x}" y="${y}" width="${variant===1?4:w}" height="${variant===1?blockH-20:4}" fill="${colors[i%colors.length]}"/>`;let top=y+30;if(!hidden.labels){const lines=wrap(d.label,Math.floor((columns===2?30:60)/scale));lines.forEach((s,j)=>body+=text(x+12,top+j*28*scale,s,21,`font-weight="${options.fontWeight||500}"`));top+=lines.length*28*scale+10;}if(!hidden.values)wrap(d.text,Math.floor((columns===2?42:88)/scale)).forEach((s,j)=>body+=text(x+12,top+j*22*scale,s,16,'opacity=".7"'));body+=line(x,y+blockH-12,x+w);if(i%columns===columns-1)y+=blockH;});
  return finish(body);
}
