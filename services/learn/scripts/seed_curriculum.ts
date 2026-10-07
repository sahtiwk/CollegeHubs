import { Pool } from 'pg';
import { validateCurriculum } from '../src/services/plannerAgent.ts';
import { seedPath } from '../src/services/learnerService.ts';
async function main(){
  const checked=validateCurriculum();
  if(process.argv.slice(2).join(' ')==='--check'){console.log(checked);return;}
  const url=new URL(process.env.DATABASE_URL||''),name=url.pathname.slice(1),hub=process.argv[2]?.replace('--hub=','');
  if(!/^[a-f0-9]{24}$/.test(hub||'')||process.argv[2]!=='--hub='+hub||process.argv.slice(3).join(' ')!=='--confirm-db='+name||process.env.NODE_ENV==='production'||process.env.DEMO_RESET_ENABLED!=='true'||!/^collegehubs_demo_learn_[a-z0-9_]+$/.test(name)||!(process.env.DEMO_DB_NAME_ALLOWLIST||'').split(',').includes(name))throw Error('guard');
  const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:3000});const c=await pool.connect();
  try{await c.query('BEGIN');for(const domain of ['dsa','web'] as const)await seedPath(c,{hubId:hub!,userId:''},domain);await c.query('COMMIT');console.log('Reviewed curriculum installed for the confirmed demo Hub.');}
  catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await pool.end();}
}
main().catch(()=>{console.error('Curriculum seed refused or failed. Verify the explicit demo target and Hub.');process.exitCode=1;});
