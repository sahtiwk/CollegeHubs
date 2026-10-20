// Read-only operator evidence. Output contains hashes/counts, never connection strings.
const { createHash } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { MongoClient, BSON } = require('mongoose').mongo;
const { Pool } = require('pg');
const hash = rows => createHash('sha256').update(rows.sort().join('\n')).digest('hex');
async function main() {
  const args=process.argv.slice(2), values=Object.fromEntries(args.map(a=>{const i=a.indexOf('=');return [a.slice(0,i),a.slice(i+1)];}));
  if(args.length!==3 || Object.keys(values).length!==3 || !values['--output'] || !['core','learn'].includes(values['--service']) || !/^[a-zA-Z0-9_]+$/.test(values['--database']||'')) throw Error('arguments');
  const name=values['--database'], report={service:values['--service'],database:name,stores:{}};
  if(report.service==='core') {
    const client=new MongoClient(process.env.MONGO_URI||'',{serverSelectionTimeoutMS:5000});
    if(client.options.dbName!==name || ['admin','local','config'].includes(name))throw Error('target');
    try {
      await client.connect(); const db=client.db(name);
      for(const {name:collection} of (await db.listCollections().toArray()).sort((a,b)=>a.name.localeCompare(b.name))) {
        if(collection==='migrationcheckpoints')continue;
        const rows=[];
        for await(const row of db.collection(collection).find())rows.push(BSON.EJSON.stringify(row,{relaxed:false}));
        report.stores[collection]={count:rows.length,sha256:hash(rows)};
      }
      report.pendingStudy=await db.collection('studysolutions').countDocuments({awardStatus:'pending'});
      report.receiptTotals=await db.collection('auraevents').aggregate([{$match:{canonical:true}},{$group:{_id:null,total:{$sum:'$awardedAura'},count:{$sum:1}}},{$project:{_id:0}}]).toArray();
    } finally {await client.close();}
  } else {
    const url=new URL(process.env.DATABASE_URL||''); if(decodeURIComponent(url.pathname.slice(1))!==name)throw Error('target');
    const pool=new Pool({connectionString:url.toString(),max:1,connectionTimeoutMillis:5000});
    try {
      await pool.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const tables=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'schema_migration' ORDER BY tablename")).rows;
      for(const {tablename} of tables) {
        const quoted='"'+tablename.replaceAll('"','""')+'"';
        const rows=(await pool.query(`SELECT row_to_json(t)::text AS row FROM public.${quoted} t`)).rows.map(r=>r.row);
        report.stores[tablename]={count:rows.length,sha256:hash(rows)};
      }
      report.delivery=(await pool.query('SELECT status,count(*)::int AS count FROM learn_event GROUP BY status ORDER BY status')).rows;
      await pool.query('COMMIT');
    } finally {await pool.end();}
  }
  writeFileSync(values['--output'],JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log('Inventory saved; compare stores, pending counts and receipt totals with the restored target.');
}
main().catch(()=>{console.error('Inventory refused or failed; check explicit database, private output path and database availability. Existing output is never overwritten.');process.exitCode=1;});
