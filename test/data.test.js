import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNumber, normalizePalette, seriesFromRows, escapeText} from '../src/data.js';
import {makeChart,makeTextChart} from '../src/charts.js';
test('numeric import preserves Russian decimal values, zero and negatives',()=>{
  assert.equal(parseNumber('1 234,56'),1234.56);assert.equal(parseNumber('38%'),38);assert.equal(parseNumber(0),0);assert.equal(parseNumber('-2,5'),-2.5);assert.equal(parseNumber(''),null);assert.equal(parseNumber('неизвестно'),null);assert.equal(parseNumber(Infinity),null);
  assert.deepEqual(seriesFromRows([['Label','Value'],['А',0],['Б','-2,5'],['','99'],['В','неизвестно']],0,1),[{label:'А',value:0},{label:'Б',value:-2.5}]);
});
test('palette accepts HEX and rejects CSS injection and excess colors',()=>{
  assert.deepEqual(normalizePalette('#abc, 112233; #D8E568'),['#AABBCC','#112233','#D8E568']);assert.deepEqual(normalizePalette(''),[]);
  assert.throws(()=>normalizePalette('#fff;fill:red'));assert.throws(()=>normalizePalette(Array(21).fill('#fff').join(' ')));
});
test('SVG keeps exact values and safely escapes supplied content',()=>{
  const svg=makeChart([{label:'<script>alert(1)</script>',value:-25},{label:'A&B',value:0}],{title:'"<Title>"',palette:['#AABBCC']},0);
  assert.ok(svg.includes('-25'));assert.ok(svg.includes('A&amp;B'));assert.ok(!svg.includes('<script>'));assert.ok(!/NaN|Infinity/.test(svg));assert.equal(escapeText('<x>'),'&lt;x&gt;');
});
test('signed distribution uses positions rather than misleading percentages',()=>{
  const svg=makeChart([{label:'А',value:-10},{label:'Б',value:20}],{title:'Тест',palette:[]},2);assert.ok(svg.includes('ОТНОСИТЕЛЬНО НУЛЯ'));assert.ok(!svg.includes('ДОЛЯ В ОБЩЕЙ СУММЕ'));
});
test('large numeric and text layouts leave space for footer',()=>{
  const data=Array.from({length:20},(_,i)=>({label:'Категория '+i,value:i}));const svg=makeChart(data,{title:'Тест',palette:[]},1);assert.ok(Number(svg.match(/height="(\d+)"/)[1])>=1680);
  for(let i=0;i<3;i++){const text=makeTextChart([{label:'Принцип',text:'Простой и понятный интерфейс'}, {label:'Следующий шаг',text:'Проверка данных'}],{title:'Идеи',palette:[]},i);assert.ok(text.includes('Проверка данных'));assert.ok(!/NaN|Infinity/.test(text));}
});
