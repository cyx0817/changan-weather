const q=s=>document.querySelector(s);
const readSetting=key=>{try{return localStorage.getItem(key)||'';}catch{return '';}};
const saveSetting=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
export class CloudVoice{
 constructor(personal,toast){
  this.personal=personal;this.toast=toast;this.voiceId=readSetting('changan-cloud-voice');this.endpoint=readSetting('changan-cloud-endpoint');this.token='';this.ready=false;this.version=0;
  q('#cloudEndpoint').value=this.endpoint;this.refresh();
  q('#cloudConnect').onclick=()=>this.connect();q('#cloudCreate').onclick=()=>this.create();
  q('#cloudTest').onclick=()=>this.speak('你好，我是你的天气伙伴。无论晴天还是雨天，都要好好照顾自己。');
  q('#cloudForget').onclick=()=>{this.stop();this.voiceId='';saveSetting('changan-cloud-voice','');q('#cloudEnabled').checked=false;this.refresh();this.status('已移除此浏览器的音色关联。云端音色和素材请到 MiniMax 账户管理。');};
  q('#cloneLocal').onclick=()=>this.useRecording();q('#cloneFile').onchange=e=>{this.sample=e.target.files[0];this.sampleDuration=null;q('#cloneSampleName').textContent=this.sample?.name||'未选择录音';};
  q('#cloudEnabled').onchange=()=>{this.personal.stopPlayback();this.status(q('#cloudEnabled').checked?'已选择 AI 音色，点击天气卡片即可播报。':'已切换回设备语音。');};
 }
 status(text){q('#cloudStatus').textContent=text;}
 refresh(){q('#cloudState').textContent=this.ready?'已连接 MiniMax':'待开通 · 未连接';q('#cloudEnabled').disabled=!(this.ready&&this.voiceId);q('#cloudCreate').disabled=!this.ready;q('#cloudTest').disabled=!(this.ready&&this.voiceId);q('#cloudForget').hidden=!this.voiceId;q('#cloneVoiceInfo').textContent=this.voiceId?'此浏览器已有个人音色':'还没有个人音色';}
 get enabled(){return this.ready&&this.voiceId&&q('#cloudEnabled').checked;}
 async request(path,options={}){
  const r=await fetch(this.endpoint+path,{...options,headers:{...options.headers,Authorization:`Bearer ${this.token}`},signal:options.signal||AbortSignal.timeout(110000)});
  if(!r.ok){let message='语音连接未完成，请稍后重试。';try{message=(await r.json()).error||message;}catch{}throw Error(message);}return r;
 }
 async connect(){
  this.stop();this.ready=false;q('#cloudEnabled').checked=false;this.refresh();q('#cloudConnect').disabled=true;
  try{
   const url=new URL(q('#cloudEndpoint').value.trim());if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('请填写你的语音后台 HTTPS 根地址。');
   const token=q('#cloudToken').value.trim();if(token.length<32)throw Error('请输入后台设置的访问口令，不是 MiniMax 密钥。');
   this.endpoint=url.origin;this.token=token;const health=await(await this.request('/health',{signal:AbortSignal.timeout(15000)})).json();if(health.ready!==true||health.provider!=='MiniMax')throw Error('此地址不是已配置好的语音服务。');
   this.ready=true;saveSetting('changan-cloud-endpoint',this.endpoint);q('#cloudToken').value='';this.status('连接成功。口令只在本次页面中使用；可创建音色或开启已有音色。');
  }catch(e){this.token='';this.status(e.message);}finally{q('#cloudConnect').disabled=false;this.refresh();}
 }
 async useRecording(){
  if(!this.personal.blob){this.status('先在“原声提醒”中录音，再点击使用。建议读满 15–30 秒。');return;}
  const button=q('#cloneLocal');button.disabled=true;let context;
  try{
   context=new AudioContext();const decoded=await context.decodeAudioData(await this.personal.blob.arrayBuffer());
   if(decoded.duration<10||decoded.duration>300)throw Error('克隆需要 10 秒–5 分钟录音，请录长一点。');
   const length=decoded.length,buffer=new ArrayBuffer(44+length*2),v=new DataView(buffer),write=(i,s)=>{for(let k=0;k<s.length;k++)v.setUint8(i+k,s.charCodeAt(k));};
   write(0,'RIFF');v.setUint32(4,36+length*2,true);write(8,'WAVE');write(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,decoded.sampleRate,true);v.setUint32(28,decoded.sampleRate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,length*2,true);
   const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i));
   for(let i=0;i<length;i++){let s=0;for(const channel of channels)s+=channel[i]/channels.length;s=Math.max(-1,Math.min(1,s));v.setInt16(44+i*2,s<0?s*32768:s*32767,true);}
   if(buffer.byteLength>5*1024*1024)throw Error('录音太大，请使用较短录音或上传 MP3。');
   this.sample=new File([buffer],'my-voice.wav',{type:'audio/wav'});this.sampleDuration=decoded.duration;q('#cloneSampleName').textContent=`我的录音 · ${Math.round(decoded.duration)} 秒`;this.status('已在本机准备录音，尚未上传。');
  }catch(e){this.status(e.message||'录音转换失败，请上传 MP3、M4A 或 WAV。');}finally{await context?.close();button.disabled=false;}
 }
 duration(file){return new Promise((resolve,reject)=>{const audio=new Audio(),url=URL.createObjectURL(file);let settled=false;const done=(err)=>{if(settled)return;settled=true;clearTimeout(timer);const duration=audio.duration;audio.onloadedmetadata=null;audio.onerror=null;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);err?reject(Error('无法读取录音时长，请换一个音频文件。')):resolve(duration);};const timer=setTimeout(()=>done(true),10000);audio.onloadedmetadata=()=>done(false);audio.onerror=()=>done(true);audio.src=url;});}
 async create(){
  if(!this.ready)return;const sample=this.sample;
  if(!sample||!(/\.(mp3|m4a|wav)$/i.test(sample.name))||sample.size>5*1024*1024){this.status('请选择不超过 5 MB 的 MP3、M4A 或 WAV 录音。');return;}
  if(!q('#cloneConsent').checked){this.status('请先勾选录音授权与上传同意。');return;}
  q('#cloudCreate').disabled=true;
  try{
   const duration=this.sampleDuration??await this.duration(sample);if(!Number.isFinite(duration)||duration<10||duration>300)throw Error('录音需要 10 秒–5 分钟，建议使用清晰的 15–30 秒人声。');
   this.status('正在上传到 MiniMax 并创建音色，请稍候…');
   const form=new FormData();form.append('sample',sample);form.append('consent','yes');const j=await(await this.request('/clone',{method:'POST',body:form})).json();
   if(!/^changan_[A-Za-z0-9]{8,64}$/.test(j.voiceId||''))throw Error('未收到有效音色，请检查后台。');
   this.voiceId=j.voiceId;saveSetting('changan-cloud-voice',this.voiceId);q('#cloudEnabled').checked=true;this.status('音色已创建。请点击“试听我的音色”完成首次合成；平台可能计费。');
  }catch(e){this.status(e.message);}finally{this.refresh();}
 }
 stop(){this.version++;this.controller?.abort();q('#cloudPlayer').pause();if(this.audioURL){URL.revokeObjectURL(this.audioURL);this.audioURL=null;}q('#cloudPlayer').removeAttribute('src');q('#cloudPlayer').hidden=true;}
 async speak(text){
  this.personal.stopPlayback();if(!this.ready||!this.voiceId){this.toast('请先连接云端语音并创建音色。');return;}
  const version=++this.version;this.controller=new AbortController();const timer=setTimeout(()=>this.controller?.abort(),110000);this.toast('正在用你的 AI 音色合成天气…');this.status('正在合成 AI 语音…');
  try{
   const r=await this.request('/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,voiceId:this.voiceId}),signal:this.controller.signal});const blob=await r.blob();if(version!==this.version)return;
   this.audioURL=URL.createObjectURL(blob);const player=q('#cloudPlayer');player.src=this.audioURL;player.hidden=false;this.status('AI 合成语音已准备好。');
   try{await player.play();this.toast('正在播放你的 AI 音色。');}catch{this.toast('语音已生成。打开“我的声音”，点击播放器播放。');}
  }catch(e){if(version===this.version){const message=e.name==='AbortError'?'语音生成超时，请稍后再试。':e.message;this.status(message);this.toast(message);}}finally{clearTimeout(timer);}
 }
}
