import {createServer} from 'node:http';
import handler from '../api/generate.js';
const server=createServer(async(req,res)=>{
 const response={setHeader:(...args)=>res.setHeader(...args),status(code){res.statusCode=code;return this;},json(data){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));},end:()=>res.end()};
 if(req.url!=='/api/generate')return response.status(404).json({error:'Not found'});
 let bytes=0,parts=[];try{for await(const chunk of req){bytes+=chunk.length;if(bytes>4*1024*1024)return response.status(413).json({error:'Слишком большой запрос.'});parts.push(chunk);}req.body=Buffer.concat(parts).toString();await handler(req,response);}catch{if(!res.writableEnded)response.status(500).json({error:'Ошибка сервера.'});}
});
server.listen(Number(process.env.PORT||3001),'127.0.0.1',()=>console.log('Semantic API started'));
