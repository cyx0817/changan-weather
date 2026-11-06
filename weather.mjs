const codes = {
  0:['晴','sun','☀'],1:['晴间多云','cloud','⛅'],2:['多云','cloud','☁'],3:['阴','cloud','☁'],45:['雾','fog','≋'],48:['雾凇','fog','≋'],
  51:['毛毛雨','rain','☂'],53:['毛毛雨','rain','☂'],55:['较强毛毛雨','rain','☂'],56:['冻毛毛雨','rain','☂'],57:['冻毛毛雨','rain','☂'],
  61:['小雨','rain','☂'],63:['中雨','rain','☂'],65:['大雨','rain','☂'],66:['冻雨','rain','☂'],67:['强冻雨','rain','☂'],
  71:['小雪','snow','❄'],73:['中雪','snow','❄'],75:['大雪','snow','❄'],77:['米雪','snow','❄'],80:['阵雨','rain','☂'],81:['阵雨','rain','☂'],82:['强阵雨','rain','☂'],85:['阵雪','snow','❄'],86:['强阵雪','snow','❄'],95:['雷阵雨','rain','ϟ'],96:['雷雨伴冰雹','rain','ϟ'],99:['雷雨伴冰雹','rain','ϟ']
};
export function condition(code,isDay=1){const c=code==null?null:codes[code];if(isDay===0&&code===0)return{label:'晴',effect:'night',icon:'☾'};return c?{label:c[0],effect:c[1],icon:isDay===0&&code===1?'☾':c[2]}:{label:'天气未知',effect:'none',icon:'—'};}
export function valueText(value,digits=0){return typeof value==='number'&&Number.isFinite(value)?value.toFixed(digits):'—';}
export function upcomingHours(times,currentTime,count=24){const base=currentTime.slice(0,13)+':00';return times.map((t,i)=>t>=base?i:-1).filter(i=>i>=0).slice(0,count);}
export function validateWeather(data){if(data?.error||!data?.current?.time||!data?.hourly?.time?.length||!data?.daily?.time?.length)throw new Error('天气数据暂不可用');return data;}
export function speechText(place,c){const w=condition(c.weather_code);let text=`${place}，当前${w.label}。`;if(Number.isFinite(c.temperature_2m))text+=`气温${Math.round(c.temperature_2m)}度。`;if(Number.isFinite(c.apparent_temperature))text+=`体感${Math.round(c.apparent_temperature)}度。`;if(w.effect==='rain')text+='出门记得带伞，路面湿滑，请注意安全。';else if(w.effect==='snow')text+='注意保暖，小心路面结冰。';else text+='愿你今天也有好心情。';return text;}
export async function getWeather(lat,lon,signal){
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  const vars='temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m';
  url.search=new URLSearchParams({latitude:lat,longitude:lon,current:vars,hourly:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,is_day,wind_speed_10m,wind_direction_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',timezone:'auto',forecast_days:7});
  const res=await fetch(url,{signal});if(!res.ok)throw new Error('天气服务暂时未响应');return validateWeather(await res.json());
}
