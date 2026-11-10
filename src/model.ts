export const RULES={startingCoins:0,maxItemLevel:4,orderUnitReward:30};
export type DecorationCategory='wall'|'counter'|'nameplate';
export const DECORATIONS=[
 {id:'wall-classic',category:'wall',name:'Classic cream',price:0,asset:0},
 {id:'wall-rose',category:'wall',name:'Rose garden',price:120,asset:1},
 {id:'wall-sky',category:'wall',name:'Sky diamonds',price:180,asset:2},
 {id:'wall-mint',category:'wall',name:'Mint scallops',price:240,asset:3},
 {id:'counter-classic',category:'counter',name:'Honey oak',price:0,asset:0},
 {id:'counter-peach',category:'counter',name:'Coral oak',price:180,asset:1},
 {id:'counter-ivory',category:'counter',name:'Ivory wood',price:240,asset:2},
 {id:'counter-walnut',category:'counter',name:'Dark walnut',price:300,asset:3},
 {id:'nameplate-classic',category:'nameplate',name:'Carved honey',price:0,asset:0},
 {id:'nameplate-cream',category:'nameplate',name:'Cream enamel',price:100,asset:1},
 {id:'nameplate-coral',category:'nameplate',name:'Coral diner',price:160,asset:2},
 {id:'nameplate-teal',category:'nameplate',name:'Teal and gold',price:220,asset:3}
] as const;
const RETIRED:Record<string,{category:string;price:number}>={
 'wall-prop-none':{category:'wallProp',price:0},'wall-prop-clock':{category:'wallProp',price:110},'wall-prop-picture':{category:'wallProp',price:160},
 'prop-none':{category:'counterProp',price:0},'prop-plant':{category:'counterProp',price:90},'prop-flowers':{category:'counterProp',price:140}
};
export type Item={type:number;level:number};
export type Request=Item&{done:boolean};
export type Customer={portrait:number;items:Request[];payment:number;paid:boolean};
const integer=(n:unknown,min:number,max:number)=>Number.isInteger(n)&&Number(n)>=min&&Number(n)<=max;
const validItem=(v:any)=>!!v&&integer(v.type,0,2)&&integer(v.level,1,4);
const paymentFor=(items:Item[])=>items.reduce((sum,item)=>sum+RULES.orderUnitReward*2**(item.level-1),0);

type TutorialAction={kind:'generate';type:number}|{kind:'merge';from:number;to:number}|{kind:'serve';from:number;customer:number};
export const TUTORIAL_ACTIONS:readonly TutorialAction[]=[
 {kind:'generate',type:0},{kind:'serve',from:0,customer:0},
 {kind:'generate',type:0},{kind:'generate',type:0},{kind:'merge',from:0,to:1},{kind:'serve',from:1,customer:1},
 {kind:'generate',type:0},{kind:'generate',type:0},{kind:'merge',from:0,to:1},{kind:'serve',from:1,customer:2},
 {kind:'generate',type:1},{kind:'serve',from:0,customer:2}
];

export class Kitchen {
 tutorialStep:number|null=null;
 get tutorialAction(){return this.tutorialStep===null?undefined:TUTORIAL_ACTIONS[this.tutorialStep];}
 private advanceTutorial(){if(this.tutorialStep!==null)this.tutorialStep=this.tutorialStep+1<TUTORIAL_ACTIONS.length?this.tutorialStep+1:null;}
 static newPlayer(){const k=new Kitchen();k.tutorialStep=0;k.customers=[[{type:0,level:1}],[{type:0,level:2}],[{type:0,level:2},{type:1,level:1}]].map((items,portrait)=>({portrait,items:items.map(item=>({...item,done:false})),payment:paymentFor(items),paid:false}));return k;}
 coins=RULES.startingCoins;groupsCompleted=0;rngState:number;
 board:(Item|null)[]=Array(9).fill(null);customers:Customer[]=[];
 owned:string[]=DECORATIONS.filter(d=>d.price===0).map(d=>d.id);
 equipped:Record<DecorationCategory,string>={wall:'wall-classic',counter:'counter-classic',nameplate:'nameplate-classic'};
 constructor(seed=Math.floor(Math.random()*0x100000000)){this.rngState=(seed>>>0)||0x6d2b79f5;this.makeOrders();}
 private random(){let x=this.rngState;x^=x<<13;x^=x>>>17;x^=x<<5;this.rngState=x>>>0;return this.rngState/0x100000000;}
 private pick(max:number){return Math.floor(this.random()*max);}
 get orderStageCap(){return this.groupsCompleted<3?1:this.groupsCompleted<8?2:this.groupsCompleted<16?3:4;}
 validSlot(i:number){return Number.isInteger(i)&&i>=0&&i<9;}
 addItem(type=0){const action=this.tutorialAction;if(action&&(action.kind!=='generate'||action.type!==type))return false;const slot=this.board.indexOf(null);if(!integer(type,0,2)||slot<0)return false;this.board[slot]={type,level:1};this.advanceTutorial();return true;}
 move(from:number,to:number){const action=this.tutorialAction;if(action&&(action.kind!=='merge'||action.from!==from||action.to!==to))return false;if(from===to||!this.validSlot(from)||!this.validSlot(to))return false;const a=this.board[from],b=this.board[to];if(!a)return false;if(!b){this.board[to]=a;this.board[from]=null;return true;}if(a.type===b.type&&a.level===b.level&&a.level<RULES.maxItemLevel){this.board[to]={type:a.type,level:a.level+1};this.board[from]=null;this.advanceTutorial();return true;}this.board[to]=a;this.board[from]=b;return true;}
 bin(i:number){if(this.tutorialAction)return false;if(!this.validSlot(i)||!this.board[i])return false;this.board[i]=null;return true;}
 purchaseDecoration(id:string){if(this.tutorialAction)return false;const d=DECORATIONS.find(d=>d.id===id);if(!d||this.owned.includes(id)||this.coins<d.price)return false;this.coins-=d.price;this.owned.push(id);this.equipped[d.category]=id;return true;}
 equipDecoration(id:string){if(this.tutorialAction)return false;const d=DECORATIONS.find(d=>d.id===id);if(!d||!this.owned.includes(id))return false;this.equipped[d.category]=id;return true;}
 decoration(category:DecorationCategory){return DECORATIONS.find(d=>d.id===this.equipped[category])!;}
 makeOrders(){
  const weights=[50,30,15,5].slice(0,this.orderStageCap),sum=weights.reduce((a,b)=>a+b,0),portraits=[0,1,2,3,4,5];
  const stage=()=>{let roll=this.random()*sum;for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return i+1;}return weights.length;};
  this.customers=Array.from({length:1+this.pick(3)},()=>{const portrait=portraits.splice(this.pick(portraits.length),1)[0];const types=[0,1,2],items:Request[]=Array.from({length:1+this.pick(3)},()=>({type:types.splice(this.pick(types.length),1)[0],level:stage(),done:false}));return {portrait,items,payment:paymentFor(items),paid:false};});
 }
 deliver(slot:number,customerIndex:number){
  const action=this.tutorialAction;if(action&&(action.kind!=='serve'||action.from!==slot||action.customer!==customerIndex))return {accepted:false,payment:0,groupComplete:false};
  const item=this.board[slot],c=this.customers[customerIndex];if(!this.validSlot(slot)||!item||!c||c.paid)return {accepted:false,payment:0,groupComplete:false};
  const match=c.items.find(r=>!r.done&&r.type===item.type&&r.level===item.level);if(!match)return {accepted:false,payment:0,groupComplete:false};
  match.done=true;this.board[slot]=null;let payment=0;if(c.items.every(r=>r.done)){c.paid=true;payment=c.payment;this.coins+=payment;}
  const groupComplete=this.customers.every(customer=>customer.paid);if(groupComplete){this.groupsCompleted++;this.makeOrders();}
  this.advanceTutorial();return {accepted:true,payment,groupComplete};
 }
 snapshot(){return {version:6,tutorialStep:this.tutorialStep,coins:this.coins,groupsCompleted:this.groupsCompleted,rngState:this.rngState,board:this.board,customers:this.customers,owned:this.owned,equipped:this.equipped};}
 static restore(data:unknown){
  const fresh=new Kitchen();if(!data||typeof data!=='object')return fresh;const p=data as Record<string,any>;
  if(!integer(p.coins,0,1e9))return fresh;
  if([2,3,4].includes(p.version))return Kitchen.migrate(p,fresh);
  if(![5,6].includes(p.version)||!integer(p.groupsCompleted,0,1e9)||!integer(p.rngState,1,0xffffffff)||!Array.isArray(p.board)||p.board.length!==9||!p.board.every((v:any)=>v===null||validItem(v)))return fresh;
  if(!Array.isArray(p.customers)||!integer(p.customers.length,1,3)||p.customers.some((c:any)=>!c||!integer(c.portrait,0,5)||typeof c.paid!=='boolean'||!Array.isArray(c.items)||!integer(c.items.length,1,3)||c.items.some((r:any)=>!validItem(r)||typeof r.done!=='boolean')||c.payment!==paymentFor(c.items)||c.paid!==c.items.every((r:any)=>r.done))||p.customers.every((c:any)=>c.paid)||new Set(p.customers.map((c:any)=>c.portrait)).size!==p.customers.length)return fresh;
  const duplicates=p.customers.some((c:any)=>new Set(c.items.map((r:any)=>r.type)).size!==c.items.length);
  if(p.version===6&&duplicates)return fresh;
  fresh.coins=p.coins;
  if(!(p.version===6?Kitchen.restoreDecor(p,fresh):Kitchen.migrateDecor(p,fresh)))return new Kitchen();
  fresh.groupsCompleted=p.groupsCompleted;fresh.rngState=p.rngState;fresh.board=structuredClone(p.board);fresh.customers=structuredClone(p.customers);
  if(duplicates)fresh.makeOrders();
  if(p.version===6&&integer(p.tutorialStep,0,TUTORIAL_ACTIONS.length-1))fresh.tutorialStep=p.tutorialStep;
  return fresh;
 }
 private static restoreDecor(p:Record<string,any>,target:Kitchen){
  if(!Array.isArray(p.owned)||p.owned.some((id:any)=>!DECORATIONS.some(d=>d.id===id))||new Set(p.owned).size!==p.owned.length||!p.equipped)return false;
  if((['wall','counter','nameplate'] as const).some(cat=>!p.owned.includes(p.equipped[cat])||!DECORATIONS.some(d=>d.id===p.equipped[cat]&&d.category===cat)))return false;
  target.owned=[...new Set([...target.owned,...p.owned])];target.equipped={wall:p.equipped.wall,counter:p.equipped.counter,nameplate:p.equipped.nameplate};return true;
 }
 private static migrateDecor(p:Record<string,any>,target:Kitchen){
  if(p.version===2)return true;
  if(!Array.isArray(p.owned)||new Set(p.owned).size!==p.owned.length||!p.equipped||p.owned.some((id:any)=>!DECORATIONS.some(d=>d.id===id)&&!RETIRED[id]&&!(p.version===3&&['board-classic','board-mint'].includes(id))))return false;
  for(const category of ['wall','counter'] as const)if(!p.owned.includes(p.equipped[category])||!DECORATIONS.some(d=>d.id===p.equipped[category]&&d.category===category))return false;
  for(const [category,id] of Object.entries({wallProp:p.equipped.wallProp,counterProp:p.equipped.counterProp??p.equipped.prop}))if(id!==undefined&&(!p.owned.includes(id)||RETIRED[String(id)]?.category!==category))return false;
  target.owned=[...new Set([...target.owned,...p.owned.filter((id:string)=>DECORATIONS.some(d=>d.id===id))])];
  target.equipped={wall:p.equipped.wall,counter:p.equipped.counter,nameplate:'nameplate-classic'};
  target.coins+=p.owned.reduce((sum:number,id:string)=>sum+(RETIRED[id]?.price??0),0)+(p.version===3&&p.owned.includes('board-mint')?150:0);return true;
 }
 private static migrate(p:Record<string,any>,target:Kitchen){
  if(!integer(p.shop,0,1)||!integer(p.completed,0,20)||!Array.isArray(p.board)||p.board.length!==9||!p.board.every((v:any)=>v===null||validItem(v)))return target;
  target.coins=p.coins;if(!Kitchen.migrateDecor(p,target))return new Kitchen();
  target.groupsCompleted=p.completed+p.shop*20;
  target.board=p.shop===0?p.board.map((v:any)=>v?{type:[1,0,2][v.type],level:v.level}:null):Array(9).fill(null);
  target.makeOrders();return target;
 }
}
