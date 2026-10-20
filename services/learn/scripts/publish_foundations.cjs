// Reproducible offline authoring input. Does not edit historical demo-v1 files.
const fs = require('node:fs'), crypto = require('node:crypto'), path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const read = file => JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const write = (file,value) => {
 const target=path.join(root,file),text=JSON.stringify(value,null,2)+'\n';
 if(fs.existsSync(target)&&fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==text)throw Error('Published content differs. Author a new version instead: '+file);
 fs.writeFileSync(target,text);
};
const old = read('services/learn/src/data/curriculum/demo-v1.json');
const oldBank = read('services/learn/src/data/questions/demo-v1.json');
function uuid(key) { let h=crypto.createHash('sha256').update('collegehubs:skill:'+key).digest('hex').slice(0,32).split('');h[12]='4';h[16]='8';h=h.join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`; }
const domains = [
 ['dsa','Data structures & algorithms','Collections, traversal and algorithm cost.'],
 ['web','Web development','Structure, style and browser requests.'],
 ['ml','Machine learning','Data, training and honest evaluation.'],
 ['backend','Backend development','Requests, validation and durable data.'],
 ['devops','DevOps','Version control, automated checks and containers.'],
].map(([id,label,description])=>({id,label,description}));
// Each row: concept, correct statement, three distractors, rationale, applied scenario.
const specs = [
 ['dsa','complexity','Algorithm cost','iteration','https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration',[
  ['a full traversal','It visits n entries','It visits no entries','It always visits two entries','It visits n squared entries','One visit per entry gives n visits.','A loop visits every entry of an n-item list once.'],
  ['two nested full traversals','They perform n squared visits','They always perform two visits','They perform n plus one visits','They perform zero visits','Each of n outer iterations performs n inner iterations.','Both loop bounds are n and neither loop exits early.'],
  ['constant work','Its step count is independent of input length','Its runtime is always zero','It requires an empty input','It must visit all entries','A fixed number of steps does not depend on n.','A procedure compares only the first two supplied values.'],
  ['early exit','A first-position match needs one comparison','Every search must visit all positions','It sorts the list','It needs no comparison','A search can stop when the target is found.','The first entry matches and the loop immediately breaks.'],
  ['worst-case linear search','A missing target requires n checks','It checks only the first entry','It checks only the last entry','It always checks half the entries','Without additional structure every position may contain the target.','An unsorted list of n entries does not contain the target.'],
 ]],
 ['web','http','Browser requests and responses','css','https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview',[
  ['a request','The client sends it to ask the server for something','It is always a database row','Only CSS sends it','It replaces all responses','A client initiates an HTTP exchange with a request.','A browser asks a server for an HTML document.'],
  ['a response status','It communicates the request outcome','It is the user password','It is the screen size','It always means success','The status describes how the request was handled.','A server must indicate that a page was not found.'],
  ['HTTP headers','They carry message metadata','They are always page content','They execute code automatically','They replace all URLs','Headers describe aspects such as content type.','A server declares that its body contains JSON.'],
  ['a response body','It carries returned content','It is always a status number','It must contain credentials','It is always absent','Bodies can contain representations such as HTML or JSON.','A client receives the HTML text of a page.'],
  ['HTTPS','It protects HTTP transport using TLS','It makes every site trustworthy','It replaces authorization','It prevents every application bug','Transport protection does not replace application checks.','A browser exchanges encrypted HTTP traffic with its intended server.'],
 ]],
 ['ml','data','Features, targets and samples',null,'https://scikit-learn.org/stable/getting_started.html',[
  ['a sample','It is one observed example','It is always the whole dataset','It is model source code','It is always a metric','A dataset contains individual observations.','One row describes one house in a housing dataset.'],
  ['a feature','It is an input attribute','It is always the target','It is the final evaluation score','It is only an epoch counter','Features supply information to a model.','House area is supplied to predict price.'],
  ['a target','It is the supervised outcome to predict','It is every input column','It is the filename','It is the random seed','Supervised learning pairs inputs with known outcomes.','Historical sale prices serve as labels.'],
  ['classification','It predicts a discrete class','It always predicts a continuous price','It only sorts rows','It guarantees perfect predictions','Class labels are discrete outcomes.','A model predicts spam or not spam.'],
  ['regression','It predicts a numeric quantity','It only predicts class names','It guarantees zero error','It is only data storage','Regression estimates numeric targets.','A model estimates a house price in currency units.'],
 ]],
 ['ml','training','Training and held-out data','data','https://scikit-learn.org/stable/common_pitfalls.html',[
  ['training data','It supplies examples for fitting','It is only the final report','It must include future labels','It is never used by fit','Fitting learns from training examples.','An estimator adjusts parameters using labelled rows.'],
  ['test data','It evaluates examples held out of fitting','It should tune every model choice','It must be copied into training','It proves perfect generalization','Held-out examples estimate unseen-example performance.','A fitted model is evaluated on untouched rows.'],
  ['data leakage','Unavailable future information enters training','The dataset is simply small','The model has a filename','A metric is rounded','Leakage can make evaluation unrealistically optimistic.','A feature contains the answer only known after prediction time.'],
  ['safe preprocessing','Fit on training data and apply to test data','Fit on all rows before splitting','Copy test labels into features','Delete the training split','Learning transformation parameters from test data contaminates evaluation.','A scaler must learn feature means before evaluation.'],
  ['reproducibility','Record split, seed and settings','Change test sets until scores improve','Keep no settings','Shuffle without recording anything','Recorded configuration helps repeat comparisons.','Two learners compare models using the same data split.'],
 ]],
 ['ml','evaluation','Evaluation and error analysis','training','https://scikit-learn.org/stable/modules/model_evaluation.html',[
  ['accuracy','It is the fraction of correct predictions','It is always training loss','It counts only false positives','It counts features','Accuracy compares predictions with true labels.','Eight of ten predicted classes match their labels.'],
  ['a false positive','An actual negative is predicted positive','An actual positive is predicted negative','A positive is predicted correctly','The model refuses to predict','A false positive incorrectly flags a negative case.','A legitimate message is flagged as spam.'],
  ['a false negative','An actual positive is predicted negative','An actual negative is predicted positive','Every prediction is correct','The model has no features','A false negative misses a positive case.','Spam is incorrectly accepted as legitimate mail.'],
  ['imbalanced classes','Accuracy can hide poor minority-class performance','Accuracy is always perfect','Every class has the same count','The minority can never matter','Frequent classes can dominate aggregate accuracy.','A model always predicts the class found in 99 percent of rows.'],
  ['error analysis','Inspect mistakes and relevant subsets','Hide every incorrect prediction','Use test labels as input features','Report only easy examples','Inspecting errors can reveal systematic weaknesses.','A good overall score hides failure on one input category.'],
 ]],
 ['backend','requests','Request handling and routes',null,'https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Client-Server_overview',[
  ['routing','It selects handlers by method and path','It only selects fonts','It always runs inside SQL','It removes the HTTP method','Routes decide how requests are handled.','GET /books and POST /books need different handlers.'],
  ['parsing','It decodes input into a usable form','It proves input is safe','It grants ownership','It always writes a database','Parsing is separate from validation and permission checks.','A handler converts a JSON body into an object.'],
  ['authorization','It checks permission for an operation','It merely parses JSON','It changes text color','It proves an input is numeric','Authorization determines what a verified identity may do.','A logged-in user tries to edit another user’s private note.'],
  ['a server response','It communicates status and a result','It must reveal server files','It always repeats the input','It cannot indicate failure','Responses provide an outcome and appropriate public data.','A creation request returns the new record’s public fields.'],
  ['error handling','Return a controlled failure without secrets','Return all environment variables','Claim success for every failure','Silently corrupt stored data','Bounded errors inform callers without exposing internals.','A dependency becomes unavailable during a request.'],
 ]],
 ['backend','validation','Validation and trust boundaries','requests','https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Website_security',[
  ['server validation','It checks input at the authoritative server','A hidden form field replaces it','It trusts every browser value','It runs only as CSS','Clients can bypass browser-side checks.','A caller submits a direct request without using the form.'],
  ['an allowlist','It accepts explicitly supported values','It accepts all unknown fields','It guesses administrator roles','It removes authentication','An allowlist bounds the supported input space.','A setting permits only new, some and advanced.'],
  ['ownership checks','Use verified identity to scope access','Trust the owner ID in the body','Require only a guessable resource ID','Expose all tenant data','Server-verified identity must establish the owner.','A request references another user’s private resource.'],
  ['parameterized queries','Separate query structure from input values','Concatenate raw input into SQL','Disable input validation','Grant every caller administrator rights','Parameters prevent values becoming SQL syntax.','A search term contains quotes and SQL-like text.'],
  ['payload limits','Bound input size and supported shape','Accept unlimited bytes','Make all text trusted','Eliminate every outage','Limits reduce resource abuse and unexpected processing.','An endpoint expects a short answer but receives a huge body.'],
 ]],
 ['backend','persistence','Durable data and transactions','validation','https://www.postgresql.org/docs/current/tutorial-transactions.html',[
  ['a transaction','Group changes into one commit or rollback','Always use one network packet','Skip all consistency checks','Only cache data in a browser','Transactions define an atomic unit of work.','A transfer must debit and credit accounts together.'],
  ['rollback','Discard uncommitted transaction changes','Publish partial changes','Automatically redesign the schema','Permanently disable reads','Rollback avoids committing incomplete work.','The second required write fails after the first succeeds.'],
  ['commit','Make the transaction changes take effect','Discard successful writes','Only change a local variable','Always delete the database','Commit completes the transaction.','All required changes succeed and should become durable.'],
  ['uniqueness','Reject duplicate constrained keys','Sort every response','Encrypt all columns','Make all fields optional','A unique constraint is checked at the database boundary.','Concurrent requests try to create the same account key.'],
  ['idempotent retries','Recover the result for the same operation key','Always create another charge','Change the request meaning','Ignore committed writes','A stable operation key recognizes previously completed work.','A response is lost after a successful commit.'],
 ]],
 ['devops','git','Version control foundations',null,'https://git-scm.com/docs/gittutorial',[
  ['a commit','It records a history snapshot','It automatically deploys production','It always uploads every remote','It is only an unstaged edit','A commit records staged content and metadata.','A developer records a tested change in repository history.'],
  ['staging','It selects content for the next commit','It is the production server','It is always empty','It resolves all conflicts','The staging area lets a commit contain selected changes.','Only one of several edited files should enter the next commit.'],
  ['a branch','It names a line of development','It is another programming language','It erases all old commits','It automatically merges everything','Branches organize separate development histories.','A feature is developed separately before integration.'],
  ['a merge conflict','It requires resolving incompatible edits','It proves all files are lost','It should always be ignored','It changes every password','Incompatible overlapping edits need a deliberate resolution.','Two branches change the same lines differently.'],
  ['git status','It reports working-tree and staging state','It publishes a release','It deletes all branches','It generates an SSH key','Status shows modified and staged content.','A developer checks pending changes before committing.'],
 ]],
 ['devops','ci','Continuous integration checks','git','https://docs.github.com/en/actions/get-started/understand-github-actions',[
  ['a workflow trigger','It determines when automation starts','It is a user password','It is the build output','It disables all jobs','Events can initiate a workflow.','Checks should start when a pull request opens.'],
  ['a CI job','It groups steps on a runner','It is only a repository label','It always runs in the user browser','It cannot contain commands','Jobs organize automated execution.','Checkout, installation and tests run in sequence.'],
  ['a runner','It executes a workflow job','It is the HTML response','It is an issue comment','It is always a database owner','Runners supply execution resources.','A workflow needs an environment to run tests.'],
  ['failed checks','They should be investigated before integration','They prove tests must be removed','They mean the product is correct','They should be labelled passing','Failed checks are evidence of a problem to inspect.','A change breaks a previously passing test.'],
  ['CI secrets','Scope credentials and keep them out of logs','Commit credentials in plaintext','Print credentials for all readers','Copy credentials to public artifacts','Automation must not expose secrets.','A job requires a credential for an authorized action.'],
 ]],
 ['devops','containers','Containers and environments','ci','https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/',[
  ['an image','It is a packaged template for a container','It is always a running process','It is only a screenshot','It proves no vulnerabilities exist','Containers start from image files and configuration.','A team distributes a packaged application environment.'],
  ['a container','It is an isolated process environment','It always contains its own kernel','It is only a Git branch','It is always a virtual machine','Containers typically share their host kernel.','An application runs from an image on a container host.'],
  ['persistent storage','Keep durable data beyond a disposable container layer','Keep all data only in memory','Rely on the image name','Delete data on every restart','Data needs a deliberate persistence strategy.','Records must survive replacement of an application container.'],
  ['image versioning','Identify the packaged application being run','Assume all versions are equally safe','Remove the need for testing','Automatically migrate every database','Identifiable builds make reproducing releases clearer.','A team needs to reproduce yesterday’s deployment.'],
  ['least privilege','Give processes only necessary permissions','Run every task as administrator','Disable access checks','Publish host credentials','Limited permissions reduce potential damage.','An app needs only its own configuration and service ports.'],
 ]],
];
const review={status:'reviewed',reviewer:'Codex static content and answer review',reviewedAt:'2026-10-20',notes:'Original bounded practice; checked unique answers, scenario consistency and prerequisites. Not independent human certification or calibrated assessment.'};
const nodes=old.nodes.map(n=>({...n,canonicalId:uuid(n.domain+':'+n.slug),required:true,description:'Understand '+n.label.toLowerCase()+' through reading and practice.',resourceTitle:n.label,resourceSummary:'Read the guide, trace an example and explain its result in your own words.'}));
const groups=structuredClone(oldBank.nodes);
for(const [domain,slug,label,previous,url,concepts] of specs) {
 nodes.push({slug,domain,label,prerequisites:previous?[previous]:[],resourceUrl:url,wikipediaTitle:label,canonicalId:uuid(domain+':'+slug),required:true,description:'Build a practical foundation in '+label.toLowerCase()+'.',resourceTitle:label,resourceSummary:'Read the linked documentation and relate its concepts to a small example before the checkpoint.'});
 const items=[];
 for(const [i,[concept,right,w1,w2,w3,why,scenario]] of concepts.entries())for(let variant=0;variant<3;variant++) {
  const labels=[right,w1,w2,w3],shift=(i+variant)%4,ordered=labels.slice(shift).concat(labels.slice(0,shift));
  items.push({id:slug+'-'+variant+'-'+i,mode:variant===0?'checkpoint':'test-out',prompt:variant===0?`Which statement correctly describes ${concept}?`:variant===1?`${scenario} Which principle applies?`:`A learner claims that, for ${concept}, "${w1.toLowerCase()}". Which correction is accurate?`,options:ordered.map((text,j)=>({id:'abcd'[j],text})),correct:'abcd'[ordered.indexOf(right)],explanation:why});
 }
 groups.push({slug,domain,source:url,items});
}
const curriculum={version:'foundations-v1',license:'CC0-1.0',provenance:'Original CollegeHubs outlines and questions; external documentation linked, not reproduced. Four legacy topics retain equivalent concepts and original questions.',review,domains,nodes};
write('services/learn/src/data/curriculum/foundations-v1.json',curriculum);
write('services/learn/src/data/questions/foundations-v1.json',{version:curriculum.version,license:'CC0-1.0',review,attribution:'Original CollegeHubs practice content. Linked references retain their publishers’ licenses.',nodes:groups});
write('packages/contracts/learn-curricula.json',{domains,origins:['https://developer.mozilla.org','https://scikit-learn.org','https://www.postgresql.org','https://git-scm.com','https://docs.github.com','https://docs.docker.com'],equivalence:nodes.map(n=>({domain:n.domain,slug:n.slug,canonicalId:n.canonicalId,versions:old.nodes.some(o=>o.slug===n.slug)?['demo-v1','foundations-v1']:['foundations-v1']}))});
console.log('Published offline files:',nodes.length,'nodes;',groups.reduce((s,g)=>s+g.items.length,0),'questions.');
