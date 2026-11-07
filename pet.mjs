export class WeatherPet{
 constructor(){
  this.root=document.querySelector('#weatherPet');this.message=document.querySelector('#petMessage');this.count=0;this.effect='none';this.context='';
  document.querySelector('#petCat').onclick=()=>this.touch();
  document.querySelector('#petStroke').onclick=()=>this.touch();
  document.querySelector('#petFeed').onclick=()=>this.react('snack','咔嚓咔嚓，谢谢你的小鱼干！');
  document.querySelector('#petNap').onclick=()=>{this.sleeping=!this.sleeping;this.root.classList.toggle('sleeping',this.sleeping);this.message.textContent=this.sleeping?'呼噜……我在这里陪你。':'醒啦！一起看看窗外吧。';document.querySelector('#petNap').textContent=this.sleeping?'叫醒':'打个盹';};
  document.querySelector('#petCollapse').onclick=()=>{const collapsed=this.root.classList.toggle('collapsed');document.querySelector('#petCollapse').textContent=collapsed?'展开':'收起';document.querySelector('#petCollapse').setAttribute('aria-expanded',String(!collapsed));};
 }
 touch(){this.count++;this.react('happy',['呼噜呼噜，摸到我最喜欢的地方啦。','今天也要好好照顾自己，喵。','你的手好暖，再摸一下！'][this.count%3]);}
 react(kind,text){clearTimeout(this.timer);this.sleeping=false;this.root.classList.remove('sleeping','happy','snack');document.querySelector('#petNap').textContent='打个盹';void this.root.offsetWidth;this.root.classList.add(kind);this.message.textContent=text;this.timer=setTimeout(()=>{this.root.classList.remove(kind);this.sayWeather();},4000);}
 weather(effect,temp,context=''){this.effect=effect;this.temp=temp;this.context=context;this.root.dataset.weather=effect;this.root.classList.toggle('cold',Number.isFinite(temp)&&temp<12);if(!this.sleeping&&!this.root.matches('.happy,.snack'))this.sayWeather();}
 sayWeather(){this.message.textContent=this.context+(this.effect==='rain'?'小伞准备好啦，出门记得带伞。':this.effect==='snow'?'下雪啦！慢慢走，别滑倒。':this.temp<12?'有点凉，记得多穿一件。':this.effect==='sun'?'太阳出来了，陪我晒一会儿吧。':this.effect==='fog'?'有雾呢，路上要留神。':'我是小满，点点我，陪你等一场晴。');}
 setLow(value){this.root.classList.toggle('still',value);}
}
