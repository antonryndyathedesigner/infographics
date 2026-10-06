export function applyEdits(input,data,settings){
  let rows=data.map(d=>({...d})),options={...settings,hidden:{...settings.hidden}};const applied=[],unsupported=[];
  const commands=input.split(/[\n;]+/).map(s=>s.trim()).filter(Boolean);
  for(const command of commands){
    const lower=command.toLowerCase();let match;
    if((match=command.match(/^(?:убери|убрать|исключи|исключить)\s+[«"'](.+?)[»"']\s*$/i))){const name=match[1].toLowerCase();const count=rows.length;rows=rows.filter(d=>d.label.toLowerCase()!==name);if(rows.length===count)unsupported.push(`Категория «${match[1]}» не найдена`);else applied.push(`Исключено: ${match[1]}`);}
    else if(/^(убери|убрать|скрой|скрыть)\s+(заголовок|название)\s*$/.test(lower)){options.hidden.title=true;applied.push('Заголовок скрыт');}
    else if(/^(верни|покажи|показать)\s+(заголовок|название)\s*$/.test(lower)){options.hidden.title=false;applied.push('Заголовок показан');}
    else if(/^(убери|убрать|скрой|скрыть)\s+(подписи|названия категорий)\s*$/.test(lower)){options.hidden.labels=true;applied.push('Подписи скрыты');}
    else if(/^(верни|покажи|показать)\s+подписи\s*$/.test(lower)){options.hidden.labels=false;applied.push('Подписи показаны');}
    else if(/^(убери|убрать|скрой|скрыть)\s+(числа|значения|цифры)\s*$/.test(lower)){options.hidden.values=true;applied.push('Числа скрыты');}
    else if(/^(верни|покажи|показать)\s+(числа|значения|цифры)\s*$/.test(lower)){options.hidden.values=false;applied.push('Числа показаны');}
    else if(/^(убери|убрать|скрой|скрыть)\s+(линии|сетку|разделители)\s*$/.test(lower)){options.hidden.grid=true;applied.push('Линии скрыты');}
    else if(/^(верни|покажи|показать)\s+(линии|сетку|разделители)\s*$/.test(lower)){options.hidden.grid=false;applied.push('Линии показаны');}
    else if((match=command.match(/^(?:заголовок|название)\s*:\s*(.+)$/i))){options.title=match[1];options.hidden.title=false;applied.push('Заголовок обновлён');}
    else if((match=command.match(/^цвет\s*:\s*(#[a-f\d]{6}|#[a-f\d]{3})\s*$/i))){options.palette=[match[1]];applied.push('Цвет обновлён');}
    else if(/^(увеличь|увеличить)\s+(текст|шрифт)\s*$/.test(lower)){options.fontScale=Math.min(1.5,(options.fontScale||1)+.15);applied.push('Текст увеличен');}
    else if(/^(уменьши|уменьшить)\s+(текст|шрифт)\s*$/.test(lower)){options.fontScale=Math.max(.75,(options.fontScale||1)-.15);applied.push('Текст уменьшен');}
    else if(/^(больше воздуха|увеличь отступы|увеличить отступы)$/.test(lower)){options.spacing=Math.min(1.8,(options.spacing||1)+.2);applied.push('Отступы увеличены');}
    else if(/^(компактнее|меньше воздуха|уменьши отступы)$/.test(lower)){options.spacing=Math.max(.75,(options.spacing||1)-.2);applied.push('Отступы уменьшены');}
    else if(/^(сортируй|сортировать|сортировка)\s+по убыванию\s*$/.test(lower)&&rows.every(d=>typeof d.value==='number')){rows.sort((a,b)=>b.value-a.value);applied.push('Сортировка по убыванию');}
    else if(/^(сортируй|сортировать|сортировка)\s+по возрастанию\s*$/.test(lower)&&rows.every(d=>typeof d.value==='number')){rows.sort((a,b)=>a.value-b.value);applied.push('Сортировка по возрастанию');}
    else if(/^(круговая|кольцевая|столбцы|столбики|полосы|карточки)$/.test(lower)&&rows.every(d=>typeof d.value==='number')){const layout=({круговая:'donut',кольцевая:'donut',столбцы:'columns',столбики:'columns',полосы:'bars',карточки:'cards'})[lower];options.layouts=[layout,...options.layouts.filter(l=>l!==layout)].slice(0,3);applied.push('Композиция обновлена');}
    else unsupported.push(command);
  }
  if(!rows.length)throw new Error('Правки удаляют все данные. Оставьте хотя бы одну категорию.');
  return {data:rows,options,applied,unsupported};
}
