import {generateSemantic,validateRequest} from '../server/semantic.js';
export const config={maxDuration:120};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const origin=process.env.INFOGRAPHICS_ALLOWED_ORIGIN;
 if(origin&&req.headers.origin===origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 if(req.method==='OPTIONS'){if(origin&&req.headers.origin!==origin)return res.status(403).json({error:'Источник запроса не разрешён.'});res.setHeader('Access-Control-Allow-Methods','POST');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');return res.status(204).end();}
 if(req.method!=='POST')return res.status(405).json({error:'Используйте POST.'});
 const provider=process.env.INFOGRAPHICS_PROVIDER||'gemini';
 const apiKey=provider==='gemini'?process.env.GEMINI_API_KEY:process.env.INFOGRAPHICS_API_KEY;
 if(!apiKey||!process.env.INFOGRAPHICS_ACCESS_TOKEN)return res.status(503).json({error:'ИИ-генерация пока не подключена.'});
 if(req.headers.authorization!==`Bearer ${process.env.INFOGRAPHICS_ACCESS_TOKEN}`)return res.status(401).json({error:'Введите пароль доступа к ИИ-генерации.'});
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body;validateRequest(body);}catch(e){return res.status(400).json({error:e.message});}
 try{const result=await generateSemantic(body,{apiKey,provider,model:process.env.INFOGRAPHICS_MODEL||(provider==='gemini'?'gemini-flash-latest':provider==='anthropic'?'claude-sonnet-4-6':'gpt-4.1')});return res.status(200).json(result);}catch(e){return res.status(502).json({error:e.name==='TimeoutError'?'Генерация заняла слишком много времени. Сократите таблицу.':e.message});}
}
