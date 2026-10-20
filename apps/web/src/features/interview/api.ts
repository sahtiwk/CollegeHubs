import api, { getSessionKey } from '../../api';
import { createSessionCoordinator } from '../../auth/moduleSessionState';
import { sanitizeTheme } from '../learn/hubTheme';
export type InterviewSession = { userId: string; hubId: string; membershipVersion: number; expiresAt: string; csrfToken: string; theme: any };
export type Resume = { id: string; originalName: string; fileSize: number; createdAt: string; expiresAt:string; pageCount: number; textTruncated: boolean; extractedText?: string };
export class InterviewError extends Error { constructor(public code: string, public status = 503) { super(messages[code] || 'Interview is unavailable. Please retry shortly.'); } }
const messages: Record<string,string> = { RESUME_EXPIRED:'This resume expired after 30 days. Upload it again to prepare new questions.', RECOMMENDATION_INVALID: 'This recommendation expired or was already used. Refresh suggestions and select topics again.', TOPICS_LOCKED: 'Topics cannot change during import or after question generation. Refresh your setup.', SUGGESTIONS_UNAVAILABLE: 'Learn topics could not be imported. Select again or continue with ordinary interview practice.', PDF_INVALID: 'Choose a valid text-based PDF.', PDF_REQUIRED: 'Choose a PDF to upload.', PDF_EMPTY: 'This PDF has no readable text. Export a text-based resume; scanned images are not supported.', PDF_ENCRYPTED: 'Remove password protection before uploading this PDF.', PDF_TOO_LARGE: 'The PDF must be 5 MiB or smaller.', BODY_TOO_LARGE: 'The PDF must be 5 MiB or smaller.', PDF_PAGE_LIMIT: 'Use a PDF with at most 20 pages.', PDF_PARSE_TIMEOUT: 'The PDF took too long to read. Try a simpler text-based export.', UPLOAD_BUSY: 'Another upload is being read. Please retry shortly.', RESUME_LIMIT: 'You can retain 20 resumes. Delete one before uploading another.', INVALID_UPLOAD: 'Upload one PDF without extra form fields.' };
const coordinator = createSessionCoordinator(getSessionKey);
export async function interviewRequest(path: string, { method = 'GET', body, csrf, signal, timeout = 20000 }: { method?: string; body?: unknown; csrf?: string; signal?: AbortSignal; timeout?: number } = {}) {
  const route=path.split('?')[0];
  if(path.includes('?')&&!/^\/(sessions|interviews)\?cursor=[A-Za-z0-9_-]{1,160}$/.test(path))throw new InterviewError('INVALID_PATH',400);
  if (!['/session','/auth/start','/auth/callback','/logout','/health/ready','/resumes','/resumes/upload','/capabilities','/practice','/interviews','/sessions'].includes(route) && !/^\/(?:resumes\/[a-f0-9]{24}|interviews\/[a-f0-9]{24}(?:\/(?:generate|learn-topics))?|sessions\/[a-f0-9]{24}(?:\/complete|\/answers\/[a-f0-9-]{36})?)$/.test(route)) throw new InterviewError('INVALID_PATH',400);
  const form = body instanceof FormData;
  const response = await fetch('/api/interview'+path, { method, credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal: signal ? AbortSignal.any([signal,AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout), headers: { ...(body && !form ? { 'Content-Type': 'application/json' } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, ...(body ? { body: form ? body : JSON.stringify(body) } : {}) });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new InterviewError('INVALID_RESPONSE');
  const data = await response.json(); if (!response.ok) throw new InterviewError(data.error?.code, response.status); return data;
}
export function clearInterviewSession(remote = false) { const old = coordinator.clear(); if (remote && old?.csrfToken) fetch('/api/interview/logout', { method: 'POST', credentials: 'same-origin', redirect: 'error', keepalive: true, headers: { 'X-CSRF-Token': old.csrfToken } }).catch(() => {}); }
window.addEventListener('core-identity', () => clearInterviewSession(true));
export function ensureInterviewSession(user: { _id: string; hubId: string; membershipVersion: number }, progress: (text:string)=>void): Promise<InterviewSession> {
  const checked = (dto: InterviewSession) => { if (dto.userId !== user._id || dto.hubId !== user.hubId || dto.membershipVersion !== user.membershipVersion || Date.parse(dto.expiresAt) <= Date.now()+35000) throw new InterviewError('INTERVIEW_SESSION_REQUIRED',401); sanitizeTheme(dto.theme,dto.hubId,dto.theme.themeVersion); return dto; };
  return coordinator.run([user._id,user.hubId,user.membershipVersion].join(':'), async (signal: AbortSignal, current:()=>void) => {
    progress('Opening Interview. Free hosting may take about a minute.'); await interviewRequest('/health/ready',{signal,timeout:75000}); current();
    try { const dto = checked(await interviewRequest('/session',{signal})); current(); return dto; } catch (error) { if (!(error instanceof InterviewError) || error.status !== 401) throw error; }
    progress('Connecting your college session…'); const {state} = await interviewRequest('/auth/start',{method:'POST',signal}); current();
    const {data} = await api.post('/auth/module-grants',{module:'interview',state,returnPath:'/interview'},{signal}); current();
    if (data.callbackPath !== '/api/interview/auth/callback') throw new InterviewError('INVALID_CALLBACK');
    await interviewRequest('/auth/callback',{method:'POST',body:{module:'interview',state,grant:data.grant},signal}); current();
    const dto = checked(await interviewRequest('/session',{signal})); current(); return dto;
  });
}
