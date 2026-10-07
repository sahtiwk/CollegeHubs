import { Router } from 'express';
import type { Database } from '../db/index.ts';
import type { LearnConfig, SessionStore } from '../auth/sessionService.ts';
import { wrap } from '../auth/sessionRoutes.ts';
import { body, learningHandler } from '../controllers/learningController.ts';
import { attemptService } from '../services/attemptService.ts';
import { coreEvents } from '../services/coreEvents.ts';
import { fail,nodeId } from '../services/learnerService.ts';
import { resourceLookup } from '../services/roadmapAdapter.ts';
export function quizRoutes(pool:Database,store:SessionStore,config:LearnConfig){
  const r=Router(),service=attemptService(pool),handler=learningHandler(store),events=coreEvents(pool,config);
  const resources=resourceLookup(pool);
  r.post('/resources',wrap(handler((o,req)=>resources(o,nodeId(body(req,['nodeId']).nodeId)))));
  r.get('/quiz/attempts',wrap(handler(o=>service.list(o))));
  r.get('/quiz/attempts/:id',wrap(handler(async(o,req)=>{const id=nodeId(req.params.id);const dto=await service.get(o,id);events.trigger(o,id);return dto;})));
  r.post('/quiz/attempts',wrap(handler((o,req)=>{const b=body(req,['nodeId','mode','requestId']);if(!['checkpoint','test-out'].includes(b.mode))throw fail(400,'INVALID_MODE','Choose checkpoint or test-out.');return service.create(o,nodeId(b.nodeId),b.mode,nodeId(b.requestId));})));
  r.post('/quiz/next',wrap(handler((o,req)=>service.get(o,nodeId(body(req,['attemptId']).attemptId)))));
  r.post('/quiz/answer',wrap(handler((o,req)=>{const b=body(req,['attemptId','questionId','optionId','requestId']);return service.answer(o,nodeId(b.attemptId),nodeId(b.questionId),nodeId(b.optionId),nodeId(b.requestId));})));
  r.post('/quiz/finalize',wrap(handler(async(o,req,principal)=>{const id=nodeId(body(req,['attemptId']).attemptId);const dto=await service.finalize(o,id,principal);events.trigger(o,id);return dto;})));
  return r;
}
