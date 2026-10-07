import { createHash,timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { wrap } from '../auth/sessionRoutes.ts';
import type { LearnConfig } from '../auth/sessionService.ts';
import type { Database } from '../db/index.ts';
import { fail } from '../services/learnerService.ts';
import { coreEvents } from '../services/coreEvents.ts';
export function integrationRoutes(pool:Database,config:LearnConfig){
  const r=Router(),events=coreEvents(pool,config);
  r.use((req,_res,next)=>{
    if(req.get('Origin')||req.get('Sec-Fetch-Site')||Object.keys(req.query).length)return next(fail(403,'SERVICE_ONLY','Use the direct service endpoint.'));
    const token=/^Bearer ([a-zA-Z0-9_-]{43})$/.exec(req.get('Authorization')||'')?.[1];
    if(typeof config.reconcileKey!=='string'||!/^[a-zA-Z0-9_-]{43}$/.test(config.reconcileKey))return next(fail(503,'RECONCILE_DISABLED','Operator reconciliation is not configured.'));
    if(!token||!timingSafeEqual(createHash('sha256').update(token).digest(),createHash('sha256').update(config.reconcileKey).digest()))return next(fail(401,'SERVICE_AUTH_REQUIRED','Service credential required.'));
    next();
  });
  r.get('/pending-results',wrap(async(_req,res)=>{const {rows}=await pool.query("SELECT event_id AS \"eventId\",status,tries,next_attempt_at AS \"nextAttemptAt\" FROM learn_event WHERE status='pending' ORDER BY next_attempt_at,event_id LIMIT 20");res.json({items:rows});}));
  r.post('/reconcile',wrap(async(req,res)=>{if(!req.is('application/json')||!req.body||Array.isArray(req.body)||Object.keys(req.body).length)throw fail(400,'INVALID_BODY','Send an empty JSON object.');res.json(await events.reconcile());}));
  return r;
}
