'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'familyguard-website-'));
const port=30000+Math.floor(Math.random()*15000),base=`http://127.0.0.1:${port}`;
let server;
const start=()=>{server=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),FAMILYGUARD_DATA_DIR:temp},stdio:'ignore'});};
const stop=()=>new Promise(resolve=>{if(!server)return resolve();server.once('exit',resolve);server.kill('SIGTERM');setTimeout(resolve,1500).unref();});
async function waitForServer(){for(let i=0;i<90;i++){try{const r=await fetch(base);if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('test server did not start');}
async function call(path,data,token){const res=await fetch(`${base}/api/${path}`,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:data===undefined?undefined:JSON.stringify(data)});const j=await res.json();return {httpStatus:res.status,...j};}
(async()=>{try{
  start();await waitForServer();
  const parent=await call('register',{name:'Test Parent',username:'testparent',email:'parent@example.test',password:'a-good-password-321'});assert.equal(parent.httpStatus,200);assert.equal(parent.me.role,'parent');const pt=parent.token;
  const pairing=await call('pairing',{},pt);assert.equal(pairing.httpStatus,200);assert.match(pairing.qrSvg,/^<svg /);const pair=new URL(pairing.joinUrl).searchParams.get('pair');assert.ok(pair);
  const child=await call('join',{name:'Test Child',age:11,email:'child@example.test',pair});assert.equal(child.httpStatus,200);assert.equal(child.me.role,'child');const ct=child.token;
  const reused=await call('join',{name:'Another Child',age:10,email:'other@example.test',pair});assert.equal(reused.httpStatus,410);
  let dashboard=await call('overview',undefined,pt);assert.equal(dashboard.children.length,1);const childId=dashboard.children[0].id;
  assert.equal(dashboard.children[0].status.daily,120);
  const update=await call('settings',{childId,daily:90,bonus:30,bed:'21:30',wake:'07:15'},pt);assert.equal(update.httpStatus,200);assert.equal(update.status.daily,90);
  await call('set-age',{childId,age:10},pt);
  const request=await call('request',{app:'Sample Game'},ct);assert.equal(request.httpStatus,200);
  const approval=await call('decision',{id:request.request.id,decision:'approved'},pt);assert.equal(approval.httpStatus,200);
  const activity=await call('activity',{minutes:1},ct);assert.equal(activity.httpStatus,200);
  const childDashboard=await call('overview',undefined,ct);assert.equal(childDashboard.status.bonus,30);assert.equal(childDashboard.requests[0].status,'approved');
  const again=await call('pairing',{},pt);assert.equal(again.httpStatus,200);
  const rejoin=await call('join',{name:'Test Child',age:17,email:'child@example.test',pair:new URL(again.joinUrl).searchParams.get('pair')});
  assert.equal(rejoin.httpStatus,200);assert.equal(rejoin.me.id,childId);assert.equal(rejoin.me.age,10);
  const denied=await call('settings',{childId,daily:1},ct);assert.equal(denied.httpStatus,403);
  const forbidden=await call('overview',undefined,'not-a-session');assert.equal(forbidden.httpStatus,401);
  await stop();start();await waitForServer();
  dashboard=await call('overview',undefined,pt);assert.equal(dashboard.children[0].status.daily,90);assert.equal(dashboard.children[0].status.bonus,30);assert.equal(dashboard.requests[0].status,'approved');
  const saved=JSON.parse(fs.readFileSync(path.join(temp,'familyguard.json')));assert.equal(saved.users.length,2);
  const release=await call('end-supervision',{childId,password:'a-good-password-321',confirm:'END'},pt);assert.equal(release.httpStatus,200);
  const blocked=await call('request',{app:'Game After Release'},ct);assert.equal(blocked.httpStatus,403);
  const deletion=await call('delete-child',{childId,password:'a-good-password-321',confirm:'DELETE'},pt);assert.equal(deletion.httpStatus,200);
  const empty=await call('overview',undefined,pt);assert.equal(empty.children.length,0);
  console.log('PASS: parent login, QR pairing, one-time QR, child join, settings, age, requests, approvals, website usage, role checks, persistent restart, release, deletion.');
}catch(e){console.error('FAIL:',e);process.exitCode=1;}finally{await stop();fs.rmSync(temp,{recursive:true,force:true});}})();
