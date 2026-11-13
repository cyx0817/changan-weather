import {condition} from './weather.mjs';
export class WeatherAlerts{
 update(place,current,enabled,now=Date.now()){
  if(!Number.isFinite(current?.weather_code))return null;
  const next=condition(current.weather_code,current.is_day),key=place;
  const previous=this.previous;this.previous={key,effect:next.effect,label:next.label};
  if(!enabled||!previous||previous.key!==key||previous.effect===next.effect||now-(this.lastAt??-Infinity)<600000)return null;
  this.lastAt=now;
  return next.effect==='rain'?'现在开始下雨了，出门记得带伞。':next.effect==='snow'?'现在下雪了，注意保暖，小心路滑。':`天气变为${next.label}，记得留意窗外的变化。`;
 }
 reset(){this.previous=null;this.lastAt=null;}
}
export class SoundEffects{
 constructor(onState=()=>{}){this.onState=onState;this.enabled=false;this.muted=false;}
 async unlock(){
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error();this.context??=new Audio();await this.context.resume();if(this.context.state!=='running')throw Error();this.enabled=true;this.onState(true);return true;}
  catch{this.enabled=false;this.onState(false);return false;}
 }
 mute(){this.muted=true;this.enabled=false;this.context?.suspend();this.onState(false);}
 async enable(){this.muted=false;const ok=await this.unlock();if(ok)this.play('chime');return ok;}
 async gesture(kind){if(this.muted)return;if(await this.unlock())this.play(kind);}
 play(kind='chime'){
  if(!this.enabled||this.context?.state!=='running'||document.hidden)return false;
  const c=this.context,t=c.currentTime;
  const tone=(start,duration,frequency,end,type='sine',volume=.08)=>{
   const o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();
   o.type=type;o.frequency.setValueAtTime(frequency,start);o.frequency.exponentialRampToValueAtTime(end,start+duration);
   filter.type='lowpass';filter.frequency.value=1900;g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume,start+.035);g.gain.exponentialRampToValueAtTime(.0001,start+duration);
   o.connect(filter);filter.connect(g);g.connect(c.destination);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();filter.disconnect();g.disconnect();};
  };
  if(kind==='meow'){tone(t,.16,580,850,'triangle',.065);tone(t+.13,.3,850,440,'triangle',.055);}
  else if(kind==='purr'){for(let i=0;i<5;i++)tone(t+i*.09,.12,120,95,'sine',.045);}
  else if(kind==='snack'){for(let i=0;i<3;i++)tone(t+i*.12,.09,520+i*70,280,'triangle',.035);}
  else{tone(t,.28,660,660);tone(t+.13,.38,880,880,'sine',.065);}
  return true;
 }
}
