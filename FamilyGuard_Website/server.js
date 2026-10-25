'use strict';
// Browser-only FamilyGuard website. Never claims to control other apps or the device.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const QRCode = require('./vendor/QRCode');
const QRErrorCorrectLevel = require('./vendor/QRCode/QRErrorCorrectLevel');
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.env.FAMILYGUARD_DATA_DIR || path.join(__dirname, 'data'));
fs.mkdirSync(DATA_DIR, {recursive:true,mode:0o700});
const DB = path.join(DATA_DIR, 'familyguard.json');
const fresh = () => ({users: [], families: [], requests: [], sessions: [], events: [], pairings: [], transfers: []});
let db;
try { db = {...fresh(), ...JSON.parse(fs.readFileSync(DB, 'utf8'))}; } catch { db = fresh(); }
const now = () => Date.now();
const id = () => crypto.randomBytes(12).toString('hex');
const token = () => crypto.randomBytes(32).toString('base64url');
const digest = t => crypto.createHash('sha256').update(t).digest('hex');
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const save = () => { const tmp=DB+'.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2), {mode:0o600}); fs.renameSync(tmp,DB); };
const headers = {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY'};
function send(res, status, data){res.writeHead(status, headers);res.end(JSON.stringify(data));}
function error(res,status,message){return send(res,status,{error:message});}
const emailValid = x => typeof x === 'string' && x.length<=190 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x);
const validText = (x,max=80) => typeof x === 'string' && x.trim().length>0 && x.trim().length<=max;
const passOK = (pw,u) => {
  if (typeof pw!=='string'||!u||!u.salt||!u.passwordHash)return false;
  const a=Buffer.from(hashPassword(pw,u.salt),'hex'),b=Buffer.from(u.passwordHash,'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
};
const safeUser = u => ({id:u.id,name:u.name,role:u.role,username:u.role==='parent'?u.username:undefined,
  email:u.email,age:u.role==='child'?u.age:undefined,ageConfirmed:u.role==='child'?Boolean(u.ageConfirmed):undefined,
  active:u.role==='child'?u.active!==false:undefined});
const familyOf = u => db.families.find(f=>f.id===u.familyId);
const familySummary = u => {const f=familyOf(u);return {me:safeUser(u),family:f?{id:f.id,
  children:db.users.filter(x=>x.familyId===f.id&&x.role==='child').map(safeUser)}:null};};
const tokenSession = request => {const h=request.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):'';
  const s=db.sessions.find(x=>x.digest===digest(t)&&x.until>now());
  return s ? db.users.find(x=>x.id===s.userId) : undefined;};
const issueSession = (user,res) => {const raw=token(); db.sessions.push({digest:digest(raw),userId:user.id,until:now()+(user.role==='parent'?7:30)*86400000});save();send(res,200,{token:raw,...familySummary(user)});};
const originalSettings = () => ({daily:120,bonus:0,bed:'21:00',wake:'07:00'});
const londonDate = at => new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
const londonMinuteOfDay = at => {const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(at));return Number(parts.find(x=>x.type==='hour').value)*60+Number(parts.find(x=>x.type==='minute').value);};
const todayMinutes = u => {const day=londonDate(now());return db.events.filter(e=>e.userId===u.id&&londonDate(e.at)===day).reduce((s,e)=>s+e.minutes,0);};
function limits(u){const f=familyOf(u);const settings=f?.settings?.[u.id]||originalSettings();const t=londonMinuteOfDay(now());
  const [bh,bm]=settings.bed.split(':').map(Number),[wh,wm]=settings.wake.split(':').map(Number);const b=bh*60+bm,w=wh*60+wm;
  const downtime=b===w?false:b>w?(t>=b||t<w):(t>=b&&t<w),used=todayMinutes(u);
  return {...settings,used,remaining:Math.max(0,settings.daily+settings.bonus-used),downtime,locked:downtime||used>=settings.daily+settings.bonus};}
// Limit online pairing guesses; short-lived random one-use token is also required.
const counters = new Map();
function limited(req,key,count=20){const ip=req.socket.remoteAddress||'local',k=ip+':'+key,v=counters.get(k)||{n:0,until:now()+60000};
  if(now()>v.until){v.n=0;v.until=now()+60000;}v.n++;counters.set(k,v);return v.n>count;}
function buildQR(value){const qr=new QRCode(-1,QRErrorCorrectLevel.M);qr.addData(value);qr.make();const n=qr.getModuleCount();
  const runs=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))runs.push(`M${x+4} ${y+4}h1v1h-1z`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n+8} ${n+8}" shape-rendering="crispEdges" role="img" aria-label="FamilyGuard one-time pairing QR code"><rect width="100%" height="100%" fill="#fff"/><path d="${runs.join('')}" fill="#111827"/></svg>`;}
function getOrigin(req){
  // Set FAMILYGUARD_PUBLIC_URL for production behind a reverse proxy (HTTPS).
  if(process.env.FAMILYGUARD_PUBLIC_URL){try{const url=new URL(process.env.FAMILYGUARD_PUBLIC_URL);if(['https:','http:'].includes(url.protocol))return url.origin;}catch{}}
  // Use the same-origin browser Origin header where possible. Avoid reflecting arbitrary URL from a client field.
  const host=String(req.headers.host||'').trim();if(!/^[a-zA-Z0-9._:\[\]-]+$/.test(host))return null;
  const candidate=req.headers.origin; if(candidate){try{const u=new URL(candidate);if(['http:','https:'].includes(u.protocol)&&u.host===host)return u.origin;}catch{}}
  return `${req.socket.encrypted?'https':'http'}://${host}`;
}
async function api(req,res,route){let body={};if(['POST','PATCH'].includes(req.method)){
  try{let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>100000)throw new Error('too large');}body=JSON.parse(raw||'{}');}
  catch{return error(res,400,'Invalid request body');}}
  if(route==='/api/register'&&req.method==='POST'){
    if(limited(req,'register',10))return error(res,429,'Too many registrations. Try later.');
    const {name,username,email,password}=body;
    if(!validText(name)||!validText(username,40)||!emailValid(email)||typeof password!=='string'||password.length<10||password.length>128)
      return error(res,400,'Parent requires name, username, valid email and a password of 10–128 characters.');
    if(db.users.some(u=>u.role==='parent'&&(u.username.toLowerCase()===username.trim().toLowerCase()||u.email===email.toLowerCase())))return error(res,409,'Username or email already registered');
    const salt=crypto.randomBytes(16).toString('hex');const u={id:id(),role:'parent',name:name.trim(),username:username.trim(),email:email.toLowerCase(),salt,passwordHash:hashPassword(password,salt),familyId:id()};
    db.users.push(u);db.families.push({id:u.familyId,settings:{},locations:{}});save();return issueSession(u,res);
  }
  if(route==='/api/login'&&req.method==='POST'){
    if(limited(req,'login',18))return error(res,429,'Too many attempts. Try again later.');
    const username=String(body.username||'').toLowerCase().trim();const u=db.users.find(x=>x.role==='parent'&&(x.username.toLowerCase()===username||x.email===username));
    if(!passOK(body.password,u))return error(res,401,'Incorrect parent username/email or password');return issueSession(u,res);
  }
  if(route==='/api/join'&&req.method==='POST'){
    if(limited(req,'join',12))return error(res,429,'Too many pairing attempts. Try again later.');
    const {pair,name,age,email}=body, n=Number(age);
    if(!validText(name)||!Number.isInteger(n)||n<4||n>17||!emailValid(email))return error(res,400,'Enter child name, age (4–17) and email.');
    if(typeof pair!=='string'||pair.length<30)return error(res,400,'Scan a valid parent QR code');
    const record=db.pairings.find(p=>p.digest===digest(pair)&&!p.usedAt&&p.expiresAt>now());
    if(!record)return error(res,410,'QR code expired or already used. Ask your parent to display a new one.');
    const family=db.families.find(f=>f.id===record.familyId);if(!family)return error(res,404,'Family unavailable');
    record.usedAt=now();
    // Re-pairing with an existing child's email reconnects that profile instead of erasing saved rules.
    let u=db.users.find(x=>x.role==='child'&&x.familyId===family.id&&x.active!==false&&x.email===email.toLowerCase());
    if(!u){u={id:id(),role:'child',name:name.trim(),age:n,email:email.toLowerCase(),ageConfirmed:false,active:true,familyId:family.id,joinedAt:now()};db.users.push(u);family.settings[u.id]=originalSettings();}
    save();return issueSession(u,res);
  }
  if(route==='/api/transfer-accept'&&req.method==='POST'){
    if(limited(req,'transfer',8))return error(res,429,'Too many sign-in attempts. Try later.');
    const code=String(body.code||'').trim().toUpperCase();
    const t=db.transfers.find(x=>x.digest===digest(code)&&x.expiresAt>now()&&!x.usedAt);
    if(!t)return error(res,410,'Transfer code expired or invalid. Create a new one from the original child session.');
    const child=db.users.find(x=>x.id===t.userId&&x.role==='child'&&x.active!==false);
    if(!child)return error(res,403,'This child account is no longer active');
    t.usedAt=now();save();return issueSession(child,res);
  }
  const u=tokenSession(req);if(!u)return error(res,401,'Log in first');const f=familyOf(u);
  if(route==='/api/me'&&req.method==='GET')return send(res,200,familySummary(u));
  if(route==='/api/pairing'&&req.method==='POST'){
    if(u.role!=='parent'||!f)return error(res,403,'Parent access only');if(limited(req,'pairing',15))return error(res,429,'Too many QR refreshes. Try later.');
    db.pairings=db.pairings.filter(x=>x.expiresAt>now()&&!x.usedAt&&x.familyId!==f.id);
    const code=token(),expiresAt=now()+5*60000;
    const origin=getOrigin(req);if(!origin)return error(res,400,'Invalid server host');
    const joinUrl=`${origin}/join?pair=${encodeURIComponent(code)}`;
    db.pairings.push({digest:digest(code),familyId:f.id,expiresAt});save();
    return send(res,200,{qrSvg:buildQR(joinUrl),joinUrl,expiresAt});
  }
  if(!f)return error(res,403,'Family unavailable');
  if(route==='/api/overview'&&req.method==='GET'){
    if(u.role==='child')return send(res,200,{released:u.active===false,status:u.active===false?null:limits(u),
      profile:safeUser(u),requests:db.requests.filter(r=>r.childId===u.id).slice(-20).reverse()});
    const kids=db.users.filter(x=>x.familyId===f.id&&x.role==='child').map(x=>({...safeUser(x),status:x.active===false?null:limits(x),location:f.locations[x.id]||null}));
    return send(res,200,{children:kids,requests:db.requests.filter(r=>r.familyId===f.id).slice(-50).reverse()});
  }
  if(route==='/api/end-supervision'&&req.method==='POST'){
    if(u.role!=='parent')return error(res,403,'Parent access only');
    const child=db.users.find(x=>x.id===body.childId&&x.familyId===f.id&&x.role==='child');
    if(!child||child.active===false)return error(res,404,'Active child not found');
    if(body.confirm!=='END' || !passOK(body.password,u))return error(res,403,'Enter END and your parent password to release this device');
    child.active=false;child.releasedAt=now();delete f.locations[child.id];
    // Not an app uninstall: the installed app cannot be removed remotely from consumer devices.
    save();return send(res,200,{ok:true,message:'Supervision ended. This only unlinks the browser account; no phone software is removed.'});
  }
  if(route==='/api/clear-location'&&req.method==='POST'){
    if(u.role!=='parent')return error(res,403,'Parent access only');
    const child=db.users.find(x=>x.id===body.childId&&x.familyId===f.id&&x.role==='child');
    if(!child)return error(res,404,'Child not found');
    delete f.locations[child.id];save();return send(res,200,{ok:true});
  }
  if(route==='/api/delete-child'&&req.method==='POST'){
    if(u.role!=='parent')return error(res,403,'Parent access only');
    const child=db.users.find(x=>x.id===body.childId&&x.familyId===f.id&&x.role==='child');
    if(!child||body.confirm!=='DELETE'||!passOK(body.password,u))return error(res,403,'Parent password and DELETE confirmation required');
    db.users=db.users.filter(x=>x.id!==child.id);
    db.sessions=db.sessions.filter(x=>x.userId!==child.id);
    db.events=db.events.filter(x=>x.userId!==child.id);
    db.requests=db.requests.filter(x=>x.childId!==child.id);
    db.transfers=db.transfers.filter(x=>x.userId!==child.id);
    delete f.settings[child.id];delete f.locations[child.id];save();
    return send(res,200,{ok:true});
  }
  if(route==='/api/set-age'&&req.method==='POST'){
    if(u.role!=='parent')return error(res,403,'Parent access only');
    const child=db.users.find(x=>x.id===body.childId&&x.familyId===f.id&&x.role==='child'&&x.active!==false),age=Number(body.age);
    if(!child||!Number.isInteger(age)||age<4||age>17)return error(res,400,'Select a linked child and age 4–17');
    child.age=age;child.ageConfirmed=true;save();return send(res,200,{profile:safeUser(child)});
  }
  if(u.role==='child'&&u.active===false)return error(res,403,'Parent has ended FamilyGuard supervision');
  if(route==='/api/settings'&&req.method==='POST'){
    if(u.role!=='parent')return error(res,403,'Parent access only');
    const child=db.users.find(x=>x.id===body.childId&&x.familyId===f.id&&x.role==='child'&&x.active!==false);
    if(!child)return error(res,404,'Child not found');const s=f.settings[child.id];
    for(const key of ['daily','bonus'])if(body[key]!==undefined){const n=Number(body[key]);if(!Number.isInteger(n)||n<0||n>1440)return error(res,400,`${key} must be 0–1440`);s[key]=n;}
    for(const key of ['bed','wake'])if(body[key]!==undefined){if(typeof body[key]!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(body[key]))return error(res,400,'Use HH:MM');s[key]=body[key];}
    save();return send(res,200,{status:limits(child)});
  }
  if(route==='/api/request'&&req.method==='POST'){
    if(u.role!=='child')return error(res,403,'Child access only');const app=String(body.app||'').trim().slice(0,120);
    if(!app)return error(res,400,'Enter an app name');const r={id:id(),familyId:f.id,childId:u.id,app,status:'pending',created:now()};db.requests.push(r);save();return send(res,200,{request:r});
  }
  if(route==='/api/decision'&&req.method==='POST'){
    if(u.role!=='parent')return error(res,403,'Parent access only');const r=db.requests.find(x=>x.id===body.id&&x.familyId===f.id);
    if(!r||r.status!=='pending'||!['approved','denied'].includes(body.decision))return error(res,400,'Invalid decision');r.status=body.decision;r.decided=now();save();return send(res,200,{request:r});
  }
  if(route==='/api/activity'&&req.method==='POST'){
    if(u.role!=='child')return error(res,403,'Child access only');const n=Number(body.minutes);
    if(!Number.isInteger(n)||n<1||n>2)return error(res,400,'Invalid interval');db.events.push({userId:u.id,at:now(),minutes:n});db.events=db.events.filter(x=>x.at>now()-8*86400000);save();return send(res,200,{status:limits(u)});
  }
  if(route==='/api/location'&&req.method==='POST'){
    if(u.role!=='child')return error(res,403,'Child access only');const lat=Number(body.lat),lon=Number(body.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return error(res,400,'Invalid coordinates');
    f.locations[u.id]={lat,lon,at:now()};save();return send(res,200,{ok:true});
  }
  if(route==='/api/transfer-create'&&req.method==='POST'){
    if(u.role!=='child')return error(res,403,'Child access only');
    if(limited(req,'create-transfer',6))return error(res,429,'Too many transfer codes. Try later.');
    db.transfers=db.transfers.filter(x=>x.expiresAt>now()&&!x.usedAt&&x.userId!==u.id);
    const code=crypto.randomBytes(8).toString('hex').toUpperCase(),expiresAt=now()+10*60000;
    db.transfers.push({digest:digest(code),userId:u.id,expiresAt});save();
    return send(res,200,{code,expiresAt});
  }
  if(route==='/api/content-search'&&req.method==='POST'){
    if(u.role!=='child')return error(res,403,'Child access only');
    const q=String(body.q||'').trim().toLowerCase().slice(0,100),maxAge=u.ageConfirmed?u.age:Math.min(u.age||8,8);
    const library=[
      {title:'How rainbows work',category:'Science',minAge:4,summary:'Discover why sunlight creates colourful rainbows.'},
      {title:'Learn to draw forest animals',category:'Arts',minAge:4,summary:'A creative drawing activity for children.'},
      {title:'Understanding ecosystems',category:'Nature',minAge:8,summary:'Explore food chains and habitats.'},
      {title:'Learning safe online habits',category:'Digital safety',minAge:9,summary:'How to spot suspicious messages and scams.'},
      {title:'Introduction to cybersecurity',category:'Computing',minAge:12,summary:'Protect your accounts and devices.'},
      {title:'Preparing for college',category:'Learning',minAge:15,summary:'Ideas for choosing subjects and careers.'}
    ];
    const items=library.filter(x=>x.minAge<=maxAge&&(!q||[x.title,x.category,x.summary].join(' ').toLowerCase().includes(q)));
    return send(res,200,{maxAge,verified:Boolean(u.ageConfirmed),items,note:'This demo filters only FamilyGuard’s sample catalogue. It cannot filter Google, YouTube, Instagram or the phone.'});
  }
  return error(res,404,'Unknown endpoint');
}
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){try{return await api(req,res,url.pathname)}catch(e){console.error('API error:',e);return error(res,500,'Server error');}}
  const route=url.pathname==='/join'?'/index.html':url.pathname==='/'?'/index.html':url.pathname;
  let filepath; try{filepath=path.resolve(__dirname,'public','.'+decodeURIComponent(route));}catch{return error(res,400,'Bad path');}
  if(!filepath.startsWith(path.join(__dirname,'public')+path.sep))return error(res,403,'Forbidden');
  fs.readFile(filepath,(e,data)=>{if(e){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':MIME[path.extname(filepath)]||'application/octet-stream',
      'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
      'Cache-Control':url.pathname==='/join'?'no-store':'no-cache'});res.end(data);});
}).listen(PORT,'0.0.0.0',()=>console.log(`FamilyGuard website available at http://localhost:${PORT}`));
