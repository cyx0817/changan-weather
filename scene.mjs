import {NEARBY_RADIUS,closeViewZoom,viewSpanMeters} from './nearby.mjs';
import {buildAnimeBlock} from './anime-block.mjs';
export class Scene{
  constructor({onStatus}){this.onStatus=onStatus;this.center=[108.94238,34.26101];this.effect='none';this.low=matchMedia('(prefers-reduced-motion: reduce)').matches;this.petals=!this.low;this.blossoms=[];this.canvas=document.querySelector('#weatherCanvas');this.ctx=this.canvas.getContext('2d');this.particles=[];this.tick=0;this.last=0;this.resize();new ResizeObserver(()=>this.resize()).observe(this.canvas);this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);this.init();this.setPetals(this.petals);}
  async init(){
    try{
      if(!window.maplibregl)throw new Error('地图组件未加载');
      this.onStatus('正在铺开长安的街巷…');
      const response=await fetch('https://tiles.openfreemap.org/styles/positron',{signal:AbortSignal.timeout(18000)});if(!response.ok)throw new Error('地图服务未响应');
      const style=await response.json();
      for(const l of style.layers){
        l.paint??={};
        if(l.type==='background')l.paint['background-color']='#e9eadb';
        if(l.type==='raster'){l.layout={...l.layout,visibility:'none'};}
        if(l.type==='fill'){l.paint['fill-color']=/water/.test(l.id)?'#a8d4d8':/park|landcover|landuse/.test(l.id)?'#b8d0aa':/building/.test(l.id)?'#dbcbb6':'#e4e4ce';l.paint['fill-opacity']=1;if(l.paint['fill-outline-color'])l.paint['fill-outline-color']='#b6bea4';if(/building/.test(l.id))l.layout={...l.layout,visibility:'none'};}
        if(l.type==='line'){l.paint['line-color']=/water/.test(l.id)?'#82bbc4':/boundary/.test(l.id)?'#b3bea1':/casing/.test(l.id)?'#c3bca6':/path|pedestrian|footway/.test(l.id)?'#f8edcf':/rail/.test(l.id)?'#9caca6':'#f7f2df';if(l.paint['line-opacity']!==undefined)l.paint['line-opacity']=.95;}
        if(l.type==='symbol'){
          if(!/road|water/.test(l.id)){l.layout={...l.layout,visibility:'none'};continue;}
          if(l.layout?.['text-field'])l.layout['text-field']=['coalesce',['get','name:zh'],['get','name']];
          if(l.paint['text-color'])l.paint['text-color']='#687b74';if(l.paint['text-halo-color'])l.paint['text-halo-color']='#f7f2df';
        }
      }
      const markerElement=this.marker?.getElement()||document.querySelector('.scene-center');
      if(markerElement){this.marker?.remove();document.querySelector('.experience').append(markerElement);}
      clearTimeout(this.timeout);this.map?.remove();
      this.modelKey='';
      this.map=new maplibregl.Map({container:'map',style,center:this.center,zoom:20,pitch:38,bearing:-15,antialias:true,attributionControl:true,maxPitch:50,maxZoom:23,minZoom:17,renderWorldCopies:false,dragPan:false,dragRotate:false,scrollZoom:false,touchZoomRotate:false,touchPitch:false,doubleClickZoom:false,keyboard:false});
      this.map.on('load',()=>{
        const firstLabel=this.map.getStyle().layers.find(l=>l.type==='symbol')?.id;
        // A transparent tile layer ensures building tiles remain available to query.
        this.map.addLayer({id:'building-footprints',type:'fill',source:'openmaptiles','source-layer':'building',paint:{'fill-opacity':0}},firstLabel);
        this.map.addSource('anime-block',{type:'geojson',data:{type:'FeatureCollection',features:[]},maxzoom:20,tolerance:0});
        this.map.addLayer({id:'building-shadows',type:'fill',source:'anime-block',filter:['==',['get','kind'],'shadow'],paint:{'fill-color':'#617e79','fill-opacity':.19}},firstLabel);
        this.map.addLayer({id:'nearby-buildings',type:'fill-extrusion',source:'anime-block',filter:['!=',['get','kind'],'shadow'],paint:{'fill-extrusion-color':['get','color'],'fill-extrusion-height':['*',['get','height'],.6],'fill-extrusion-base':['*',['get','base'],.6],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},firstLabel);
        this.map.setLight({anchor:'map',color:'#fff0dc',intensity:.44,position:[1.5,210,35]});
        const el=document.querySelector('.scene-center');el.style.position='relative';el.style.left='auto';el.style.top='auto';
        this.marker=new maplibregl.Marker({element:el,anchor:'top'}).setLngLat(this.center).addTo(this.map);
        this.updateArea();this.map.addControl(new maplibregl.ScaleControl({maxWidth:100,unit:'metric'}),'bottom-left');
        this.onStatus('身边 100 米 · 正在搭建动漫街区');this.focus(false);
        this.map.on('idle',()=>this.updateModels());
        this.map.on('click','nearby-buildings',()=>{document.querySelector('#sceneHint').textContent='建筑位置来自真实地图 · 屋顶、窗户和高度为艺术化表现';});
      });
      this.map.on('moveend',()=>this.updateModels());
      this.map.on('resize',()=>this.constrainView(true));
      let errorShown=false;this.map.on('error',()=>{if(!errorShown){errorShown=true;this.onStatus('部分地图数据未载入，可重试或稍后查看',true);}});
      this.timeout=setTimeout(()=>{if(!this.map?.isStyleLoaded())this.onStatus('地图加载较慢，天气预报仍可使用',true);},20000);
    }catch(e){this.onStatus('地图暂不可用，请检查网络后重试',true);}
  }
  updateModels(){
    if(!this.map?.getSource('anime-block'))return;
    const footprints=this.map.querySourceFeatures('openmaptiles',{sourceLayer:'building',filter:['<=',['distance',{type:'Point',coordinates:this.center}],NEARBY_RADIUS]});
    const green=[...this.map.querySourceFeatures('openmaptiles',{sourceLayer:'park'}),...this.map.querySourceFeatures('openmaptiles',{sourceLayer:'landcover',filter:['in','class','wood','grass']})];
    const key=JSON.stringify([this.center,footprints.map(f=>[f.geometry,f.properties]),green.map(f=>f.geometry)]);
    if(key===this.modelKey)return;this.modelKey=key;
    const model=buildAnimeBlock(footprints,this.center,NEARBY_RADIUS,green);this.map.getSource('anime-block').setData(model);
    const n=model.features.filter(f=>f.properties.kind==='wall').length;
    this.onStatus(n?'真实街区 · 动漫风 3D 建筑':'100 米内建筑数据较少 · 可换个位置看看');
  }
  updateArea(){
    if(!this.map?.getLayer('nearby-buildings'))return;
    this.modelKey='';this.map.getSource('anime-block').setData({type:'FeatureCollection',features:[]});
  }
  constrainView(fit=false){
    if(!this.map||this.adjustingView)return;this.adjustingView=true;
    try{
      const minimum=closeViewZoom(this.map.getZoom(),this.map.getBounds().toArray());
      this.map.setMinZoom(Math.max(17,Math.min(23,minimum)));
      if(fit)this.map.jumpTo({zoom:this.map.getMinZoom()});
      // Re-evaluate after the camera update so the label describes the actual ground view.
      const span=viewSpanMeters(this.map.getBounds().toArray());
      document.querySelector('#map').dataset.viewSpan=span.toFixed(2);
      document.querySelector('.radius-badge').textContent=`近景 ${Math.min(100,Math.ceil(span))} 米 · 上限 100 米`;
      document.querySelector('#zoomOut').disabled=this.map.getZoom()<=this.map.getMinZoom()+.01;
      document.querySelector('#zoomIn').disabled=this.map.getZoom()>=23;
    }finally{this.adjustingView=false;}
  }
  focus(){if(!this.map)return;this.map.jumpTo({center:this.center,padding:{left:0,right:0,top:100,bottom:0}});this.constrainView(true);}
  setLocation(lon,lat){this.center=[lon,lat];this.marker?.setLngLat(this.center);this.updateArea();this.focus();}
  toggleTilt(){if(!this.map)return true;const tilted=this.map.getPitch()<10;this.map.jumpTo({pitch:tilted?38:0,bearing:tilted?-15:0});this.constrainView(true);return tilted;}
  rotate(){if(this.map){this.map.jumpTo({bearing:this.map.getBearing()+45});this.constrainView();}}
  zoom(delta){if(this.map){this.map.jumpTo({zoom:Math.max(this.map.getMinZoom(),Math.min(23,this.map.getZoom()+delta))});this.constrainView();}}
  setEffect(effect,wind=0,precip=0){this.effect=effect;document.querySelector('.experience').dataset.weather=effect;this.wind=Math.min(10,Math.max(0,wind||0))/10;this.intensity=Math.min(1,Math.max(.3,(precip||.6)/4));document.querySelector('#fog').style.opacity=effect==='fog'?.8:effect==='cloud'?.12:effect==='rain'?.22:0;this.particles=[];}
  setLow(value){this.low=value;this.particles=[];this.blossoms=[];}
  setPetals(value){this.petals=value;this.blossoms=[];document.querySelector('.experience').dataset.petals=String(value);}
  resize(){const b=this.canvas.getBoundingClientRect();this.w=b.width;this.h=b.height;const d=Math.min(devicePixelRatio||1,2);this.canvas.width=b.width*d;this.canvas.height=b.height*d;this.ctx.setTransform(d,0,0,d,0,0);this.particles=[];this.blossoms=[];}
  blossom(randomY=false){return{x:Math.random()*(this.w+120)-60,y:randomY?Math.random()*this.h:-20,z:.35+Math.random()*.65,phase:Math.random()*Math.PI*2,angle:Math.random()*6.28,spin:(Math.random()-.5)*.018,tone:Math.floor(Math.random()*3)};}
  drawPetals(now,dt){
    if(!this.petals)return;
    const c=this.ctx,count=this.low?8:this.w<680?25:46;
    while(this.blossoms.length<count)this.blossoms.push(this.blossom(true));
    if(this.blossoms.length>count)this.blossoms.length=count;
    for(let i=0;i<this.blossoms.length;i++){
      let p=this.blossoms[i];
      // Light mode keeps a quiet still frame, with no drifting or spinning.
      if(!this.low){p.y+=(.25+p.z*.45)*dt;p.x+=(.22+(this.wind||0)*.35+Math.sin(now/2500+p.phase)*.38)*p.z*dt;p.angle+=p.spin*dt;}
      if(p.y>this.h+16||p.x>this.w+25||p.x< -70)this.blossoms[i]=p=this.blossom();
      const size=3+p.z*5,flip=this.low?.8:.32+Math.abs(Math.sin(now/1800+p.phase))*.68;
      const fade=Math.min(1,Math.max(0,(this.h-p.y)/75));
      c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.scale(size*flip,size);c.globalAlpha=(.5+p.z*.38)*fade;
      c.beginPath();c.moveTo(0,-1);c.bezierCurveTo(.8,-.95,1,.2,0,1);c.bezierCurveTo(-.85,.3,-.75,-.6,-.18,-.76);c.lineTo(0,-.58);c.closePath();
      c.fillStyle=['#eaa7b9','#f6cad6','#f9e1e5'][p.tone];c.fill();c.lineWidth=.075;c.strokeStyle='#cc829759';c.stroke();
      c.beginPath();c.moveTo(0,-.3);c.quadraticCurveTo(.2,.1,0,.65);c.strokeStyle='#fff5eea0';c.stroke();c.restore();
    }
  }
  particle(randomY=false){return{x:Math.random()*(this.w+200)-100,y:randomY?Math.random()*this.h:-30,z:.3+Math.random()*.7,s:Math.random()*6};}
  animate(now){requestAnimationFrame(this.animate);if(document.hidden)return;if(now-this.last<(this.low?65:30))return;const dt=Math.min((now-this.last)/16.67,4);this.last=now;const c=this.ctx;c.clearRect(0,0,this.w,this.h);
    if(this.effect==='sun'){const g=c.createRadialGradient(this.w*.8,0,0,this.w*.8,0,this.w*.65);g.addColorStop(0,'#f2d89555');g.addColorStop(1,'#f2d89500');c.fillStyle=g;c.fillRect(0,0,this.w,this.h);}
    this.drawPetals(now,dt);
    if(!['rain','snow'].includes(this.effect))return;
    const snow=this.effect==='snow';const target=this.low?35:snow?125:Math.round(140+this.intensity*150);while(this.particles.length<target)this.particles.push(this.particle(true));
    for(let i=0;i<this.particles.length;i++){let p=this.particles[i];p.y+=(snow?.6:11)*p.z*dt;p.x+=(snow?Math.sin(now/1800+p.s)*.35:1.4+this.wind)*p.z*dt;if(p.y>this.h+25||p.x>this.w+100)this.particles[i]=p=this.particle();c.beginPath();if(snow){c.fillStyle=`rgba(239,246,239,${p.z*.8})`;c.arc(p.x,p.y,1+p.z*2,0,Math.PI*2);c.fill();}else{c.strokeStyle=`rgba(77,124,153,${p.z*.65})`;c.lineWidth=.5+p.z*.5;c.moveTo(p.x,p.y);c.lineTo(p.x-(1.5+this.wind)*p.z,p.y-17*p.z);c.stroke();}}
  }
}


