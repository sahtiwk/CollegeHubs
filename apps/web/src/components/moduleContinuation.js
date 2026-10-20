// Only canonical internal destinations; never render a service-supplied URL.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const mongo=/^[a-f0-9]{24}$/;
export function continuation(name,data){
 const next=data?.next;
 if(data?.schemaVersion!==2||data.status!=='ok'||!next)return null;
 if(name==='learn'&&uuid.test(next.id)){
  if(next.kind==='quiz')return {to:'/learn/quiz/'+next.id,label:'Resume saved assessment'};
  if(next.kind==='node')return {to:'/learn/nodes/'+next.id,label:'Continue your next topic'};
 }
 if(name==='arcade'&&next.kind==='game'&&mongo.test(next.id)&&['numberguess','mathamplitude','sorting','spotbug'].includes(next.gameId))return {to:'/arcade/'+next.gameId+'/'+next.id,label:'Open saved game'};
 if(name==='interview'&&mongo.test(next.id)){
  if(next.kind==='session')return {to:'/interview/sessions/'+next.id,label:'Continue saved interview'};
  if(next.kind==='report')return {to:'/interview/results/'+next.id,label:'Read your latest report'};
 }
 return null;
}
