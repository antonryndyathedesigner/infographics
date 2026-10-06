import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/cyrillic-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/cyrillic-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/cyrillic-600.css';
import './style.css';
import * as XLSX from 'xlsx';
import {escapeText as esc,inferColumns,seriesFromRows,normalizePalette} from './data.js';
import {makeChart,makeTextChart,actualLayout,layoutNames} from './charts.js';
import {analyzePixels,blendProfiles} from './style-profile.js';
import {applyEdits} from './edits.js';
const icon=(name)=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${{plus:'<path d="M12 5v14M5 12h14"/>',download:'<path d="M12 4v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',check:'<path d="m5 12 4 4L19 6"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>'}[name]}</svg>`;
let saved=[];
try{saved=JSON.parse(localStorage.getItem('forma-references')||'[]');if(!Array.isArray(saved))saved=[];saved=saved.filter(r=>r&&!r.demo&&typeof r.id==='string'&&typeof r.name==='string'&&typeof r.image==='string'&&r.image.startsWith('data:image/')&&Array.isArray(r.colors));}catch{}
const state={refs:saved,selected:new Set(),rows:[],filename:'',label:0,value:1,sheetNames:[],sheetName:'',workbook:null,page:'studio',variants:[],active:0,mode:'numeric',generated:false,changed:false,data:[],options:null,history:[],busy:false,form:{title:'',palette:'',subtitle:'',edits:''}};
let toastTimer;
function toast(message,error=false){const el=document.querySelector('#toast');el.textContent=message;el.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),6500);}
function persistRefs(){try{localStorage.setItem('forma-references',JSON.stringify(state.refs));return true;}catch{toast('Память браузера заполнена. Новые референсы доступны до закрытия страницы.',true);return false;}}
function referenceCards(){return state.refs.map(r=>`<article class="reference-card ${state.selected.has(r.id)?'selected':''}"><button class="reference-image" data-select="${esc(r.id)}" aria-pressed="${state.selected.has(r.id)}" aria-label="Выбрать ${esc(r.name)}"><img src="${esc(r.image)}" alt="${esc(r.name)}"><span class="selection-box">${state.selected.has(r.id)?icon('check'):''}</span></button><div class="ref-caption"><button data-view="${esc(r.id)}">${esc(r.name)}</button><button data-remove="${esc(r.id)}" aria-label="Удалить ${esc(r.name)}">${icon('close')}</button></div></article>`).join('')+`<button id="add-reference" class="reference-add">${icon('plus')}<span>Добавить</span></button>`;}
function render(){
  document.querySelector('#app').innerHTML=`<main><nav aria-label="Разделы"><button data-page="studio" class="${state.page==='studio'?'active':''}">Инфографика</button><button data-page="library" class="${state.page==='library'?'active':''}">Референсы${state.refs.length?' · '+state.refs.length:''}</button></nav>${state.page==='studio'?studioHTML():libraryHTML()}</main><input id="reference-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/bmp" multiple hidden><input id="data-input" type="file" accept=".xlsx,.xls,.csv,.tsv,.ods,.json" hidden><dialog id="reference-dialog"></dialog><div id="toast" class="toast" role="status" aria-live="polite"></div>`;
  bindGlobal();if(state.page==='studio'){bindStudio();restoreFields();}
}
function studioHTML(){return `<div class="studio-layout"><aside class="controls">
<section><h2>Референсы</h2><div class="reference-grid">${referenceCards()}</div>${state.refs.length?`<p class="help">Выбрано: ${state.selected.size}. Несколько референсов смешивают визуальные приёмы.</p>`:'<p class="help">Загрузите свои изображения и выберите нужные.</p>'}</section>
<section><h2>Данные</h2><button class="drop-zone" id="data-drop">${icon('upload')}<span>Загрузить таблицу</span><small>XLSX, XLS, CSV, TSV, ODS, JSON</small></button>${state.rows.length?`<div class="file-status"><strong id="filename">${esc(state.filename)}</strong><span>${state.rows.length-1} строк</span></div>${sheetHTML()}<div class="column-controls"><label>Подписи<select id="label-column">${columnOptions(state.label)}</select></label><label>Значения<select id="value-column">${columnOptions(state.value)}</select></label></div><button id="toggle-table" class="text-link">Посмотреть данные</button><div id="table-preview" hidden>${tableHTML()}</div>`:''}</section>
<section><h2>Настройки</h2><label for="chart-title">Заголовок</label><input id="chart-title" maxlength="100" value="${esc(state.form.title)}" placeholder="Необязательно"><label for="subtitle">Пояснение</label><textarea id="subtitle" rows="2" maxlength="300" placeholder="Необязательно">${esc(state.form.subtitle)}</textarea><label for="palette-input">Палитра HEX</label><input id="palette-input" value="${esc(state.form.palette)}" placeholder="#202020 #D8E568"><div id="palette-preview" class="palette-preview"></div><p class="help">До 20 цветов. Пустое поле — палитра референсов.</p></section>
<button class="primary-button" id="generate" ${!state.rows.length||state.busy?'disabled':''}>${state.busy?'Анализ референсов…':'Сгенерировать'}</button>
</aside><section class="workspace"><div class="workspace-toolbar"><span id="preview-label">${state.generated?'Результат':'Предпросмотр'}</span>${state.generated?'<button id="reset-result" class="text-link">Сбросить результат</button>':''}</div><div class="preview-stage"><div id="chart-preview" class="paper">${state.variants[state.active]||'<div class="empty-preview">Загрузите таблицу и нажмите «Сгенерировать».</div>'}</div></div>${state.generated?`<div id="variant-grid" class="variant-grid">${variantsHTML()}</div><div class="export-buttons"><button id="export-svg" class="primary-button">${icon('download')} Скачать SVG</button><button id="export-png" class="secondary-button">${icon('download')} PNG</button></div><p id="result-note" class="help">${state.changed?'Настройки изменились. Сгенерируйте результат заново.':''}</p><section class="refinement"><h2>Правки</h2><textarea id="edit-input" rows="3" maxlength="2000" placeholder="Убери линии; увеличь текст; больше воздуха">${esc(state.form.edits)}</textarea><div class="refinement-actions"><button id="apply-edits" class="primary-button">Применить правки</button><button id="undo-edits" class="text-link" ${state.history.length?'':'disabled'}>Отменить последнюю правку</button></div><p id="edit-feedback" class="help" role="status"></p><details><summary>Какие правки можно написать</summary><p>Одна команда на строку или через точку с запятой:</p><ul><li>Убери линии / подписи / числа / заголовок</li><li>Покажи линии / подписи / числа / заголовок</li><li>Увеличь текст / уменьши текст</li><li>Больше воздуха / компактнее</li><li>Заголовок: новое название</li><li>Цвет: #D8E568</li><li>Сортируй по убыванию / по возрастанию</li><li>Убери «Название категории»</li><li>Кольцевая / столбцы / полосы / карточки</li></ul><p>Другие формулировки пока не распознаются автоматически.</p></details></section>`:''}</section></div>`;}
function libraryHTML(){return `<section class="library"><div class="reference-grid library-grid">${referenceCards()}</div><p class="help">Изображения сохраняются в этом браузере. Нажмите карточку для выбора, название — для просмотра.</p></section>`;}
function sheetHTML(){return state.sheetNames.length>1?`<label>Лист<select id="sheet-select">${state.sheetNames.map(n=>`<option ${n===state.sheetName?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`:'';}
function columnOptions(selected){return state.rows[0].map((h,i)=>`<option value="${i}" ${i===selected?'selected':''}>${esc(h||'Столбец '+(i+1))}</option>`).join('');}
function tableHTML(){return `<div class="table-scroll"><table><thead><tr>${state.rows[0].map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${state.rows.slice(1,7).map(r=>`<tr>${state.rows[0].map((_,i)=>`<td>${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
function variantName(i){return state.mode==='text'?['Обзор','Текст','Модули'][i]:layoutNames[actualLayout(state.data,state.options,i)];}
function variantsHTML(){return state.variants.map((svg,i)=>`<button class="variant-card ${i===state.active?'active':''}" data-variant="${i}" aria-pressed="${i===state.active}"><div class="variant-thumb">${svg}</div><span>${variantName(i)}</span></button>`).join('');}
function rememberFields(){if(!document.querySelector('#chart-title'))return;state.form.title=document.querySelector('#chart-title').value;state.form.subtitle=document.querySelector('#subtitle').value;state.form.palette=document.querySelector('#palette-input').value;state.form.edits=document.querySelector('#edit-input')?.value||state.form.edits;}
function restoreFields(){if(document.querySelector('#palette-preview'))updatePalette();}
function markDirty(){if(state.generated){state.changed=true;const el=document.querySelector('#result-note');if(el)el.textContent='Настройки изменились. Сгенерируйте результат заново.';}}
function bindGlobal(){
 document.querySelectorAll('[data-page]').forEach(el=>el.onclick=()=>{rememberFields();state.page=el.dataset.page;render();});
 document.querySelector('#reference-input').onchange=e=>uploadReferences(e.target.files);
 document.querySelector('#add-reference').onclick=()=>document.querySelector('#reference-input').click();
 document.querySelectorAll('[data-select]').forEach(el=>el.onclick=()=>{rememberFields();const id=el.dataset.select;state.selected.has(id)?state.selected.delete(id):state.selected.add(id);markDirty();render();});
 document.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{rememberFields();state.refs=state.refs.filter(r=>r.id!==el.dataset.remove);state.selected.delete(el.dataset.remove);persistRefs();markDirty();render();});
 document.querySelectorAll('[data-view]').forEach(el=>el.onclick=()=>{const r=state.refs.find(r=>r.id===el.dataset.view),dialog=document.querySelector('#reference-dialog');dialog.innerHTML=`<div class="dialog-header"><span>${esc(r.name)}</span><button aria-label="Закрыть">${icon('close')}</button></div><img src="${esc(r.image)}" alt="${esc(r.name)}">`;dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};dialog.showModal();});
}
function bindStudio(){
 document.querySelector('#data-input').onchange=e=>{if(e.target.files[0])loadData(e.target.files[0]);};
 const drop=document.querySelector('#data-drop');drop.onclick=()=>document.querySelector('#data-input').click();drop.ondragover=e=>{e.preventDefault();drop.classList.add('dragging');};drop.ondragleave=()=>drop.classList.remove('dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('dragging');if(e.dataTransfer.files[0])loadData(e.dataTransfer.files[0]);};
 document.querySelector('#label-column')?.addEventListener('change',e=>{state.label=Number(e.target.value);markDirty();});document.querySelector('#value-column')?.addEventListener('change',e=>{state.value=Number(e.target.value);markDirty();});document.querySelector('#sheet-select')?.addEventListener('change',e=>setSheet(e.target.value));
 document.querySelector('#toggle-table')?.addEventListener('click',()=>{const el=document.querySelector('#table-preview');el.hidden=!el.hidden;});
 for(const id of ['chart-title','subtitle','palette-input'])document.querySelector('#'+id).oninput=()=>{rememberFields();if(id==='palette-input')updatePalette();markDirty();};
 document.querySelector('#generate').onclick=generate;
 document.querySelector('#reset-result')?.addEventListener('click',()=>{rememberFields();state.variants=[];state.generated=false;state.history=[];render();});
 document.querySelectorAll('[data-variant]').forEach(el=>el.onclick=()=>{rememberFields();state.active=Number(el.dataset.variant);render();});
 document.querySelector('#export-svg')?.addEventListener('click',()=>exportChart('svg'));document.querySelector('#export-png')?.addEventListener('click',()=>exportChart('png'));
 document.querySelector('#apply-edits')?.addEventListener('click',refine);document.querySelector('#undo-edits')?.addEventListener('click',()=>{rememberFields();const previous=state.history.pop();if(!previous)return;state.data=previous.data;state.options=previous.options;rebuild();render();toast('Последняя правка отменена.');});
}
function updatePalette(){try{let colors=normalizePalette(state.form.palette);if(!colors.length)colors=blendProfiles(state.refs.filter(r=>state.selected.has(r.id))).colors;document.querySelector('#palette-preview').innerHTML=colors.map(c=>`<span style="background:${c}" title="${c}"></span>`).join('');document.querySelector('#palette-input').removeAttribute('aria-invalid');}catch{document.querySelector('#palette-preview').innerHTML='';document.querySelector('#palette-input').setAttribute('aria-invalid','true');}}
async function imageProfile(image){const img=new Image();img.src=image;await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,96,96);return analyzePixels(ctx.getImageData(0,0,96,96).data,96,96);}
async function generate(){
 if(state.busy)return;rememberFields();
 try{
  const palette=normalizePalette(state.form.palette);if(state.label===state.value)throw new Error('Выберите разные столбцы для подписей и значений.');
  let data=seriesFromRows(state.rows,state.label,state.value);const mode=data.length?'numeric':'text';
  if(mode==='text')data=state.rows.slice(1).filter(r=>String(r[state.label]??'').trim()&&String(r[state.value]??'').trim()).map(r=>({label:String(r[state.label]),text:String(r[state.value])}));
  if(!data.length)throw new Error('В выбранных столбцах нет данных.');if(data.length>100)throw new Error('Для одной инфографики используйте до 100 записей.');
  if(data.some(d=>d.label.length>300||(d.text?.length||0)>1500))throw new Error('Сократите подпись до 300 символов, текст — до 1500.');
  state.busy=true;document.querySelector('#generate').disabled=true;document.querySelector('#generate').textContent='Анализ референсов…';
  const refs=state.refs.filter(r=>state.selected.has(r.id));for(const r of refs)if(!r.profile)r.profile=await imageProfile(r.image);if(refs.length)persistRefs();
  const style=blendProfiles(refs);state.mode=mode;state.data=data;state.options={title:state.form.title.trim(),subtitle:state.form.subtitle.trim(),palette:palette.length?palette:style.colors,background:style.background,ink:style.ink,fontWeight:style.weight,density:style.density,layouts:style.layouts,unit:(String(state.rows[0][state.value]).includes('%')||state.rows.slice(1).some(r=>typeof r[state.value]==='string'&&r[state.value].trim().endsWith('%')))?'%':'',hidden:{},fontScale:1,spacing:1};
  state.history=[];state.active=0;state.generated=true;state.changed=false;state.busy=false;rebuild();render();const ignored=state.rows.length-1-data.length;toast(ignored?`Готово. Пропущено строк без подписи или значения: ${ignored}.`:'Готово. Выберите вариант или уточните правки.');
 }catch(e){state.busy=false;render();toast(e.message,true);}
}
function rebuild(){state.variants=[0,1,2].map(i=>(state.mode==='text'?makeTextChart:makeChart)(state.data,state.options,i));}
function refine(){rememberFields();if(!state.form.edits.trim())return toast('Напишите правку.',true);try{const result=applyEdits(state.form.edits,state.data,state.options);if(result.applied.length){state.history.push(structuredClone({data:state.data,options:state.options}));if(state.history.length>20)state.history.shift();state.data=result.data;state.options=result.options;rebuild();}render();const el=document.querySelector('#edit-feedback');el.textContent=[...result.applied,...result.unsupported.map(s=>'Не распознано: '+s)].join('. ');if(result.unsupported.length)el.classList.add('edit-warning');}catch(e){toast(e.message,true);}}
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
 let added=0,errors=[];
 for(const file of files){if(!/^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type)){errors.push('Поддерживаются PNG, JPG, WEBP, GIF, AVIF и BMP.');continue;}if(file.size>10*1024*1024){errors.push('Изображение должно быть до 10 МБ.');continue;}
 try{const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const image=canvas.toDataURL('image/jpeg',.85),profile=await imageProfile(image);const ref={id:crypto.randomUUID(),name:file.name,image,colors:profile.colors,profile};state.refs.push(ref);state.selected.add(ref.id);added++;}catch{errors.push('Не удалось открыть '+file.name);}}
 if(added){rememberFields();const persisted=persistRefs();markDirty();render();toast(persisted?`Добавлено референсов: ${added}.`:'Референсы добавлены, но память браузера заполнена.',!persisted);}if(errors.length)toast(errors.join(' '),true);
}
function download(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function exportChart(format){const svg=state.variants[state.active];if(!svg)return;
 if(format==='svg'){download(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),`infographic-${state.active+1}.svg`);toast('SVG сохранён.');return;}
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas'),scale=Math.min(2,16000/img.height,16000/img.width,Math.sqrt(32000000/(img.width*img.height)));canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error();download(blob,`infographic-${state.active+1}.png`);toast(`PNG сохранён: ${canvas.width} × ${canvas.height} px.`);}catch{toast('Не удалось экспортировать PNG. Попробуйте SVG.',true);}finally{URL.revokeObjectURL(url);}}
render();
