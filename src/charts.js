import {escapeText as esc} from './data.js';
const num = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits: 2}).format(n);
const short = (s, len = 31) => s.length > len ? s.slice(0, len - 1) + '…' : s;
export function makeChart(data, options, variant = 0) {
  const {title, subtitle, palette, unit = '', source = '', fontWeight = 600} = options;
  const colors = palette.length ? palette : ['#D8E568', '#B8C9BA', '#C3C5CF', '#E0CCB3', '#BDBDB6'];
  const width = 960, height = Math.max(720, variant === 2 ? 480 + data.length * 36 : 340 + data.length * (variant === 1 ? 67 : 55));
  const ink = '#20221F', muted = '#777B71', paper = '#FAFAF6';
  let body = '';
  const t = (x, y, str, size = 16, attrs = '') => `<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${esc(str)}</text>`;
  const rect = (x,y,w,h,fill,attrs='') => `<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${h}" fill="${fill}" ${attrs}/>`;
  const max = Math.max(...data.map(d=>Math.abs(d.value)), 1);
  const sum = data.reduce((a,d)=>a+d.value,0);
  body += t(52, 53, 'FORMA / DATA STUDY', 12, 'letter-spacing="2"');
  body += t(908, 53, `0${variant+1} — ${['COMPARISON','INDEX','DISTRIBUTION'][variant]}`, 11, 'text-anchor="end" letter-spacing="1"');
  body += `<path d="M52 77H908" stroke="${ink}" stroke-width="1"/>`;
  body += t(52, 129, short(title || 'Обзор данных', 44), 35, `font-weight="${fontWeight}" letter-spacing="-1.2"`);
  body += t(52, 159, short(subtitle || 'Каждое число — часть общей картины.', 84), 15, `fill="${muted}"`);
  const display = value => num(value) + (unit ? ' ' + unit : '');
  if (variant === 0) {
    const signed = data.some(d=>d.value<0);
    const barStart = signed ? 580 : 335, span = signed ? 205 : 490;
    body += t(52, 209, 'НАПРАВЛЕНИЕ', 10, `letter-spacing="1.5" fill="${muted}"`);
    body += t(908, 209, 'ЗНАЧЕНИЕ', 10, `text-anchor="end" letter-spacing="1.5" fill="${muted}"`);
    data.forEach((d,i)=>{
      const y = 233 + i * 55;
      body += `<path d="M52 ${y+40}H908" stroke="#E5E6DE"/>`;
      body += t(52,y+25,short(d.label),15);
      const w = Math.abs(d.value)/max * span;
      body += rect(d.value<0 ? barStart-w : barStart,y+5,w,28,colors[i%colors.length]);
      body += t(908,y+25,display(d.value),17,'text-anchor="end" font-weight="500"');
    });
    if (signed) body += `<path d="M${barStart} 233V${233+data.length*55}" stroke="${muted}"/>`;
  } else if (variant === 1) {
    body += t(52,220,'КАРТА ПОКАЗАТЕЛЕЙ',10,`letter-spacing="1.5" fill="${muted}"`);
    data.forEach((d,i)=>{
      const y=246+i*67;
      body += rect(52,y,5,47,colors[i%colors.length]);
      body += t(78,y+15,String(i+1).padStart(2,'0'),11,`fill="${muted}"`);
      body += t(124,y+31,short(d.label,39),20);
      body += t(908,y+32,display(d.value),32,'text-anchor="end" letter-spacing="-1"');
      body += `<path d="M78 ${y+53}H908" stroke="#E5E6DE"/>`;
    });
  } else {
    const validShare = data.every(d=>d.value>=0) && sum>0;
    if(validShare) {
      let x = 52;
      data.forEach((d,i)=>{
        const w=d.value/sum*856;
        body+=rect(x,214,w,110,colors[i%colors.length]); x+=w;
      });
      body+=t(52,355,'ДОЛЯ В ОБЩЕЙ СУММЕ',10,`letter-spacing="1.5" fill="${muted}"`);
      data.forEach((d,i)=>{
        const y=392+i*36;
        body+=rect(52,y-12,10,10,colors[i%colors.length]);
        body+=t(78,y,short(d.label,45),15);
        body+=t(760,y,display(d.value),15,'text-anchor="end"');
        body+=t(908,y,num(d.value/sum*100)+'%',15,'text-anchor="end" font-weight="600"');
      });
    } else {
      body+=t(52,220,'ЗНАЧЕНИЯ ОТНОСИТЕЛЬНО НУЛЯ',10,`letter-spacing="1.5" fill="${muted}"`);
      data.forEach((d,i)=>{
        const y=260+i*48;
        body+=t(52,y,short(d.label),15);
        body+=`<path d="M340 ${y-6}H825" stroke="#E5E6DE"/>`;
        const x=582+d.value/max*230;
        body+=`<circle cx="${x}" cy="${y-6}" r="7" fill="${colors[i%colors.length]}"/>`;
        body+=t(908,y,display(d.value),16,'text-anchor="end"');
      });
      body+=`<path d="M582 239V${270+data.length*48}" stroke="${muted}" stroke-dasharray="3 5"/>`;
    }
  }
  body+=`<path d="M52 ${height-72}H908" stroke="${ink}"/>`;
  body+=t(52,height-43,short(source || 'Источник: загруженная таблица',95),11,`fill="${muted}"`);
  body+=t(908,height-43,`${data.length} ПОКАЗАТЕЛЕЙ`,10,'text-anchor="end" letter-spacing="1"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}"><rect width="${width}" height="${height}" fill="${paper}"/><g font-family="Arial, Helvetica, sans-serif" fill="${ink}">${body}</g></svg>`;
}
export function referenceArt(index) {
  const colors = [['#D8E568','#22251F'],['#DDBEAA','#4F6257'],['#BBC5D1','#24272B']][index];
  const motifs = [
    `<text x="18" y="37" font-size="11" letter-spacing="2">FORM &amp; FUNCTION</text><text x="16" y="105" font-size="69" letter-spacing="-5">68</text><rect x="18" y="130" width="172" height="34" fill="${colors[0]}"/><rect x="18" y="169" width="122" height="16" fill="${colors[1]}"/><rect x="18" y="191" width="74" height="8" fill="${colors[1]}"/>`,
    `<text x="18" y="34" font-size="10" letter-spacing="2">THE BALANCE STUDY</text><circle cx="105" cy="118" r="63" fill="${colors[0]}"/><path d="M105 55A63 63 0 0 1 168 118H105Z" fill="${colors[1]}"/><circle cx="105" cy="118" r="28" fill="#F5F4EF"/><text x="18" y="213" font-size="11">Less, but better.</text>`,
    `<text x="18" y="34" font-size="10" letter-spacing="2">A SYSTEM OF THINGS</text><rect x="18" y="58" width="79" height="79" fill="${colors[0]}"/><rect x="105" y="58" width="79" height="79" fill="${colors[1]}"/><rect x="18" y="145" width="79" height="60" fill="${colors[1]}"/><path d="M105 145H184M105 155H184M105 165H184M105 175H184M105 185H184M105 195H160" stroke="${colors[1]}"/>`
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="210" height="240" viewBox="0 0 210 240"><rect width="210" height="240" fill="#F5F4EF"/><g fill="${colors[1]}" font-family="Arial, sans-serif">${motifs[index]}</g></svg>`;
}

export function makeTextChart(data, options, variant = 0) {
  const {title='Обзор данных',subtitle='',palette=[],source='',fontWeight=600}=options;
  const colors=palette.length?palette:['#D8E568','#B8C9BA','#C3C5CF'];
  const columns=variant===2?2:1, columnWidth=columns===2?408:856;
  const wrap=(text,max)=>{
    const words=String(text).split(/\s+/),lines=[];let line='';
    for(let word of words){while(word.length>max){if(line){lines.push(line);line='';}lines.push(word.slice(0,max));word=word.slice(max);}if((line+' '+word).trim().length>max){lines.push(line);line=word;}else line=(line+' '+word).trim();}if(line)lines.push(line);return lines;
  };
  const blocks=data.map(d=>({heading:wrap(d.label,columns===2?27:variant===0?26:60),body:wrap(d.text,columns===2?43:variant===0?61:90)}));
  const rows=[];for(let i=0;i<blocks.length;i+=columns){const group=blocks.slice(i,i+columns);rows.push({group,offset:i,height:Math.max(...group.map(b=>variant===0?Math.max(b.heading.length*24,b.body.length*22)+48:b.heading.length*26+b.body.length*22+62))});}
  const height=Math.max(720,280+rows.reduce((sum,r)=>sum+r.height,0));
  const text=(x,y,value,size=16,attrs='')=>`<text x="${x}" y="${y}" font-size="${size}" ${attrs}>${esc(value)}</text>`;
  let body=text(52,53,'FORMA / TEXT STUDY',12,'letter-spacing="2"')+text(908,53,`0${variant+1} — ${['OVERVIEW','EDITORIAL','MODULES'][variant]}`,11,'text-anchor="end" letter-spacing="1"')+`<path d="M52 77H908" stroke="#20221F"/>`;
  body+=text(52,129,short(title,44),35,`font-weight="${fontWeight}" letter-spacing="-1.2"`)+text(52,159,short(subtitle||'Идеи, собранные в ясную систему.',84),15,'fill="#777B71"');
  let y=216;
  for(const row of rows){row.group.forEach((b,j)=>{
    const i=row.offset+j,x=52+j*448;
    body+=`<rect x="${x}" y="${y-13}" width="${variant===2?columnWidth:4}" height="${variant===2?4:row.height-30}" fill="${colors[i%colors.length]}"/>`;
    if(variant===0){b.heading.forEach((line,k)=>body+=text(x+22,y+k*24,line,18,'font-weight="600"'));b.body.forEach((line,k)=>body+=text(365,y+k*22,line,16,'fill="#59604F"'));}
    else{const top=y+(variant===2?18:0);b.heading.forEach((line,k)=>body+=text(x+(variant===2?0:22),top+k*26,line,21,'font-weight="600"'));b.body.forEach((line,k)=>body+=text(x+(variant===2?0:22),top+b.heading.length*26+8+k*22,line,16,'fill="#59604F"'));}
    body+=`<path d="M${x} ${y+row.height-27}H${x+columnWidth}" stroke="#E5E6DE"/>`;
  });y+=row.height;}
  body+=`<path d="M52 ${height-72}H908" stroke="#20221F"/>`+text(52,height-43,short(source,95),11,'fill="#777B71"')+text(908,height-43,`${data.length} ЗАПИСЕЙ`,10,'text-anchor="end" letter-spacing="1"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="${height}" viewBox="0 0 960 ${height}" role="img" aria-label="${esc(title)}"><rect width="960" height="${height}" fill="#FAFAF6"/><g font-family="Arial, Helvetica, sans-serif" fill="#20221F">${body}</g></svg>`;
}
