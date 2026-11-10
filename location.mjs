// Device coordinates stay in memory. Cancelling invalidates late OS callbacks.
export function createLocator({geolocation,onPending=()=>{},onSuccess=()=>{},onError=()=>{},onSettled=()=>{}}={}){
 let version=0,pending=false,timer;
 function cancel(){version++;clearTimeout(timer);if(pending){pending=false;onSettled();}}
 function start(){
  if(pending)return;
  if(!geolocation){onError('unsupported');return;}
  const id=++version;pending=true;onPending();
  function finish(error,position){
   if(id!==version||!pending)return;
   clearTimeout(timer);pending=false;onSettled();
   if(error){onError(error);return;}
   const c=position?.coords;
   if(!Number.isFinite(c?.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c?.longitude)||Math.abs(c.longitude)>180){onError('invalid');return;}
   onSuccess({lat:c.latitude,lon:c.longitude,accuracy:Number.isFinite(c.accuracy)?Math.max(0,c.accuracy):null});
  }
  timer=setTimeout(()=>finish('timeout'),20000);
  try{geolocation.getCurrentPosition(p=>finish(null,p),e=>finish(e?.code===1?'denied':e?.code===3?'timeout':'unavailable'),{enableHighAccuracy:true,timeout:15000,maximumAge:60000});}
  catch{finish('unavailable');}
 }
 return {start,cancel};
}
