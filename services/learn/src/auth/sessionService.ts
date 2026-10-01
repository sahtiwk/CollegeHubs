// Extracted P3.1 security boundary; no Core database dependency.
export { configuration, createSessionStore, sessionDto } from './sessionBoundary.cjs';
export type LearnConfig = { origin: string; secure: boolean; [key: string]: unknown };
export type SessionStore = {
  start(): Promise<string>;
  callback(input: { origin: string | undefined; cookieState: string; state: string; grant: string; module: string }): Promise<{ handle: string; expiresAt: Date }>;
  get(handle: string): Promise<any>;
  logout(handle: string, origin: string | undefined, csrf: string | undefined): Promise<void>;
};
