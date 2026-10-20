function handle(value){if(typeof value!=='string'||!/^[-a-zA-Z0-9_.]{3,24}$/.test(value))throw Object.assign(Error('Use a valid Codeforces handle'),{status:400,code:'INVALID_HANDLE'});return value.toLowerCase();}
function normalize(data,requested){
  if(data?.status!=='OK'||!Array.isArray(data.result)||data.result.length!==1)throw Error('Invalid Codeforces user response');
  const row=data.result[0];if(!row||handle(row.handle)!==handle(requested))throw Error('Handle mismatch');
  const rating=row.rating===undefined?0:row.rating;
  if(!Number.isSafeInteger(rating)||rating < -10000 || rating > 10000 || (row.organization!==undefined&&(typeof row.organization!=='string'||row.organization.length>500)))throw Error('Invalid statistics');
  return {handle:handle(row.handle),rating,organization:row.organization||''};
}
async function fetchStats(requested,{fetcher=fetch,reserve=require('../services/providerBudget').reserve,timeoutMs=6000,maxBytes=32768}={}) {
  const normalized=handle(requested);await reserve();const controller=new AbortController();let timer;
  try{return await Promise.race([new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Provider timeout'));},timeoutMs);}), (async()=>{
    const response=await fetcher('https://codeforces.com/api/user.info?handles='+encodeURIComponent(normalized)+'&checkHistoricHandles=false',{redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok||!response.body||Number(response.headers.get('content-length'))>maxBytes)throw Error('Provider unavailable');
    const reader=response.body.getReader();let size=0;const parts=[];
    try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>maxBytes)throw Error('Provider response too large');parts.push(Buffer.from(part.value));}}finally{void reader.cancel().catch(()=>{});}
    return normalize(JSON.parse(Buffer.concat(parts).toString('utf8')),normalized);
  })()]);}finally{clearTimeout(timer);controller.abort();}
}
module.exports={handle,normalize,fetchStats};
