import {NEARBY_RADIUS} from './nearby.mjs';

// Build a small, stylized model from real OSM footprints. Decorative details
// are procedural; they must never be mistaken for surveyed facades.
const METERS=6371008.8*Math.PI/180;
const WALLS=['#f3dfbd','#f5e9d3','#dce6d2','#ead5ca','#e8e6da'];
const ROOFS=['#7196a0','#b77b69','#718f83','#8b91aa','#b39370'];
const area=r=>r.reduce((n,p,i)=>{const q=r[(i+1)%r.length];return n+p[0]*q[1]-q[0]*p[1];},0)/2;
const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function clipRing(ring,boundary){
 let points=ring.slice();
 if(points.length>1&&points[0][0]===points.at(-1)[0]&&points[0][1]===points.at(-1)[1])points.pop();
 for(let i=0;i<boundary.length&&points.length;i++){
  const a=boundary[i],b=boundary[(i+1)%boundary.length],output=[];
  for(let j=0;j<points.length;j++){
   const p=points[j],q=points[(j+1)%points.length],dp=cross(a,b,p),dq=cross(a,b,q);
   if(dp>=-1e-8)output.push(p);
   if((dp>=0)!==(dq>=0)){const t=dp/(dp-dq);output.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
  }
  points=output;
 }
 return points.length>=3&&Math.abs(area(points))>.001?points:[];
}
function inside(point,ring){
 let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }return hit;
}
const inPolygon=(p,rings)=>inside(p,rings[0])&&!rings.slice(1).some(r=>inside(p,r));
export function buildAnimeBlock(input,center,radius=NEARBY_RADIUS,greenSpaces=[]){
 const features=[],seen=new Set(),occupied=[],sx=METERS*Math.cos(center[1]*Math.PI/180);
 const local=p=>[(p[0]-center[0])*sx,(p[1]-center[1])*METERS];
 const geo=p=>[center[0]+p[0]/sx,center[1]+p[1]/METERS];
 const boundary=Array.from({length:96},(_,i)=>[Math.cos(i*Math.PI/48)*radius,Math.sin(i*Math.PI/48)*radius]);
 function add(rings,kind,base,height,color){
  const clipped=rings.map(r=>clipRing(r,boundary));
  if(!clipped[0]?.length)return;
  const coords=clipped.filter(r=>r.length).map(r=>{const out=r.map(geo);out.push([...out[0]]);return out;});
  features.push({type:'Feature',properties:{kind,base,height,color},geometry:{type:'Polygon',coordinates:coords}});
 }
 let count=0;
 for(const f of input){
  const polys=f.geometry?.type==='Polygon'?[f.geometry.coordinates]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[];
  for(const polygon of polys){
   if(count>=120)break;
   if(!polygon[0]?.length||polygon.some(r=>r.some(p=>!Number.isFinite(p[0])||!Number.isFinite(p[1]))))continue;
   const rings=polygon.map(r=>r.slice(0,-1).map(local)),outer=rings[0];
   if(outer.length<3)continue;
   const xs=outer.map(p=>p[0]),ys=outer.map(p=>p[1]);
   if(Math.min(...xs)>radius||Math.max(...xs)<-radius||Math.min(...ys)>radius||Math.max(...ys)<-radius)continue;
   if(!clipRing(outer,boundary).length)continue;
   // Source features may occur in more than one loaded tile.
   const key=JSON.stringify(polygon);if(seen.has(key))continue;seen.add(key);occupied.push(rings);count++;
   const seed=Math.abs(Math.round((center[0]+xs[0]/sx)*1e5)+Math.round((center[1]+ys[0]/METERS)*1e5));
   const color=seed%WALLS.length,p=f.properties||{};
   let height=Number(p.render_height||p.height||Number(p['building:levels'])*3.2);
   height=Number.isFinite(height)&&height>0?Math.min(height,65):9.6;
   const min=Number(p.render_min_height)||0,base=Math.max(0,Math.min(min,height-1));
   const centroid=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...ys)+Math.max(...ys))/2];
   const scale=(k)=>rings.map(r=>r.map(v=>[centroid[0]+(v[0]-centroid[0])*k,centroid[1]+(v[1]-centroid[1])*k]));
   // The default landmark gets a recognizable tiered pavilion silhouette,
   // anchored to its mapped footprint, rather than generic apartment windows.
   const bell=inPolygon(local([108.94238,34.26101]),rings)&&Math.abs(area(outer))<10000;
   if(bell){
    add(rings.map(r=>r.map(v=>[v[0]+7,v[1]-6])),'shadow',0,0,'#667b78');
    add(rings,'wall',0,7.5,'#a4ac9c');
    add(scale(.98),'trim',7.5,8.1,'#d5cfb3');
    for(const [s,z,h] of [[.7,8.1,15],[.48,18,23],[.28,26,29]]){
     add(scale(s),'wall',z,h,'#b66d55');
     const r=scale(s)[0];
     for(let e=0;e<r.length;e++){
      const a=r[e],b=r[(e+1)%r.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
      if(len<3)continue;
      for(let n=1;n<5;n++){
       const x=a[0]+dx*n/5,y=a[1]+dy*n/5;
       const post=[[-.3,-.3],[.3,-.3],[.3,.3],[-.3,.3]].map(v=>[x+v[0],y+v[1]]);
       add([post],'trim',z,h+.15,'#e1b283');
      }
     }
    }
    for(const [s,z] of [[.96,14.7],[.73,22.7],[.52,28.7]])for(let i=0;i<9;i++){
     add(scale(s*(1-i*.075)),'roof',z+i*.4,z+(i+1)*.4,i===0?'#9a9b76':'#718b81');
    }
    add(scale(.035),'roof',32.3,35,'#c7ae72');
    continue;
   }
   // Small ground shadow is clipped to the same 100 m disc.
   add(rings.map(r=>r.map(v=>[v[0]+height*.24,v[1]-height*.17])),'shadow',0,0,'#667b78');
   add(rings,'wall',base,height,WALLS[color]);
   add(rings,'trim',Math.max(base,height-.35),height+.12,'#f9efd8');
   const pitched=height<19&&rings.length===1&&outer.length<=5;
   const steps=pitched?7:1;
   for(let i=0;i<steps;i++)add(scale(pitched?1-i*.075:.98),'roof',height+i*.42,height+(i+1)*.42,ROOFS[color]);
   // Windows are thin vertical prisms following the original outer walls.
   const floors=Math.min(12,Math.floor((height-base)/3.2));
   for(let e=0;e<outer.length&&e<60;e++){
    const a=outer[e],b=outer[(e+1)%outer.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    if(length<2.8)continue;
    const columns=Math.min(14,Math.floor(length/3.4)),ux=dx/length,uy=dy/length;
    for(let n=1;n<=columns;n++){
     const t=n/(columns+1),x=a[0]+dx*t,y=a[1]+dy*t,w=Math.min(1.15,length/(columns+1)*.5)/2;
     const rect=[[-w,-.12],[w,-.12],[w,.12],[-w,.12]].map(([along,across])=>[x+ux*along-uy*across,y+uy*along+ux*across]);
     for(let floor=0;floor<floors&&features.length<6000;floor++){
      const z=base+floor*3.2+1.1;
      if(z+1.3>height-.4)continue;
      add([rect],'window',z,z+1.3,(seed+floor+n)%5===0?'#f9d89d':'#72969f');
     }
    }
   }
  }
 }
 const parks=greenSpaces.flatMap(f=>f.geometry?.type==='Polygon'?[f.geometry.coordinates]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[]).filter(p=>p[0]?.length).map(p=>p.map(r=>r.map(local)));
 const crown=(x,y,r)=>Array.from({length:12},(_,i)=>[x+Math.cos(i*Math.PI/6)*r,y+Math.sin(i*Math.PI/6)*r]);
 let trees=0;
 for(let x=-radius+8;x<radius-5&&trees<70;x+=14)for(let y=-radius+8;y<radius-5&&trees<70;y+=14){
  if(Math.hypot(x,y)>radius-5)continue;
  const edge=crown(x,y,2.9);
  if(!parks.some(p=>edge.every(v=>inPolygon(v,p)))||occupied.some(p=>edge.some(v=>inPolygon(v,p))||inPolygon([x,y],p)))continue;
  trees++;
  add([crown(x,y,.32)],'tree',0,2.6,'#9c8771');
  const leaf=trees%3===0?'#9eba89':trees%3===1?'#87af8b':'#b5c899';
  add([crown(x,y,2.3)],'tree',1.9,3.4,leaf);
  add([crown(x,y,2.9)],'tree',2.6,4.1,leaf);
  add([crown(x,y,2.1)],'tree',4.1,5.1,leaf);
  add([crown(x,y,1.2)],'tree',5.1,5.6,leaf);
 }
 return {type:'FeatureCollection',features};
}
