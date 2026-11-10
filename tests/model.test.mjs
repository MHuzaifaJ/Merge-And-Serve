import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Kitchen,DECORATIONS} from '../src/model.ts';
const request=(type,level=1)=>({type,level,done:false});
const customer=(portrait,items)=>({portrait,items,payment:items.reduce((s,r)=>s+30*2**(r.level-1),0),paid:false});
const oldFree=['wall-classic','counter-classic','wall-prop-none','prop-none'];
const oldEquipped={wall:'wall-classic',counter:'counter-classic',wallProp:'wall-prop-none',counterProp:'prop-none'};
function finishGroup(k){const before=k.groupsCompleted,old=k.customers;for(let c=0;c<old.length;c++)for(const r of old[c].items){if(r.done)continue;k.board[0]={type:r.type,level:r.level};assert.equal(k.deliver(0,c).accepted,true);}assert.equal(k.groupsCompleted,before+1);return old;}

test('all three free generators and nine slots are available from the start',()=>{const k=new Kitchen(42);for(let i=0;i<9;i++)assert.equal(k.addItem(i%3),true);assert.equal(k.addItem(),false);assert.equal(k.addItem(3),false);assert.equal(k.coins,0);assert.deepEqual(k.board.slice(0,3),[0,1,2].map(type=>({type,level:1})));});
test('merge is chain/stage-specific, caps at four; bin is free and gives no refund',()=>{const k=new Kitchen(4);k.board[0]={type:0,level:1};k.board[1]={type:1,level:1};assert.equal(k.move(0,1),true);assert.deepEqual(k.board.slice(0,2),[{type:1,level:1},{type:0,level:1}]);k.board[0]={type:0,level:1};k.board[1]={type:0,level:1};assert.equal(k.move(0,1),true);assert.deepEqual(k.board[1],{type:0,level:2});k.board[0]={type:0,level:4};k.board[1]={type:0,level:4};assert.equal(k.move(0,1),true);assert.deepEqual(k.board.slice(0,2),[{type:0,level:4},{type:0,level:4}]);assert.equal(k.bin(0),true);assert.equal(k.coins,0);assert.equal(k.bin(-1),false);});
test('partial order never pays, full order pays once and waits for the entire group',()=>{const k=new Kitchen(42);k.customers=[customer(0,[request(0),request(2)]),customer(1,[request(1)])];const group=k.customers;k.board[8]={type:2,level:4};k.board[0]={type:0,level:1};assert.equal(k.deliver(0,0).payment,0);k.board[0]={type:0,level:1};assert.equal(k.deliver(0,0).accepted,false);assert.notEqual(k.board[0],null);k.board[0]={type:2,level:1};assert.equal(k.deliver(0,0).payment,60);assert.equal(k.customers,group);k.board[0]={type:2,level:1};assert.equal(k.deliver(0,0).accepted,false);assert.equal(k.coins,60);k.board[0]={type:1,level:1};assert.equal(k.deliver(0,1).groupComplete,true);assert.equal(k.coins,90);assert.notEqual(k.customers,group);assert.deepEqual(k.board[8],{type:2,level:4});});
test('random groups/orders cover 1-3 and every order has distinct categories at all stages',()=>{const k=new Kitchen(123456),groups=new Set(),quantities=new Set();for(let i=0;i<500;i++){groups.add(k.customers.length);assert.equal(new Set(k.customers.map(c=>c.items.map(r=>`${r.type}:${r.level}`).sort().join("|"))).size,k.customers.length);assert.equal(new Set(k.customers.map(c=>c.portrait)).size,k.customers.length);for(const c of k.customers){quantities.add(c.items.length);assert.equal(new Set(c.items.map(r=>r.type)).size,c.items.length);assert.ok(c.items.every(r=>r.type>=0&&r.type<3&&r.level>=1&&r.level<=4));}finishGroup(k);}assert.deepEqual([...groups].sort(),[1,2,3]);assert.deepEqual([...quantities].sort(),[1,2,3]);assert.equal(k.groupsCompleted,500);assert.equal('shop' in k,false);assert.equal('level' in k,false);});
test('introductions advance one category at a time only after serving, with 2–3 whole groups between',()=>{
 const k=new Kitchen(123),sequence=[],introGroups=[];let previousServedGroup=-1;
 for(let g=0;g<100;g++){
  const pending=k.demand.pending;
  if(pending){
   sequence.push({...pending});introGroups.push(k.groupsCompleted);
   if(previousServedGroup>=0)assert.ok([2,3].includes(k.groupsCompleted-previousServedGroup));
   assert.ok(k.customers[0].items.some(r=>r.type===pending.type&&r.level===pending.level));
   const saved=structuredClone(k.snapshot());k.makeOrders();assert.deepEqual(k.demand.pending,pending);
   // Restore the actual current group; a reload must not reroll its introduction.
   Object.assign(k,Kitchen.restore(saved));
   previousServedGroup=k.groupsCompleted+1;
  }
  for(const c of k.customers)for(const r of c.items){
   const highest=k.demand.highestServed[r.type];
   assert.ok(r.level===highest||highest>1&&r.level===highest-1||pending&&r.type===pending.type&&r.level===pending.level);
  }
  finishGroup(k);
 }
 assert.deepEqual(sequence,Array.from({length:9},(_,i)=>({type:i%3,level:2+Math.floor(i/3)})));
 assert.ok([2,3].includes(introGroups[0]));assert.deepEqual(k.demand.highestServed,[4,4,4]);assert.equal(k.demand.nextIntroductionAt,null);
});
test('same seed and themes produce identical future random groups',()=>{const a=new Kitchen(33),b=new Kitchen(33);b.coins=2000;for(const id of ['wall-mint','counter-walnut','nameplate-teal'])assert.equal(b.purchaseDecoration(id),true);assert.deepEqual(a.customers,b.customers);for(let i=0;i<25;i++){finishGroup(a);finishGroup(b);assert.deepEqual(a.customers,b.customers);}});
test('exactly four themes per category, three free defaults, no accessory slots',()=>{const k=new Kitchen(5);for(const cat of ['wall','counter','nameplate'])assert.equal(DECORATIONS.filter(d=>d.category===cat).length,4);assert.equal(k.owned.length,3);assert.deepEqual(Object.keys(k.equipped).sort(),['counter','nameplate','wall']);assert.equal(k.purchaseDecoration('prop-plant'),false);assert.equal(k.purchaseDecoration('wall-prop-clock'),false);assert.equal(k.purchaseDecoration('wall-rose'),false);k.coins=2000;for(const id of ['wall-rose','counter-walnut','nameplate-teal'])assert.equal(k.purchaseDecoration(id),true);const coins=k.coins;assert.equal(k.purchaseDecoration('nameplate-teal'),false);assert.equal(k.equipDecoration('nameplate-classic'),true);assert.equal(k.equipDecoration('nameplate-teal'),true);assert.equal(k.coins,coins);for(let i=0;i<25;i++)finishGroup(k);assert.equal(k.equipped.nameplate,'nameplate-teal');});
test('v6 save keeps partial orders, board, all three themes and RNG sequence',()=>{const k=new Kitchen(99);k.customers=[customer(0,[request(0),request(2)]),customer(1,[request(1)])];k.coins=500;k.purchaseDecoration('nameplate-coral');k.board[0]={type:0,level:1};k.deliver(0,0);k.board[8]={type:2,level:3};const saved=k.snapshot(),restored=Kitchen.restore(JSON.parse(JSON.stringify(saved)));assert.equal(saved.version,6);assert.deepEqual(restored.snapshot(),saved);restored.board[8]=null;assert.notEqual(k.board[8],null);restored.board[8]={type:2,level:3};for(let i=0;i<25;i++){finishGroup(k);finishGroup(restored);assert.deepEqual(restored.snapshot(),k.snapshot());}});
test('v6 rejects duplicate categories even if the variants and payment differ',()=>{const k=new Kitchen(77),base=k.snapshot();const dup=customer(0,[request(0),request(0,2)]);assert.equal(Kitchen.restore({...base,coins:999,customers:[dup]}).coins,0);for(const patch of [{customers:[]},{rngState:0},{coins:-1},{board:Array(9).fill({type:4,level:1})},{owned:['bogus']},{equipped:{wall:'counter-classic'}}])assert.equal(Kitchen.restore({...base,...patch}).coins,0);});
test('v5 owned accessories refund once, valid current orders and board survive',()=>{const k=new Kitchen(51),p={...k.snapshot(),version:5,coins:380,owned:[...oldFree,'wall-prop-clock','wall-prop-picture','prop-plant','prop-flowers'],equipped:{...oldEquipped,wallProp:'wall-prop-picture',counterProp:'prop-flowers'}};const r=Kitchen.restore(p);assert.equal(r.coins,880);assert.deepEqual(r.customers,p.customers);assert.deepEqual(r.board,p.board);assert.equal(r.equipped.nameplate,'nameplate-classic');assert.equal(r.owned.some(id=>id.includes('prop')),false);assert.equal(Kitchen.restore(r.snapshot()).coins,880);});
test('v5 duplicate groups refresh without losing wallet, board or owned themes',()=>{const k=new Kitchen(12),p={...k.snapshot(),version:5,coins:200,owned:[...oldFree,'wall-rose','prop-plant'],equipped:{...oldEquipped,wall:'wall-rose',counterProp:'prop-plant'},customers:[customer(0,[request(0),request(0,2)])]};p.board[0]={type:2,level:3};const r=Kitchen.restore(p);assert.equal(r.coins,290);assert.equal(r.equipped.wall,'wall-rose');assert.deepEqual(r.board,p.board);assert.ok(r.customers.every(c=>new Set(c.items.map(i=>i.type)).size===c.items.length));});
test('v4 maps old first-shop board chains and refunds retired props',()=>{const p={version:4,coins:380,shop:0,completed:7,board:[{type:0,level:2},{type:1,level:3},{type:2,level:1},...Array(6).fill(null)],owned:[...oldFree,'prop-plant'],equipped:{...oldEquipped,counterProp:'prop-plant'}};const r=Kitchen.restore(p);assert.equal(r.coins,470);assert.deepEqual(r.board.slice(0,3),[{type:1,level:2},{type:0,level:3},{type:2,level:1}]);assert.equal(r.snapshot().version,6);});
test('v3 board/accessory refunds apply once; v2 retains wallet; dessert board clears',()=>{const p={version:3,coins:200,shop:0,completed:6,board:Array(9).fill(null),owned:['wall-classic','counter-classic','board-classic','board-mint','prop-none','prop-plant'],equipped:{wall:'wall-classic',counter:'counter-classic',board:'board-mint',prop:'prop-plant'}};const r=Kitchen.restore(p);assert.equal(r.coins,440);assert.equal(Kitchen.restore(r.snapshot()).coins,440);assert.equal(Kitchen.restore({...p,version:2}).coins,200);const dessert=Kitchen.restore({...p,version:2,shop:1,board:Array(9).fill({type:0,level:4})});assert.ok(dessert.board.every(r=>r===null));assert.equal(dessert.owned.length,3);});

test('different levels swap and invalid or same-slot moves preserve the board',()=>{const k=new Kitchen(4);const low={type:0,level:1},high={type:0,level:3};k.board[0]=low;k.board[1]=high;assert.equal(k.move(0,1),true);assert.equal(k.board[0],high);assert.equal(k.board[1],low);const board=structuredClone(k.board);for(const [a,b] of [[0,0],[-1,1],[0,9],[2,0]])assert.equal(k.move(a,b),false);assert.deepEqual(k.board,board);assert.equal(k.move(1,2),true);assert.equal(k.board[1],null);assert.equal(k.board[2],low);});

test('new-player tutorial forces the three orders, resumes every step and unlocks after final payment',()=>{
 let k=Kitchen.newPlayer();
 assert.deepEqual(k.customers.map(c=>c.items.map(({type,level})=>({type,level}))),[[{type:0,level:1}],[{type:0,level:2}],[{type:0,level:2},{type:1,level:1}]]);
 const actions=[()=>k.addItem(0),()=>k.deliver(0,0).accepted,()=>k.addItem(0),()=>k.addItem(0),()=>k.move(0,1),()=>k.deliver(1,1).accepted,()=>k.addItem(0),()=>k.addItem(0),()=>k.move(0,1),()=>k.deliver(1,2).accepted,()=>k.addItem(1),()=>k.deliver(0,2).accepted];
 for(let step=0;step<actions.length;step++){
  assert.equal(k.tutorialStep,step);
  const before=structuredClone(k.snapshot());
  assert.equal(k.addItem(2),false);assert.equal(k.bin(0),false);assert.equal(k.move(0,8),false);assert.equal(k.deliver(0,99).accepted,false);assert.equal(k.purchaseDecoration('wall-rose'),false);
  assert.deepEqual(k.snapshot(),before);
  assert.equal(actions[step](),true);
  if(step===1){assert.equal(k.customers[0].paid,true);assert.equal(k.customers.length,3);assert.equal(k.coins,30);}
  if(step===9){assert.equal(k.customers[2].items[0].done,true);assert.equal(k.customers[2].items[1].done,false);assert.equal(k.customers[2].paid,false);assert.equal(k.coins,90);}
  const saved=structuredClone(k.snapshot());k=Kitchen.restore(saved);assert.deepEqual(k.snapshot(),saved);
 }
 assert.equal(k.tutorialStep,null);assert.equal(k.groupsCompleted,1);assert.equal(k.coins,180);assert.ok(k.board.every(item=>item===null));assert.equal(k.addItem(2),true);
});
test('existing v6 and legacy saves bypass tutorial, and new-player reset returns clean defaults',()=>{
 const existing=new Kitchen(42);existing.coins=1000;existing.purchaseDecoration('wall-rose');existing.addItem(2);
 const saved=structuredClone(existing.snapshot());delete saved.tutorialStep;
 assert.equal(Kitchen.restore(saved).tutorialStep,null);assert.equal(Kitchen.restore({...saved,version:5}).tutorialStep,null);
 const fresh=Kitchen.newPlayer();assert.equal(fresh.coins,0);assert.equal(fresh.groupsCompleted,0);assert.equal(fresh.tutorialStep,0);assert.equal(fresh.owned.length,3);assert.equal(fresh.equipped.wall,'wall-classic');assert.ok(fresh.board.every(item=>item===null));
});


test('per-category demand uses 70/30 and never requests levels older than the previous one',()=>{
 const k=new Kitchen(991);k.demand={highestServed:[4,3,2],pending:null,nextIntroductionAt:100000};
 const counts=Array.from({length:3},()=>[0,0]);
 for(let i=0;i<12000;i++){
  k.makeOrders();
  // Distinct orders condition probabilities in multi-customer groups; single orders show base weights.
  if(k.customers.length!==1)continue;
  for(const item of k.customers[0].items){const delta=k.demand.highestServed[item.type]-item.level;assert.ok(delta===0||delta===1);counts[item.type][delta]++;}
 }
 for(const [high,low] of counts){assert.ok(high+low>2000);assert.ok(Math.abs(high/(high+low)-.7)<.035);}
});
test('serving a higher category leaves existing orders unchanged and schedules only the next category',()=>{
 const k=new Kitchen(61);k.demand={highestServed:[2,1,1],pending:{type:1,level:2},nextIntroductionAt:null};
 k.customers=[customer(0,[request(1,2)]),customer(1,[request(0),request(2)])];
 const remaining=structuredClone(k.customers[1]);k.board[0]={type:1,level:2};assert.equal(k.deliver(0,0).accepted,true);
 assert.deepEqual(k.demand.highestServed,[2,2,1]);assert.deepEqual(k.customers[1],remaining);assert.equal(k.demand.pending,null);
 assert.ok([3,4].includes(k.demand.nextIntroductionAt-k.groupsCompleted));
});
test('tutorial burger L2 leads to fries L2 after 2–3 normal groups, with saved gap and RNG',()=>{
 let k=Kitchen.newPlayer();
 while(k.tutorialAction){const a=k.tutorialAction;if(a.kind==='generate')k.addItem(a.type);else if(a.kind==='merge')k.move(a.from,a.to);else k.deliver(a.from,a.customer);}
 assert.deepEqual(k.demand.highestServed,[2,1,1]);const due=k.demand.nextIntroductionAt;
 assert.ok([2,3].includes(due-k.groupsCompleted));
 let restored=Kitchen.restore(structuredClone(k.snapshot()));
 while(k.groupsCompleted<due){assert.equal(k.demand.pending,null);finishGroup(k);finishGroup(restored);assert.deepEqual(k.snapshot(),restored.snapshot());}
 assert.deepEqual(k.demand.pending,{type:1,level:2});
});
test('migration preserves legacy current orders and uses recorded tutorial deliveries',()=>{
 const k=Kitchen.newPlayer();for(let i=0;i<6;i++){const a=k.tutorialAction;if(a.kind==='generate')k.addItem(a.type);else if(a.kind==='merge')k.move(a.from,a.to);else k.deliver(a.from,a.customer);}
 const saved=structuredClone(k.snapshot());delete saved.demand;const restored=Kitchen.restore(saved);
 assert.equal(restored.tutorialStep,6);assert.deepEqual(restored.demand.highestServed,[2,1,1]);assert.deepEqual(restored.customers,saved.customers);assert.deepEqual(restored.board,saved.board);assert.equal(restored.coins,saved.coins);
 const normal=structuredClone(new Kitchen(7).snapshot());normal.groupsCompleted=9;delete normal.demand;
 const upgraded=Kitchen.restore(normal);assert.equal(upgraded.tutorialStep,null);assert.deepEqual(upgraded.customers,normal.customers);assert.deepEqual(upgraded.demand.highestServed,[2,1,1]);
});
test('invalid saved progression is rejected without leaking invalid demand into the game',()=>{
 const saved=structuredClone(new Kitchen(8).snapshot());saved.coins=999;
 for(const demand of [null,{highestServed:[4,1],pending:null,nextIntroductionAt:5},{highestServed:[1,1,1],pending:{type:2,level:2},nextIntroductionAt:null},{highestServed:[1,1,1],pending:null,nextIntroductionAt:null}])assert.equal(Kitchen.restore({...saved,demand}).coins,0);
});
