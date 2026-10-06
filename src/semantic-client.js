import {renderScene} from './scene.js';
export async function requestSemantic({endpoint,accessToken,data,references,title,subtitle,unit,palette,instruction,current,signal}){
 if(!endpoint)throw new Error('Генерация по смыслу референсов пока не подключена.');
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${accessToken}`},body:JSON.stringify({data,references,title,subtitle,unit,palette,instruction,current}),signal});
 let result;try{result=await response.json();}catch{throw new Error('Сервер генерации недоступен.');}
 if(!response.ok)throw new Error(result.error||'Не удалось сгенерировать композицию.');
 if(!Array.isArray(result.variants)||result.variants.length!==3)throw new Error('Сервер вернул неполный результат.');
 return {analysis:result.analysis,variants:result.variants,svgs:result.variants.map(v=>renderScene(v.scene,data,{title,subtitle,unit}))};
}
