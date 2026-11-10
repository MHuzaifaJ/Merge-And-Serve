import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PokiBridge} from '../src/poki.ts';
import {GameTracking,captureTrackingState,itemName} from '../src/tracking.ts';
import {Kitchen} from '../src/model.ts';

function fakeSDK(){
 const calls=[];
 const sdk={init:async()=>{calls.push(['init']);},enableEventTracking:()=>calls.push(['enableEventTracking']),gameLoadingFinished:()=>calls.push(['gameLoadingFinished']),gameplayStart:()=>calls.push(['gameplayStart']),gameplayStop:()=>calls.push(['gameplayStop']),measure:(...args)=>calls.push(['measure',...args])};
 return {calls,sdk};
}

test('Poki initializes once, reports loading before events and deduplicates gameplay transitions',async()=>{
 const {sdk,calls}=fakeSDK(),bridge=new PokiBridge(true);let loads=0;
 bridge.loadingFinished();bridge.setPlaying(true);bridge.measure('tutorial','onboarding','start');
 await Promise.all([bridge.initialize(async()=>{loads++;return sdk;}),bridge.initialize(async()=>{throw Error('must not reload');})]);
 assert.equal(loads,1);
 assert.deepEqual(calls,[['init'],['enableEventTracking'],['gameLoadingFinished'],['gameplayStart'],['measure','tutorial','onboarding','start']]);
 bridge.loadingFinished();bridge.setPlaying(true);bridge.setPlaying(false);bridge.setPlaying(false);bridge.setPlaying(true);
 assert.deepEqual(calls.slice(-2),[['gameplayStop'],['gameplayStart']]);
 assert.equal(calls.filter(c=>c[0]==='gameLoadingFinished').length,1);
});
test('SDK readiness never falsely starts gameplay and retains the latest focus/menu state',async()=>{
 const {sdk,calls}=fakeSDK(),bridge=new PokiBridge(true);
 await bridge.initialize(async()=>sdk);bridge.setPlaying(true);bridge.setPlaying(false);
 assert.deepEqual(calls,[['init'],['enableEventTracking']]);bridge.loadingFinished();
 assert.deepEqual(calls.at(-1),['gameLoadingFinished']);assert.equal(calls.filter(c=>c[0]==='gameplayStart').length,0);
 bridge.setPlaying(true);assert.deepEqual(calls.at(-1),['gameplayStart']);
});
test('normal builds never load or report to Poki',async()=>{
 const bridge=new PokiBridge(false);await bridge.initialize(async()=>{throw Error('loader must not run');});bridge.loadingFinished();bridge.setPlaying(true);bridge.measure('item','burger_1','generate');assert.equal(bridge.status,'disabled');
});
test('blocked SDK stays safe while slow SDK loading remains reconnectable',async()=>{
 const blocked=new PokiBridge(true);blocked.measure('tutorial','onboarding','start');await blocked.initialize(async()=>{throw Error('CDN blocked');});assert.equal(blocked.status,'unavailable');assert.doesNotThrow(()=>{blocked.loadingFinished();blocked.setPlaying(true);blocked.measure('item','burger_1','generate');});
 const {sdk,calls}=fakeSDK();let resolveLoader;const bridge=new PokiBridge(true);
 await bridge.initialize(()=>new Promise(resolve=>{resolveLoader=resolve;}),5);assert.equal(bridge.status,'waiting');resolveLoader(sdk);await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[['init'],['enableEventTracking']]);assert.equal(bridge.status,'ready');
 const hung=new PokiBridge(true);await hung.initialize(async()=>({...sdk,init:()=>new Promise(()=>{})}),5);assert.equal(hung.status,'waiting');
});
test('a rejected SDK init still allows safe loading/gameplay reporting, and failed measures stay isolated',async()=>{
 const {sdk,calls}=fakeSDK();sdk.init=async()=>{throw Error('adblock');};sdk.measure=()=>{throw Error('tracking failed');};
 const bridge=new PokiBridge(true);await bridge.initialize(async()=>sdk);assert.equal(bridge.status,'degraded');
 bridge.loadingFinished();bridge.setPlaying(true);assert.doesNotThrow(()=>bridge.measure('item','burger_1','generate'));bridge.setPlaying(false);
 assert.deepEqual(calls,[['enableEventTracking'],['gameLoadingFinished'],['gameplayStart'],['gameplayStop']]);
});
test('tracking records all tutorial steps, exactly three paid orders, group completion and burger upgrade',()=>{
 const events=[],tracking=new GameTracking({measure:(...args)=>events.push(args)}),k=Kitchen.newPlayer();
 while(k.tutorialAction){
  const before=captureTrackingState(k),action=k.tutorialAction;let item,kind,paid=false;
  if(action.kind==='generate'){item={type:action.type,level:1};kind='generate';assert.equal(k.addItem(action.type),true);}
  else if(action.kind==='merge'){kind='merge';assert.equal(k.move(action.from,action.to),true);item=k.board[action.to];}
  else {kind='serve';item=k.board[action.from];const result=k.deliver(action.from,action.customer);assert.equal(result.accepted,true);paid=result.payment>0;}
  tracking.action(before,k,itemName(item),kind,paid);
 }
 assert.equal(events.filter(e=>e.join('/')==='tutorial/onboarding/start').length,1);
 assert.equal(events.filter(e=>e[0]==='tutorial'&&e[1].startsWith('step_')&&e[2]==='complete').length,12);
 assert.equal(events.filter(e=>e.join('/')==='tutorial/onboarding/complete').length,1);
 assert.equal(events.filter(e=>e.join('/')==='round/customer_order/complete').length,3);
 assert.equal(events.filter(e=>e.join('/')==='round/customer_group/complete').length,1);
 assert.equal(events.filter(e=>e.join('/')==='upgrade/burger_2/complete').length,1);
 assert.ok(events.some(e=>e.join('/')==='checkpoint/groups_1/complete'));
 const pending=events.filter(e=>e.join('/')==='upgrade/fries_2/start');assert.equal(pending.length,0);
});
test('reloads send resume rather than replaying earlier tutorial steps, and reset starts a fresh group',()=>{
 const events=[],tracking=new GameTracking({measure:(...args)=>events.push(args)});let k=Kitchen.newPlayer();k.addItem(0);k=Kitchen.restore(structuredClone(k.snapshot()));tracking.resumed(k);
 assert.deepEqual(events,[['tutorial','onboarding','resume']]);
 let before=captureTrackingState(k),item=k.board[0];k.deliver(0,0);tracking.action(before,k,itemName(item),'serve',true);
 assert.ok(events.some(e=>e.join('/')==='tutorial/step_2/complete'));assert.ok(!events.some(e=>e.join('/')==='tutorial/step_1/complete'));
 tracking.reset();k=Kitchen.newPlayer();before=captureTrackingState(k);k.addItem(0);tracking.action(before,k,'burger_1','generate');
 assert.equal(events.filter(e=>e.join('/')==='round/customer_group/start').length,2);assert.ok(events.some(e=>e.join('/')==='button/reset_game/complete'));
});
test('new category introductions emit a start event once at the group transition',()=>{
 const events=[],tracking=new GameTracking({measure:(...args)=>events.push(args)}),k=new Kitchen(7);
 k.demand={highestServed:[2,1,1],pending:null,nextIntroductionAt:1};k.customers=[{portrait:0,items:[{type:0,level:1,done:false}],payment:30,paid:false}];k.board[0]={type:0,level:1};
 const before=captureTrackingState(k);k.deliver(0,0);tracking.action(before,k,'burger_1','serve',true);
 assert.equal(events.filter(e=>e.join('/')==='upgrade/fries_2/start').length,1);
});

test('slow Inspector initialization reconnects later and reports loading before gameplay',async()=>{
 const {sdk,calls}=fakeSDK();let finishInit;
 sdk.init=()=>{calls.push(['init']);return new Promise(resolve=>{finishInit=resolve;});};
 const bridge=new PokiBridge(true);bridge.loadingFinished();bridge.setPlaying(true);
 await bridge.initialize(async()=>sdk,5);
 assert.equal(bridge.status,'waiting');
 bridge.measure('tutorial','onboarding','start');finishInit();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(bridge.status,'ready');assert.deepEqual(calls,[['init'],['enableEventTracking'],['gameLoadingFinished'],['gameplayStart'],['measure','tutorial','onboarding','start']]);
});
test('transient SDK loading and gameplay call failures can retry without false reported state',async()=>{
 const {sdk,calls}=fakeSDK();let failedLoad=false,failedStart=false;
 sdk.gameLoadingFinished=()=>{if(!failedLoad){failedLoad=true;throw Error('Inspector not ready');}calls.push(['gameLoadingFinished']);};
 sdk.gameplayStart=()=>{if(!failedStart){failedStart=true;throw Error('Inspector not ready');}calls.push(['gameplayStart']);};
 const bridge=new PokiBridge(true);await bridge.initialize(async()=>sdk);bridge.loadingFinished();
 bridge.setPlaying(true);bridge.setPlaying(true);bridge.setPlaying(true);bridge.setPlaying(false);
 assert.deepEqual(calls,[['init'],['enableEventTracking'],['gameLoadingFinished'],['gameplayStart'],['gameplayStop']]);
});

test('late SDK readiness retains the latest paused state and reports loading just once',async()=>{
 const {sdk,calls}=fakeSDK();let finishInit;sdk.init=()=>new Promise(resolve=>{finishInit=resolve;});
 const bridge=new PokiBridge(true);bridge.loadingFinished();bridge.setPlaying(true);await bridge.initialize(async()=>sdk,5);
 bridge.setPlaying(false);finishInit();await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[['enableEventTracking'],['gameLoadingFinished']]);
 bridge.loadingFinished();bridge.setPlaying(true);bridge.setPlaying(true);bridge.setPlaying(false);
 assert.deepEqual(calls.slice(-2),[['gameplayStart'],['gameplayStop']]);assert.equal(calls.filter(c=>c[0]==='gameLoadingFinished').length,1);
});
