const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function analyzePixels(pixels,width,height){
  const bins=new Map();let dark=0,occupied=0;const mask=new Uint8Array(width*height);
  const border=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(x<3||y<3||x>=width-3||y>=height-3){const p=(y*width+x)*4;border.push([pixels[p],pixels[p+1],pixels[p+2]]);}
  const background=[0,1,2].map(c=>border.map(p=>p[c]).sort((a,b)=>a-b)[Math.floor(border.length/2)]??250);
  const hex=rgb=>'#'+rgb.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('').toUpperCase();
  for(let i=0;i<mask.length;i++){
    const p=i*4,rgb=[pixels[p],pixels[p+1],pixels[p+2]];
    const distance=Math.hypot(...rgb.map((v,c)=>v-background[c]));
    if(distance>65 && pixels[p+3]>128){mask[i]=1;occupied++;}
    if(rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722<80)dark++;
    if(distance>65&&Math.max(...rgb)-Math.min(...rgb)>25){const key=hex(rgb.map(c=>clamp(Math.round(c/24)*24,0,255)));bins.set(key,(bins.get(key)||0)+1);}
  }
  const visited=new Uint8Array(mask.length), shapes=[];
  for(let i=0;i<mask.length;i++)if(mask[i]&&!visited[i]){
    const queue=[i];visited[i]=1;let minX=width,maxX=0,minY=height,maxY=0;
    for(let q=0;q<queue.length;q++){
      const at=queue[q],x=at%width,y=Math.floor(at/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&ny>=0&&nx<width&&ny<height){const next=ny*width+nx;if(mask[next]&&!visited[next]){visited[next]=1;queue.push(next);}}
    }
    const w=maxX-minX+1,h=maxY-minY+1,fill=queue.length/(w*h);
    if(w>=8&&h>=8&&queue.length>=50)shapes.push({w,h,fill,x:minX,y:minY});
  }
  const counts={bars:0,columns:0,donut:0,cards:0};
  for(const shape of shapes){if(shape.w/shape.h>2.2)counts.bars+=shape.w*shape.h;else if(shape.h/shape.w>2.2)counts.columns+=shape.w*shape.h;else if(shape.w/shape.h>.75&&shape.w/shape.h<1.33&&shape.fill<.88)counts.donut+=shape.w*shape.h;else counts.cards+=shape.w*shape.h;}
  const total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const layouts=Object.fromEntries(Object.entries(counts).map(([key,value])=>[key,value/total]));
  const colors=[];for(const [color] of [...bins.entries()].sort((a,b)=>b[1]-a[1])){const channels=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));if(!colors.some(c=>Math.hypot(...channels(c).map((v,i)=>v-channels(color)[i]))<60))colors.push(color);if(colors.length===6)break;}
  const luminance=background[0]*.2126+background[1]*.7152+background[2]*.0722;
  return {colors:colors.length?colors:['#242424','#A0A0A0'],background:hex(background),ink:luminance<130?'#F5F5F2':'#20221F',weight:dark/mask.length>.2?700:500,density:clamp(occupied/mask.length,.1,.7),layouts};
}
export function blendProfiles(refs){
  const profiles=refs.map(r=>r.profile).filter(Boolean);
  const defaultLayouts=['bars','cards','donut'];
  if(!profiles.length)return {colors:['#20221F','#9A9A94','#D1D1CB'],background:'#FAFAF7',ink:'#20221F',weight:500,density:.3,layouts:defaultLayouts};
  const scores={bars:0,columns:0,donut:0,cards:0};
  profiles.forEach(p=>Object.keys(scores).forEach(k=>scores[k]+=(p.layouts[k]||0)/profiles.length));
  const ranked=Object.keys(scores).filter(k=>scores[k]>0).sort((a,b)=>scores[b]-scores[a]);const layouts=[...new Set([...ranked,...defaultLayouts,'columns'])].slice(0,3);
  const bg=[1,3,5].map(i=>Math.round(profiles.reduce((sum,p)=>sum+parseInt(p.background.slice(i,i+2),16),0)/profiles.length));
  const background='#'+bg.map(c=>c.toString(16).padStart(2,'0')).join('').toUpperCase();
  const ink=bg[0]*.2126+bg[1]*.7152+bg[2]*.0722<130?'#F5F5F2':'#20221F';
  return {colors:[...new Set(profiles.flatMap(p=>p.colors))].slice(0,20),background,ink,weight:Math.round(profiles.reduce((a,p)=>a+p.weight,0)/profiles.length/100)*100,density:profiles.reduce((a,p)=>a+p.density,0)/profiles.length,layouts};
}
