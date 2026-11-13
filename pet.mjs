export class WeatherPet{
 constructor(sound){
  this.sound=sound;this.root=document.querySelector('#weatherPet');this.message=document.querySelector('#petMessage');this.count=0;this.effect='none';this.context='';this.affection=20;this.energy=75;this.lastFeed=0;this.idleCount=0;
  const q=s=>document.querySelector(s);
  q('#petCat').onclick=()=>this.touch();q('#petStroke').onclick=()=>this.touch();q('#petFeed').onclick=()=>this.feed();q('#petPlay').onclick=()=>this.play();q('#petStretch').onclick=()=>this.stretch();q('#petNap').onclick=()=>this.nap();
  q('#petCollapse').onclick=()=>{const collapsed=this.root.classList.toggle('collapsed');q('#petCollapse').textContent=collapsed?'展开':'收起';q('#petCollapse').setAttribute('aria-expanded',String(!collapsed));};
  q('#petCat').onpointermove=e=>{if(this.low||this.sleeping)return;const r=e.currentTarget.getBoundingClientRect();this.root.style.setProperty('--look-x',`${(e.clientX-r.left-r.width/2)/r.width*4}px`);this.root.style.setProperty('--look-y',`${(e.clientY-r.top-r.height/2)/r.height*3}px`);};
  q('#petCat').onpointerleave=()=>{this.root.style.setProperty('--look-x','0px');this.root.style.setProperty('--look-y','0px');};
  this.meters();this.idle=setInterval(()=>{if(document.hidden||this.sleeping||this.busy||this.low||this.root.classList.contains('collapsed'))return;this.idleCount++;this.react(this.idleCount%2?'stretch':'curious',this.idleCount%2?'伸个懒腰～你也活动一下肩膀吧。':'刚才好像有一片花瓣飞过去，喵？',false);},24000);
 }
 meters(){document.querySelector('#petBond').textContent=this.affection>=80?'超黏你':this.affection>=45?'喜欢你':'认识一下';document.querySelector('#petEnergy').textContent=this.energy<30?'想休息':this.energy<65?'心情不错':'元气满满';document.querySelector('#petMoodFill').style.width=`${this.affection}%`;}
 clearPose(){clearTimeout(this.timer);this.root.classList.remove('sleeping','happy','snack','playing','stretch','curious');this.sleeping=false;document.querySelector('#petNap').textContent='哄睡';}
 touch(){this.count++;this.affection=Math.min(100,this.affection+7);this.energy=Math.min(100,this.energy+2);this.react('happy',['喵呜～记住你的手啦。','呼噜呼噜……这里最舒服。','再摸摸耳朵，好不好？','你一来，我就开心了。'][this.count%4]);this.sound?.gesture(this.count%3?'purr':'meow');}
 feed(){const now=Date.now();if(now-this.lastFeed<12000){this.react('curious','肚子圆圆的，等一会儿再吃吧。');this.sound?.gesture('meow');return;}this.lastFeed=now;this.energy=Math.min(100,this.energy+18);this.affection=Math.min(100,this.affection+9);this.react('snack','咔嚓！这条小鱼，分你一半。');this.sound?.gesture('snack');}
 play(){if(this.energy<20){this.react('curious','玩累啦，喂点小鱼或陪我睡一会儿吧。');return;}this.energy-=14;this.affection=Math.min(100,this.affection+10);this.react('playing',['抓到了！这根羽毛归我啦！','左边？右边？嘿，我扑！'][this.count++%2]);this.sound?.gesture('meow');}
 stretch(){this.energy=Math.min(100,this.energy+5);this.react('stretch','前爪伸长长～尾巴也伸长长～');this.sound?.gesture('purr');}
 nap(){const wake=this.sleeping;this.clearPose();if(wake){this.energy=Math.min(100,this.energy+Math.min(30,Math.floor((Date.now()-this.sleepStarted)/1000)));this.react('happy','睡醒啦，想和你再待一会儿。');this.sound?.gesture('meow');}else{this.sleeping=true;this.busy=false;this.sleepStarted=Date.now();this.root.classList.add('sleeping');this.message.textContent='呼……轻一点，我在做小鱼的梦。';document.querySelector('#petNap').textContent='叫醒';this.sound?.gesture('purr');}this.meters();}
 react(kind,text,interactive=true){this.clearPose();this.busy=true;void this.root.offsetWidth;this.root.classList.add(kind);this.message.textContent=text;this.meters();this.timer=setTimeout(()=>{this.root.classList.remove(kind);this.busy=false;if(!this.sleeping)this.sayWeather();},interactive?5000:3500);}
 weather(effect,temp,context=''){this.effect=effect;this.temp=temp;this.context=context;this.root.dataset.weather=effect;this.root.classList.toggle('cold',Number.isFinite(temp)&&temp<12);if(!this.sleeping&&!this.busy)this.sayWeather();}
 sayWeather(){this.message.textContent=this.context+(this.effect==='rain'?'小伞撑好啦，下雨也陪着你。':this.effect==='snow'?'雪花落在鼻尖上，凉凉的！':this.temp<12?'今天有点凉，围巾分你一半。':this.effect==='sun'?'暖暖的太阳，一起晒肚皮吧。':this.effect==='fog'?'雾蒙蒙的，走慢一点，我陪你。':this.affection>=70?'我最喜欢的，就是和你待在一起。':'我是小满。摸摸我，或者陪我玩吧。');}
 setLow(value){this.low=value;this.root.classList.toggle('still',value);}
}
