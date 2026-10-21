const HOSTS = ['leetcode.com', 'atcoder.jp', 'codechef.com'];
const ENDPOINT = 'https://clist.by/api/v4/contest/?upcoming=true&resource__in='+HOSTS.join(',')+'&limit=100&order_by=start&format=json';
function enabled(){return process.env.CLIST_CONTESTS_ENABLED==='true' && !!process.env.CLIST_USERNAME && !!process.env.CLIST_API_KEY;}
function normalize(data){
  if(!Array.isArray(data?.objects)||data.objects.length>100)throw Error('Invalid Clist response');
  const found=new Map();
  for(const row of data.objects){
    if(!Number.isSafeInteger(row.id)||row.id<1||!HOSTS.includes(row.host)||typeof row.event!=='string'||!row.event.trim()||row.event.length>300)throw Error('Invalid Clist contest');
    const url=new URL(row.href);
    if(url.protocol!=='https:'||url.username||url.password||url.port||!HOSTS.some(host=>url.hostname===host||url.hostname==='www.'+host))throw Error('Invalid contest URL');
    const date=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/.test(value))throw Error('Invalid contest date');const result=new Date(value.endsWith('Z')?value:value+'Z');if(!Number.isFinite(+result))throw Error('Invalid contest date');return result;};
    const item={providerId:String(row.id),title:row.event.trim(),startsAt:date(row.start),endsAt:date(row.end),url:url.href};
    if(item.endsAt<=item.startsAt||+item.endsAt-+item.startsAt>31536000000)throw Error('Invalid contest duration');
    if(found.has(item.providerId)&&JSON.stringify(found.get(item.providerId))!==JSON.stringify(item))throw Error('Conflicting contest');
    found.set(item.providerId,item);
  }
  return [...found.values()].sort((a,b)=>a.startsAt-b.startsAt||a.providerId.localeCompare(b.providerId));
}
async function fetchContests({fetcher=fetch,timeoutMs=6000,maxBytes=262144}={}){
  if(!enabled())throw Error('Clist disabled');
  const controller=new AbortController();let timer;
  try{return await Promise.race([new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Provider timeout'));},timeoutMs);}), (async()=>{
    const response=await fetcher(ENDPOINT,{signal:controller.signal,redirect:'error',headers:{Accept:'application/json',Authorization:'ApiKey '+process.env.CLIST_USERNAME+':'+process.env.CLIST_API_KEY}});
    if(!response.ok||!response.body||Number(response.headers.get('content-length'))>maxBytes)throw Error('Provider unavailable');
    const reader=response.body.getReader(),parts=[];let bytes=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>maxBytes)throw Error('Provider payload too large');parts.push(Buffer.from(value));}}finally{void reader.cancel().catch(()=>{});}
    return normalize(JSON.parse(Buffer.concat(parts).toString('utf8')));
  })()]);}finally{clearTimeout(timer);controller.abort();}
}
module.exports={enabled,normalize,fetchContests,ENDPOINT};
