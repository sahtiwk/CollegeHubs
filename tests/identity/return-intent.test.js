const test=require('node:test'),assert=require('node:assert/strict');
test('return intent rejects redirects, traversal, expiry and another account',async()=>{
 const {safeReturnPath,rememberIntent,returnIntent,clearIntent}=await import('../../apps/web/src/auth/returnIntent.js');const map=new Map();global.sessionStorage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/%2f%2fevil.test','/learn/../admin','/learn?next=https://evil.test','/learn#secret','/login','/verify-email','/learn/%252f','/learn/a.b'])assert.equal(safeReturnPath(path),null,path);
 for(const path of ['/dashboard','/','/learn','/interview/practice','/arcade/number-guess','/channels/'+'a'.repeat(24)])assert.equal(safeReturnPath(path),path);
 rememberIntent('/learn',null,1000);assert.equal(returnIntent('alice',false,1001),'/learn');assert.equal(returnIntent('bob',false,1002),'/dashboard');
 rememberIntent('/learn',null,1000);rememberIntent('/learn',null,1801001);assert.equal(returnIntent('alice',false,1801002),'/dashboard');
 rememberIntent('/interview','alice',1000);assert.equal(returnIntent('alice',false,1801000),'/dashboard');
 rememberIntent('/arcade','alice',1000);assert.equal(returnIntent('alice',true,1100),'/arcade');assert.equal(returnIntent('alice',false,1200),'/dashboard');
 rememberIntent('/learn','alice',1000);clearIntent();assert.equal(returnIntent('alice',false,1001),'/dashboard');delete global.sessionStorage;
});
