const { createHmac, timingSafeEqual } = require('node:crypto');
const { accessError } = require('./hubAccess');
const fail=()=>accessError(400,'INVALID_QUERY','Choose a channel and valid date range of at most 366 days');
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
function selectors(query,hubId,{exporting=false,now=new Date()}={}) {
  const allowed=exporting?['channelId','from','to']:['channelId','from','to','limit','cursor'];
  if(Object.keys(query).some(k=>!allowed.includes(k))||typeof query.channelId!=='string'||!/^[a-f0-9]{24}$/.test(query.channelId))throw fail();
  const today=require('@collegehubs/contracts/day-policy.cjs').dayKey(now),month=today.slice(0,7)+'-01';
  const next=new Date(month+'T00:00:00Z');next.setUTCMonth(next.getUTCMonth()+1);
  const from=query.from??month,to=query.to??next.toISOString().slice(0,10);
  if(!day(from)||!day(to)||to<=from||Date.parse(to)-Date.parse(from)>366*86400000)throw fail();
  const limit=query.limit===undefined?25:Number(query.limit);
  if(query.limit!==undefined&&(typeof query.limit!=='string'||!/^\d+$/.test(query.limit))||!Number.isInteger(limit)||limit<1||limit>50)throw fail();
  const binding=JSON.stringify([String(hubId),query.channelId,from,to]);
  const sign=value=>createHmac('sha256',process.env.JWT_SECRET).update('calendar-v1:'+binding+':'+value).digest('base64url');
  let after=null;
  if(query.cursor!==undefined){try{
    if(typeof query.cursor!=='string'||query.cursor.length>1024)throw Error();
    const [value,sig,...rest]=query.cursor.split('.');if(rest.length||!sig)throw Error();
    const expected=Buffer.from(sign(value)),actual=Buffer.from(sig);if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw Error();
    const row=JSON.parse(Buffer.from(value,'base64url').toString());
    if(!/^[a-f0-9]{24}$/.test(row.id)||typeof row.at!=='string'||new Date(row.at).toISOString()!==row.at)throw Error();
    after={$or:[{startsAt:{$gt:new Date(row.at)}},{startsAt:new Date(row.at),_id:{$gt:row.id}}]};
  }catch{throw fail();}}
  const cursor=row=>{const value=Buffer.from(JSON.stringify({id:String(row._id),at:new Date(row.startsAt).toISOString()})).toString('base64url');return value+'.'+sign(value);};
  return {from,to,limit,after,cursor,filter:{hubId,channelIds:query.channelId,startsAt:{$lt:new Date(to+'T00:00:00+05:30')},endsAt:{$gt:new Date(from+'T00:00:00+05:30')}}};
}
module.exports={selectors};
