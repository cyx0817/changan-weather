const R=6371008.8, rad=Math.PI/180;
export function distanceMeters(a,b){const p=(b[1]-a[1])*rad,q=(b[0]-a[0])*rad;return 2*R*Math.asin(Math.min(1,Math.sqrt(Math.sin(p/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(q/2)**2)));}
export function nearbyArea(center,radius=1000){
 const [lon,lat]=center,phi=lat*rad,lambda=lon*rad,d=radius/R,ring=[];
 for(let i=0;i<128;i++){const bearing=-i*2*Math.PI/128;const p=Math.asin(Math.sin(phi)*Math.cos(d)+Math.cos(phi)*Math.sin(d)*Math.cos(bearing));const l=lambda+Math.atan2(Math.sin(bearing)*Math.sin(d)*Math.cos(phi),Math.cos(d)-Math.sin(phi)*Math.sin(p));ring.push([l/rad,p/rad]);}
 ring.push([...ring[0]]);
 const feature=coordinates=>({type:'Feature',properties:{radius},geometry:{type:'Polygon',coordinates}});
 const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
 return {circle:feature([ring]),mask:feature([[[lon-5,lat-5],[lon+5,lat-5],[lon+5,lat+5],[lon-5,lat+5],[lon-5,lat-5]],[...ring].reverse()]),bounds:[[Math.min(...xs),Math.min(...ys)],[Math.max(...xs),Math.max(...ys)]]};
}
