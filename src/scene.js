import {escapeText as esc} from './data.js';
const finite=(value,min,max,name)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`Некорректный параметр композиции: ${name}`);return value;};
const color=value=>{if(typeof value!=='string'||!/^#[\da-f]{6}$/i.test(value))throw new Error('Некорректный цвет композиции');return value;};
const path=value=>{if(typeof value!=='string'||value.length>12000||!/^\s*[Mm][\d\s.,+\-eEMmLlHhVvCcSsQqTtAaZz]+$/.test(value))throw new Error('Некорректная векторная форма');return value;};
export function validateScene(scene,data){
 if(!scene||!Array.isArray(scene.marks)||!Array.isArray(scene.decorations)||!Array.isArray(scene.texts))throw new Error('Модель вернула неполную композицию');
 finite(scene.width,600,2400,'width');finite(scene.height,400,3200,'height');color(scene.background);finite(scene.grain,0,.3,'grain');
 if(scene.marks.length!==data.length)throw new Error('В композиции потеряны или добавлены записи');
 const used=new Set();let metricEncoding;
 for(const m of scene.marks){finite(m.index,0,data.length-1,'index');if(!Number.isInteger(m.index)||used.has(m.index))throw new Error('Данные повторяются в композиции');used.add(m.index);path(m.shape);color(m.fill);color(m.stroke);finite(m.strokeWidth,0,5,'strokeWidth');finite(m.opacity,.1,1,'opacity');finite(m.x,0,scene.width,'x');finite(m.y,0,scene.height,'y');finite(m.width,1,scene.width,'mark width');finite(m.height,1,scene.height,'mark height');finite(m.rotation,-360,360,'rotation');
 if(!['height','area','length','none'].includes(m.encoding))throw new Error('Неизвестный способ отображения величин');
 if(typeof data[m.index].value==='number'&&m.encoding==='none')throw new Error('Числовые данные должны кодироваться размером');
 if(typeof data[m.index].value==='number'){const signature=JSON.stringify([m.encoding,m.width,m.height]);if(metricEncoding&&signature!==metricEncoding)throw new Error('Размеры сравниваемых величин используют разные масштабы');metricEncoding=signature;}
 if(m.x+m.width>scene.width||m.y-m.height<0)throw new Error('Графика выходит за пределы листа');
 }
 if(scene.decorations.length>150||scene.texts.length>250)throw new Error('Слишком сложная композиция');
 for(const d of scene.decorations){path(d.path);color(d.fill);color(d.stroke);finite(d.strokeWidth,0,5,'strokeWidth');finite(d.opacity,0,1,'opacity');finite(d.blur,0,40,'blur');}
 for(const t of scene.texts){finite(t.x,0,scene.width,'text x');finite(t.y,0,scene.height,'text y');finite(t.size,6,90,'text size');color(t.color);if(!['start','middle','end'].includes(t.anchor))throw new Error('Некорректное выравнивание');if(!['title','subtitle','label','value','body','note'].includes(t.binding))throw new Error('Неизвестная привязка текста');if(['label','value','body'].includes(t.binding)){finite(t.index,0,data.length-1,'text index');if(!Number.isInteger(t.index))throw new Error('Некорректная привязка данных');}if(t.binding==='note'&&(/[\d]/.test(t.text)||t.text.length>300))throw new Error('Пояснение не должно добавлять числовые данные');}
 return scene;
}
export function renderScene(scene,data,options={}){
 validateScene(scene,data);const max=Math.max(1,...data.map(d=>Math.abs(d.value||0)));let shapes='';
 const hash=JSON.stringify(scene).split('').reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261).toString(36);
 const defs=`<filter id="grain-${hash}" x="0%" y="0%" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed="17"/><feColorMatrix type="saturate" values="0"/></filter>`;
 scene.decorations.forEach((d,i)=>{shapes+=d.blur?`<defs><filter id="blur${hash}-${i}" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${d.blur}"/></filter></defs>`:'';shapes+=`<path d="${d.path}" fill="${d.fill}" stroke="${d.stroke}" stroke-width="${d.strokeWidth}" opacity="${d.opacity}"${d.blur?` filter="url(#blur${hash}-${i})"`:''}/>`;});
 for(const m of scene.marks){const d=data[m.index],ratio=typeof d.value==='number'?Math.abs(d.value)/max:1;let sx=m.width/100,sy=m.height/100;
 if(m.encoding==='height')sy*=ratio;else if(m.encoding==='length')sx*=ratio;else if(m.encoding==='area'){sx*=Math.sqrt(ratio);sy*=Math.sqrt(ratio);}
 const top=m.y-100*sy;
 shapes+=`<g data-index="${m.index}" data-value="${esc(d.value??'')}" transform="rotate(${m.rotation} ${m.x+m.width/2} ${m.y})"><path d="${m.shape}" transform="translate(${m.x} ${top}) scale(${sx} ${sy})" fill="${m.fill}" stroke="${m.stroke}" stroke-width="${m.strokeWidth}" vector-effect="non-scaling-stroke" opacity="${m.opacity}"/></g>`;
 }
 for(const t of scene.texts){const row=data[t.index];let value=({title:options.title||'',subtitle:options.subtitle||'',label:row?.label||'',value:typeof row?.value==='number'?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:4}).format(row.value)+(options.unit?' '+options.unit:''):'',body:row?.text||'',note:t.text||''})[t.binding];shapes+=`<text x="${t.x}" y="${t.y}" font-size="${t.size}" fill="${t.color}" text-anchor="${t.anchor}">${esc(value)}</text>`;}
 if(scene.grain)shapes+=`<rect width="100%" height="100%" filter="url(#grain-${hash})" opacity="${scene.grain}" pointer-events="none"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-label="${esc(options.title||'Инфографика')}"><defs>${defs}</defs><rect width="100%" height="100%" fill="${scene.background}"/><g font-family="Arial, Helvetica, sans-serif">${shapes}</g></svg>`;
}
