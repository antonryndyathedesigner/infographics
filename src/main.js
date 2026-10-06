import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/cyrillic-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/cyrillic-700.css';
import '@fontsource/manrope/latin-800.css';
import '@fontsource/manrope/cyrillic-800.css';
import './style.css';
import * as XLSX from 'xlsx';
import {demoRows, escapeText as esc, inferColumns, seriesFromRows, normalizePalette} from './data.js';
import {makeChart, makeTextChart, referenceArt} from './charts.js';
const icons = {
 plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>', file:'<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h8"/>', check:'<path d="m5 12 4 4L19 6"/>', download:'<path d="M12 4v12m-5-5 5 5 5-5M4 17v4h16v-4"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', grid:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>', sparkle:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>', back:'<path d="M19 12H5m5-5-5 5 5 5"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>'
};
const icon = (name, size=18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icons[name]}</svg>`;
const defaultRefs = ['Типографика и ритм','Баланс и пропорции','Модульная система'].map((name,i)=>({id:'demo-'+i,name,image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(referenceArt(i)),colors:[['#D8E568','#B8C9BA'],['#DDBEAA','#4F6257'],['#BBC5D1','#24272B']][i],demo:true}));
let saved = [];
try { saved = JSON.parse(localStorage.getItem('forma-references') || '[]'); if (!Array.isArray(saved)) saved=[];saved=saved.filter(r=>r && typeof r.id==='string' && typeof r.name==='string' && typeof r.image==='string' && r.image.startsWith('data:image/') && Array.isArray(r.colors)); } catch { saved=[]; }
const state = {refs:[...defaultRefs,...saved], selected:new Set(['demo-0']),rows:demoRows.map(r=>[...r]),filename:'Дизайн в цифрах · пример',label:0,value:1,sheetNames:[],sheetName:'',workbook:null,page:'studio',variants:[],active:0,mode:'numeric', generated:false, generation:0,changed:false};
let toastTimer;
function toast(message, error=false) { const el=document.querySelector('#toast');el.textContent=message;el.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),5500); }
function persistRefs() { try { localStorage.setItem('forma-references',JSON.stringify(state.refs.filter(r=>!r.demo)));return true; } catch { toast('Память браузера заполнена. Референс доступен до закрытия страницы.',true);return false; } }
function render() {
  document.querySelector('#app').innerHTML=`
    <header class="header"><a class="brand" href="#" aria-label="FORMA — главная">FORMA<span class="brand-mark">®</span></a><div class="header-divider"></div><span class="brand-description">СТУДИЯ ИНФОГРАФИКИ</span><nav aria-label="Основная навигация"><button class="nav-btn ${state.page==='studio'?'active':''}" data-page="studio">Рабочая область</button><button class="nav-btn ${state.page==='library'?'active':''}" data-page="library">Библиотека <span class="nav-count">${state.refs.length}</span></button></nav><span class="version"><span class="status-dot"></span>MVP / 01</span></header>
    <main><div class="page-heading"><div><div class="eyebrow">ИНСТРУМЕНТ ДЛЯ ЯСНЫХ ИДЕЙ</div><h1>${state.page==='studio'?'Данные. Форма. Смысл.':'Ваша визуальная библиотека.'}</h1><p>${state.page==='studio'?'Превратите данные в инфографику. Задайте направление — остальное сложится.':'Сохраняйте визуальные приёмы. Соединяйте их в новых композициях.'}</p></div><div class="heading-aside">МЕНЬШЕ ШУМА.<br><span>БОЛЬШЕ СМЫСЛА.</span><span class="tiny-rule"></span></div></div>
    ${state.page==='studio'?studioHTML():libraryHTML()}
    <footer><span>FORMA © ${new Date().getFullYear()}</span><span>Хороший дизайн делает сложное понятным.</span><span>Сделано для ясности <span class="footer-square"></span></span></footer></main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div><input id="reference-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" multiple hidden><input id="data-input" type="file" accept=".xlsx,.xls,.csv,.tsv,.ods,.json" hidden><dialog id="reference-dialog"></dialog>`;
  bindGlobal();
  if(state.page==='studio') bindStudio();
  else bindLibrary();
}
function referenceCards(library=false) {
  return state.refs.map(ref=>`<article class="reference-card ${state.selected.has(ref.id)?'selected':''}"><button class="reference-image" data-select="${esc(ref.id)}" aria-label="${state.selected.has(ref.id)?'Убрать':'Выбрать'} референс ${esc(ref.name)}" aria-pressed="${state.selected.has(ref.id)}"><img src="${esc(ref.image)}" alt="${esc(ref.name)}"><span class="selection-box">${state.selected.has(ref.id)?icon('check',12):''}</span>${ref.demo?'<span class="ref-tag">ПРИМЕР</span>':''}</button><div class="ref-caption"><button data-view="${esc(ref.id)}" title="Открыть референс">${esc(ref.name)}</button>${!ref.demo?`<button class="remove-ref" data-remove="${esc(ref.id)}" aria-label="Удалить ${esc(ref.name)}">${icon('close',12)}</button>`:'<span class="ref-index">0'+(defaultRefs.findIndex(r=>r.id===ref.id)+1)+'</span>'}</div></article>`).join('')+`<button class="reference-add" id="add-reference">${icon('plus',24)}<span>Добавить<br>референсы</span><small>PNG, JPG, WEBP</small></button>`;
}
function sectionTitle(n,title,badge='') {return `<div class="section-title"><span class="step-number">${n}</span><h2>${title}</h2>${badge?`<span class="section-badge">${badge}</span>`:''}</div>`;}
function studioHTML() {
  return `<div class="studio-layout"><aside class="controls">
    <section class="control-section refs-section">${sectionTitle('01','Визуальное направление')}<p class="section-description">Выберите один или несколько референсов.<br>Их приёмы станут основой, а не копией.</p><div class="reference-grid">${referenceCards()}</div><div class="ref-meta"><span>${icon('grid',13)} <span id="selected-count">${state.selected.size} ${refWord(state.selected.size)}</span></span><button class="text-link" data-page="library">Вся библиотека ${icon('arrow',13)}</button></div></section>
    <section class="control-section">${sectionTitle('02','Ваши данные')}<label class="drop-zone" id="data-drop" tabindex="0">${icon('upload',23)}<strong>Перетащите таблицу сюда</strong><span>или <u>выберите файл</u></span><small>XLSX, XLS, CSV, TSV, ODS, JSON · до 10 МБ</small></label><div class="file-status">${icon('file',18)}<div><strong id="filename">${esc(state.filename)}</strong><span id="row-count">${state.rows.length-1} строк · ${state.rows[0].length} столбца</span></div><span class="file-check">${icon('check',16)}</span></div><div id="sheet-area">${sheetHTML()}</div><div class="column-controls"><label>Подписи<select id="label-column">${columnOptions(state.label)}</select></label><label>Значения<select id="value-column">${columnOptions(state.value)}</select></label></div><button class="text-link" id="toggle-table">Посмотреть данные ${icon('arrow',13)}</button><div id="table-preview" hidden>${tableHTML()}</div></section>
    <section class="control-section details-section">${sectionTitle('03','Детали', 'НЕОБЯЗАТЕЛЬНО')}<label class="field-label" for="chart-title">Название инфографики</label><input id="chart-title" type="text" maxlength="100" value="Дизайн в цифрах" placeholder="Например, результаты исследования"><div class="palette-heading"><label class="field-label" for="palette-input">Цветовая палитра</label><span>ДО 20 ЦВЕТОВ</span></div><input id="palette-input" type="text" value="" placeholder="#D8E568 #20221F" aria-describedby="palette-help"><div class="palette-preview" id="palette-preview"></div><p class="field-help" id="palette-help">HEX через пробел. Пустое поле — цвета из референсов.</p><label class="field-label" for="details-input">Контекст и пожелания</label><textarea id="details-input" rows="2" maxlength="300" placeholder="Короткое пояснение к данным…"></textarea><p class="field-help">Текст появится под заголовком инфографики.</p></section>
    <div class="generate-area"><button class="primary-button" id="generate">${icon('sparkle',18)}<span>Сгенерировать инфографику</span>${icon('arrow',18)}</button><p>3 варианта композиции · SVG и PNG</p></div>
  </aside><section class="workspace" aria-label="Предпросмотр инфографики"><div class="workspace-toolbar"><div class="workspace-label"><span class="status-dot"></span><span id="preview-label">ПРЕДПРОСМОТР</span></div><button class="text-link" id="reset-demo">Сбросить пример ${icon('back',13)}</button></div><div class="preview-stage"><div class="paper" id="chart-preview">${makeChart(seriesFromRows(state.rows,state.label,state.value),{title:'Дизайн в цифрах',subtitle:'Области, в которых рождаются новые идеи.',palette:['#D8E568','#B8C9BA','#C3C5CF','#E0CCB3','#BDBDB6'],unit:'%',source:'Демонстрационные данные / 2026'},0)}</div><div class="preview-caption"><span id="preview-caption">01 / ЛИНЕЙНАЯ КОМПОЗИЦИЯ</span><span>960 × 720 PX</span></div></div><div class="variants-area"><div class="variants-header"><h3>Одна идея. Разные формы.</h3><span id="variants-count">03 ВАРИАНТА</span></div><div class="variant-grid" id="variant-grid">${variantsHTML()}</div><div class="workspace-bottom"><span>${icon('info',15)}<span id="result-note">Это пример. Загрузите данные и создайте свою инфографику.</span></span><div class="export-buttons"><button id="export-svg" title="Скачать редактируемую векторную инфографику">${icon('download',15)} SVG</button><button id="export-png" title="Скачать PNG в двойном разрешении">${icon('download',15)} PNG</button></div></div></div><div class="principle"><span class="principle-number">10 / 10</span><p>Хороший дизайн — это как можно меньше дизайна.</p><span>ДИТЕР РАМС</span></div></section></div>`;
}
function refWord(n){return n===1?'референс выбран':n>1&&n<5?'референса выбрано':'референсов выбрано';}
function libraryHTML() {return `<section class="library-panel"><div class="library-toolbar"><span>${state.refs.length} РЕФЕРЕНСОВ / ${state.selected.size} ВЫБРАНО</span><button class="primary-button compact" id="library-upload">${icon('plus')} Добавить референсы</button></div><div class="reference-grid library-grid">${referenceCards(true)}</div><div class="library-footer"><p>Выбранные референсы смешиваются при генерации. Ваши изображения сохраняются только в этом браузере.</p><button class="primary-button compact" data-page="studio">К рабочей области ${icon('arrow')}</button></div></section>`;}
function sheetHTML(){return state.sheetNames.length>1?`<label class="field-label">Лист<select id="sheet-select">${state.sheetNames.map(n=>`<option ${n===state.sheetName?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`:'';}
function columnOptions(selected){return state.rows[0].map((h,i)=>`<option value="${i}" ${i===selected?'selected':''}>${esc(h || 'Столбец '+(i+1))}</option>`).join('');}
function tableHTML(){return `<div class="table-scroll"><table><thead><tr>${state.rows[0].map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${state.rows.slice(1,7).map(r=>`<tr>${state.rows[0].map((_,i)=>`<td>${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${state.rows.length>7?'<small>Первые 6 строк таблицы</small>':''}`;}
const variantNames=['Линейная','Типографическая','Распределение'];
function variantName(i){return state.mode==='text'?['Обзор','Редакционная','Модульная'][i]:variantNames[i];}
function demoVariants(){return [0,1,2].map(i=>makeChart(seriesFromRows(demoRows,0,1),{title:'Дизайн в цифрах',subtitle:'Области, в которых рождаются новые идеи.',palette:['#D8E568','#B8C9BA','#C3C5CF','#E0CCB3','#BDBDB6'],unit:'%',source:'Демонстрационные данные / 2026'},i));}
function variantsHTML(){const variants=state.variants.length?state.variants:demoVariants();return variants.map((svg,i)=>`<button class="variant-card ${i===state.active?'active':''}" data-variant="${i}" aria-pressed="${i===state.active}"><div class="variant-thumb">${svg}</div><span><span class="variant-number">0${i+1}</span>${variantName(i)}<span class="variant-check">${i===state.active?icon('check',13):''}</span></span></button>`).join('');}
function bindGlobal(){
  document.querySelectorAll('[data-page]').forEach(el=>el.onclick=()=>{rememberFields();state.page=el.dataset.page;render();restoreFields();});
  document.querySelector('.brand').onclick=e=>{e.preventDefault();rememberFields();state.page='studio';render();restoreFields();};
  document.querySelector('#reference-input').onchange=e=>uploadReferences(e.target.files);
  bindReferences();
}
let fields;
function rememberFields(){if(document.querySelector('#chart-title')) fields={title:document.querySelector('#chart-title').value,palette:document.querySelector('#palette-input').value,details:document.querySelector('#details-input').value};}
function restoreFields(){if(fields&&document.querySelector('#chart-title')) {document.querySelector('#chart-title').value=fields.title;document.querySelector('#palette-input').value=fields.palette;document.querySelector('#details-input').value=fields.details;updatePalette();}if(document.querySelector('#chart-preview'))showVariant(state.active);}
function bindReferences(){
  document.querySelector('#add-reference').onclick=()=>document.querySelector('#reference-input').click();
  document.querySelectorAll('[data-select]').forEach(el=>el.onclick=()=>{const id=el.dataset.select;state.selected.has(id)?state.selected.delete(id):state.selected.add(id);rememberFields();render();restoreFields();if(state.page==='studio')markDirty();});
  document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{state.refs=state.refs.filter(r=>r.id!==el.dataset.remove);state.selected.delete(el.dataset.remove);persistRefs();rememberFields();render();restoreFields();toast('Референс удалён из библиотеки.');});
  document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{const ref=state.refs.find(r=>r.id===el.dataset.view);const dialog=document.querySelector('#reference-dialog');dialog.innerHTML=`<div class="dialog-header"><strong>${esc(ref.name)}</strong><button aria-label="Закрыть">${icon('close')}</button></div><img src="${esc(ref.image)}" alt="${esc(ref.name)}"><p>Выберите карточку, чтобы использовать цвета этого референса.</p>`;dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};dialog.showModal();});
}
function bindLibrary(){document.querySelector('#library-upload').onclick=()=>document.querySelector('#reference-input').click();}
function bindStudio(){
  document.querySelector('#data-input').onchange=e=>{if(e.target.files[0])loadData(e.target.files[0]);};
  const drop=document.querySelector('#data-drop');drop.onclick=()=>document.querySelector('#data-input').click();drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();drop.click();}};drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files[0])loadData(e.dataTransfer.files[0]);};
  document.querySelector('#label-column').onchange=e=>{state.label=Number(e.target.value);markDirty();};document.querySelector('#value-column').onchange=e=>{state.value=Number(e.target.value);markDirty();};
  document.querySelector('#toggle-table').onclick=()=>{const el=document.querySelector('#table-preview');el.hidden=!el.hidden;};
  document.querySelector('#sheet-select')?.addEventListener('change',e=>setSheet(e.target.value));
  document.querySelector('#palette-input').oninput=()=>{updatePalette();markDirty();};
  document.querySelector('#chart-title').oninput=markDirty;document.querySelector('#details-input').oninput=markDirty;
  document.querySelector('#generate').onclick=generate;
  document.querySelector('#reset-demo').onclick=()=>{state.rows=demoRows.map(r=>[...r]);state.filename='Дизайн в цифрах · пример';state.label=0;state.value=1;state.sheetNames=[];state.workbook=null;state.variants=[];state.active=0;state.generated=false;state.changed=false;state.mode='numeric';fields=null;render();};
  document.querySelector('#export-svg').onclick=()=>exportChart('svg');document.querySelector('#export-png').onclick=()=>exportChart('png');
  bindVariants();updatePalette();
}
function bindVariants(){document.querySelectorAll('[data-variant]').forEach(el=>el.onclick=()=>showVariant(Number(el.dataset.variant)));}
function showVariant(i){state.active=i;const svg=(state.variants.length?state.variants:demoVariants())[i];document.querySelector('#chart-preview').innerHTML=svg;document.querySelector('#variant-grid').innerHTML=variantsHTML();bindVariants();document.querySelector('#preview-caption').textContent=`0${i+1} / ${variantName(i).toUpperCase()} КОМПОЗИЦИЯ`;document.querySelector('.preview-caption span:last-child').textContent=`960 × ${svg.match(/height="(\d+)"/)[1]} PX`;document.querySelector('#preview-label').textContent=state.generated?'ВАША ИНФОГРАФИКА':'ПРЕДПРОСМОТР';if(state.generated)document.querySelector('#result-note').textContent=state.changed?'Настройки изменились. Нажмите «Сгенерировать», чтобы обновить результат.':'Варианты готовы. Выберите композицию и скачайте результат.';}
function markDirty(){if(state.generated)state.changed=true;if(state.generated)document.querySelector('#result-note').textContent='Настройки изменились. Нажмите «Сгенерировать», чтобы обновить результат.';}
function updatePalette(){const el=document.querySelector('#palette-preview');try {let colors=normalizePalette(document.querySelector('#palette-input').value);if(!colors.length)colors=[...new Set(state.refs.filter(r=>state.selected.has(r.id)).flatMap(r=>r.colors))].slice(0,20);el.innerHTML=colors.map(c=>`<span style="background:${c}" title="${c}"></span>`).join('');document.querySelector('#palette-input').removeAttribute('aria-invalid');}catch{el.innerHTML='';document.querySelector('#palette-input').setAttribute('aria-invalid','true');}}
function generate(){
  try {
    const palette=normalizePalette(document.querySelector('#palette-input').value);
    if(state.label===state.value)throw new Error('Выберите разные столбцы для подписей и значений.');
    let data=seriesFromRows(state.rows,state.label,state.value);
    const mode=data.length?'numeric':'text';
    if(mode==='text')data=state.rows.slice(1).filter(r=>String(r[state.label]??'').trim() && String(r[state.value]??'').trim()).map(r=>({label:String(r[state.label]),text:String(r[state.value])}));
    if(!data.length)throw new Error('В выбранных столбцах нет данных. Выберите другие столбцы.');
    if(mode==='text' && data.some(d=>d.text.length>1500||d.label.length>300))throw new Error('Для текстовой инфографики сократите запись до 1500 символов, а заголовок — до 300.');
    if(data.length>100)throw new Error('Для читаемой инфографики используйте до 100 показателей. Сократите таблицу.');
    const refs=state.refs.filter(r=>state.selected.has(r.id));
    const refPalette=[...new Set(refs.flatMap(r=>r.colors))].slice(0,20);
    const options={title:document.querySelector('#chart-title').value.trim()||'Обзор данных',subtitle:document.querySelector('#details-input').value.trim()||'Каждое число — часть общей картины.',palette:palette.length?palette:refPalette,fontWeight:refs.length?Math.round(refs.reduce((sum,r)=>sum+(r.weight||600),0)/refs.length/100)*100:600,source:'Источник: '+state.filename,unit:(String(state.rows[0][state.value]).includes('%') || state.rows.slice(1).some(r=>typeof r[state.value]==='string' && r[state.value].trim().endsWith('%')))?'%':''};
    state.mode=mode;state.variants=[0,1,2].map(i=>(mode==='text'?makeTextChart:makeChart)(data,options,i));state.generated=true;state.changed=false;state.generation++;showVariant(0);
    const ignored=state.rows.length-1-data.length;
    toast(ignored?`Готово: ${data.length} записей. Строк без подписи или числа пропущено: ${ignored}.`:'Три варианта готовы. Выберите свою композицию.');
  } catch(error){toast(error.message,true);}
}
function sheetRows(sheet){
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',blankrows:true});
  if(!sheet['!ref'])return rows;
  const range=XLSX.utils.decode_range(sheet['!ref']);
  rows.forEach((row,r)=>row.forEach((value,c)=>{const cell=sheet[XLSX.utils.encode_cell({r:r+range.s.r,c:c+range.s.c})];if(cell?.t==='n' && /%/.test(cell.z||''))row[c]=String(cell.v*100)+'%';}));
  return rows;
}
function setRows(rows){rows=rows.filter(r=>r.some(v=>String(v??'').trim()));if(rows.length<2||rows[0].length<2)throw new Error('Нужны заголовки и хотя бы одна строка данных в двух столбцах.');if(rows.length>10001)throw new Error('В таблице слишком много строк. Максимум — 10 000.');const cols=inferColumns(rows);state.rows=rows;state.label=cols.label;state.value=cols.value;}
async function loadData(file){
  if(!/\.(xlsx|xls|csv|tsv|ods|json)$/i.test(file.name))return toast('Поддерживаются XLSX, XLS, CSV, TSV, ODS и JSON.',true);
  if(file.size>10*1024*1024)return toast('Таблица должна быть не больше 10 МБ.',true);
  try {
    let wb;
    if(file.name.toLowerCase().endsWith('.json')){const data=JSON.parse(await file.text());if(!Array.isArray(data)||!data.length)throw new Error('JSON должен содержать массив объектов или строк.');const sheet=Array.isArray(data[0])?XLSX.utils.aoa_to_sheet(data):XLSX.utils.json_to_sheet(data);wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,sheet,'Данные');}
    else if(/\.(csv|tsv)$/i.test(file.name))wb=XLSX.read(await file.text(),{type:'string',raw:true});
    else wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true,cellNF:true});
    const rows=sheetRows(wb.Sheets[wb.SheetNames[0]]);setRows(rows);state.workbook=wb;state.sheetNames=wb.SheetNames;state.sheetName=wb.SheetNames[0];state.filename=file.name;rememberFields();render();restoreFields();markDirty();toast('Таблица загружена. Проверьте столбцы и нажмите «Сгенерировать».');
  } catch(error){toast('Не удалось прочитать таблицу: '+error.message,true);}
}
function setSheet(name){try{setRows(sheetRows(state.workbook.Sheets[name]));state.sheetName=name;rememberFields();render();restoreFields();document.querySelector('#sheet-select').value=name;markDirty();}catch(e){toast(e.message,true);}}
async function uploadReferences(files){
  let added=0;
  for(const file of files){
    if(!/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type)){toast('Поддерживаются PNG, JPG, WEBP, GIF, AVIF и BMP.',true);continue;}
    if(file.size>10*1024*1024){toast('Изображение должно быть не больше 10 МБ.',true);continue;}
    try {
      const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const sample=document.createElement('canvas');sample.width=sample.height=64;const sc=sample.getContext('2d',{willReadFrequently:true});sc.drawImage(canvas,0,0,64,64);const pixels=sc.getImageData(0,0,64,64).data;const bins=new Map();for(let p=0;p<pixels.length;p+=4){const [r,g,b]=[pixels[p],pixels[p+1],pixels[p+2]];if(Math.max(r,g,b)-Math.min(r,g,b)<20)continue;const color='#'+[r,g,b].map(c=>Math.min(255,Math.round(c/32)*32).toString(16).padStart(2,'0')).join('').toUpperCase();bins.set(color,(bins.get(color)||0)+1);}const colors=[...bins.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
      let dark=0;for(let p=0;p<pixels.length;p+=4)if(pixels[p]*.2126+pixels[p+1]*.7152+pixels[p+2]*.0722<80)dark++;const weight=dark/(pixels.length/4)>.25?700:500;const ref={id:crypto.randomUUID(),name:file.name,image:canvas.toDataURL('image/jpeg',.85),weight,colors:colors.length?colors:['#A7ABA0','#D3D5CE']};state.refs.push(ref);state.selected.add(ref.id);added++;
    }catch{toast('Не удалось открыть изображение '+file.name,true);}
  }
  if(!added)return;const stored=persistRefs();rememberFields();render();restoreFields();if(stored)toast('Референсы сохранены в библиотеке этого браузера.');
}
function download(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportChart(format){
  const svg=(state.variants.length?state.variants:demoVariants())[state.active];
  if(format==='svg'){download(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`forma-${state.active+1}.svg`);toast('SVG сохранён. Его можно редактировать в Figma или Illustrator.');return;}
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');const scale=Math.min(2,16000/img.height,16000/img.width,Math.sqrt(32000000/(img.width*img.height)));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error();download(blob,`forma-${state.active+1}@2x.png`);toast(`PNG сохранён: ${canvas.width} × ${canvas.height} px.`);}catch{toast('Не удалось экспортировать PNG. Попробуйте SVG.',true);}finally{URL.revokeObjectURL(url);}
}
render();
