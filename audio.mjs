export class PersonalAudio{
  constructor(toast){this.toast=toast;this.blob=null;this.url=null;this.recording=false;this.initializing=false;this.dbPromise=this.openDB();this.bind();this.restore();}
  async openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('changan-weather-voice',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async dbTask(mode,operation){const db=await this.dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('audio',mode);const r=operation(tx.objectStore('audio'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);});}
  async restore(){try{const saved=await this.dbTask('readonly',s=>s.get('reminder'));if(saved){this.setBlob(saved.blob);document.querySelector('#personalEnabled').checked=saved.enabled;}}catch{this.feedback('此浏览器无法持久保存录音，录音仅在本次页面中可用。');}}
  feedback(s){document.querySelector('#audioFeedback').textContent=s;}
  setBlob(blob){this.blob=blob;if(this.url)URL.revokeObjectURL(this.url);this.url=blob?URL.createObjectURL(blob):null;document.querySelector('#savedAudio').hidden=!blob;const audio=document.querySelector('#audioPreview');audio.pause();if(this.url)audio.src=this.url;else{audio.removeAttribute('src');audio.load();}}
  async save(blob){this.setBlob(blob);document.querySelector('#personalEnabled').checked=true;try{await this.dbTask('readwrite',s=>s.put({blob,enabled:true},'reminder'));this.feedback('已保存在此浏览器。可以试听，也可以重新录制。');}catch{this.feedback('音频已载入，但无法保存。关闭此页后需要重新添加。');}}
  bind(){
    const q=s=>document.querySelector(s);q('#recordBtn').onclick=()=>this.recording?this.stop():this.start();
    q('#audioFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;if(f.size>5*1024*1024){this.feedback('请选择小于 5 MB 的音频。');return;}if(!f.type.startsWith('audio/')){this.feedback('请选择可播放的音频文件。');return;}
      const url=URL.createObjectURL(f),a=new Audio();a.preload='metadata';let settled=false;const timer=setTimeout(()=>finish(false),8000);const finish=async ok=>{if(settled)return;settled=true;clearTimeout(timer);a.removeAttribute('src');a.load();URL.revokeObjectURL(url);if(ok)await this.save(f);else this.feedback('无法读取该音频，请换一个常见音频格式。');};a.onloadedmetadata=()=>finish(true);a.onerror=()=>finish(false);a.src=url;};
    q('#personalEnabled').onchange=async()=>{if(this.blob)try{await this.dbTask('readwrite',s=>s.put({blob:this.blob,enabled:q('#personalEnabled').checked},'reminder'));}catch{this.feedback('设置仅在本次页面中生效。');}};
    q('#deleteAudio').onclick=async()=>{this.stopPlayback();this.setBlob(null);q('#personalEnabled').checked=false;try{await this.dbTask('readwrite',s=>s.delete('reminder'));this.feedback('录音已删除。');}catch{this.feedback('已移除当前音频，但本地存储删除失败，请清除此网站数据以彻底删除。');}};
    q('#voiceDialog').addEventListener('close',()=>{this.cancelled=true;if(this.recording)this.stop();q('#audioPreview').pause();});
    window.addEventListener('pagehide',()=>{this.stop();this.stopPlayback();});
  }
  async start(){
    if(this.initializing)return;this.cancelled=false;
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){this.feedback('当前浏览器不支持录音，请使用上传音频。');return;}
    this.initializing=true;const btn=document.querySelector('#recordBtn');btn.disabled=true;this.feedback('请允许麦克风权限，以录制你的提醒。');
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(this.cancelled||!document.querySelector('#voiceDialog').open){stream.getTracks().forEach(t=>t.stop());return;}this.stream=stream;const types=['audio/webm;codecs=opus','audio/mp4','audio/webm'];const mime=types.find(t=>MediaRecorder.isTypeSupported(t));this.recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});this.chunks=[];this.recorder.ondataavailable=e=>{if(e.data.size)this.chunks.push(e.data);};this.recorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(this.chunks,{type:this.recorder.mimeType||'audio/webm'});if(blob.size)await this.save(blob);};this.recorder.onerror=()=>{this.stop();this.feedback('录音中断，请重试或上传音频。');};this.recorder.start();this.recording=true;this.started=Date.now();btn.textContent='■ 结束并保存';btn.classList.add('recording');document.querySelector('#recordStatus').textContent='正在录音，30 秒后自动保存';this.feedback('');this.timer=setInterval(()=>{const seconds=Math.floor((Date.now()-this.started)/1000);document.querySelector('#recordTimer').textContent=`00:${String(Math.min(30,seconds)).padStart(2,'0')} / 00:30`;if(seconds>=30)this.stop();},200);}
    catch{this.stream?.getTracks().forEach(t=>t.stop());this.feedback('未能使用麦克风。你也可以直接上传自己的录音。');}
    finally{this.initializing=false;btn.disabled=false;}
  }
  stop(){clearInterval(this.timer);if(this.recorder?.state==='recording')this.recorder.stop();this.stream?.getTracks().forEach(t=>t.stop());this.recording=false;const btn=document.querySelector('#recordBtn');btn.textContent='● 重新录音';btn.classList.remove('recording');document.querySelector('#recordStatus').textContent='最多 30 秒 · 仅存此浏览器';}
  stopPlayback(){if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();this.player?.pause();}
  async playReminder(){if(!this.blob||!document.querySelector('#personalEnabled').checked)return;this.player=new Audio(this.url);try{await this.player.play();}catch{this.toast('浏览器限制了自动播放，可在“我的声音”中点击试听。');}}
  speak(text){this.stopPlayback();if(!('speechSynthesis'in window)){this.toast('当前浏览器不支持文字播报。');this.playReminder();return;}const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.9;const v=speechSynthesis.getVoices().find(v=>/zh[-_]CN/i.test(v.lang))||speechSynthesis.getVoices().find(v=>/zh/i.test(v.lang));if(v)u.voice=v;u.onend=()=>this.playReminder();u.onerror=e=>{if(e.error!=='canceled'&&e.error!=='interrupted')this.toast('系统语音暂不可用，可在“我的声音”中播放录音。');};this.utterance=u;speechSynthesis.speak(u);}
}
