export const RULES={startingCoins:0,maxItemLevel:4,orderUnitReward:30};
export type DecorationCategory='wall'|'counter'|'wallProp'|'counterProp';
export const DECORATIONS=[
 {id:'wall-classic',category:'wall',name:'Classic cream',price:0,color:0xf4eddb},
 {id:'wall-rose',category:'wall',name:'Rose walls',price:120,color:0xf2dce1},
 {id:'wall-sky',category:'wall',name:'Sky walls',price:180,color:0xdcebf2},
 {id:'counter-classic',category:'counter',name:'Honey wood',price:0,color:0xfffcf3},
 {id:'counter-peach',category:'counter',name:'Peach counter',price:180,color:0xffdcc4},
 {id:'wall-prop-none',category:'wallProp',name:'Empty wall slot',price:0,color:0},
 {id:'wall-prop-clock',category:'wallProp',name:'Wall clock',price:110,color:0},
 {id:'wall-prop-picture',category:'wallProp',name:'Botanical print',price:160,color:0},
 {id:'prop-none',category:'counterProp',name:'No accessory',price:0,color:0},
 {id:'prop-plant',category:'counterProp',name:'Little plant',price:90,color:0},
 {id:'prop-flowers',category:'counterProp',name:'Fresh flowers',price:140,color:0}
] as const;
export type Item={type:number;level:number};
export type Request=Item&{done:boolean};
export type Customer={portrait:number;items:Request[];payment:number;paid:boolean};
const integer=(n:unknown,min:number,max:number)=>Number.isInteger(n)&&Number(n)>=min&&Number(n)<=max;
const validItem=(v:any)=>!!v&&integer(v.type,0,2)&&integer(v.level,1,4);
const paymentFor=(items:Item[])=>items.reduce((sum,item)=>sum+RULES.orderUnitReward*2**(item.level-1),0);

export class Kitchen {
 coins=RULES.startingCoins;groupsCompleted=0;rngState:number;
 board:(Item|null)[]=Array(9).fill(null);customers:Customer[]=[];
 owned:string[]=DECORATIONS.filter(d=>d.price===0).map(d=>d.id);
 equipped:Record<DecorationCategory,string>={wall:'wall-classic',counter:'counter-classic',wallProp:'wall-prop-none',counterProp:'prop-none'};
 constructor(seed=Math.floor(Math.random()*0x100000000)){this.rngState=(seed>>>0)||0x6d2b79f5;this.makeOrders();}
 private random(){let x=this.rngState;x^=x<<13;x^=x>>>17;x^=x<<5;this.rngState=x>>>0;return this.rngState/0x100000000;}
 private pick(max:number){return Math.floor(this.random()*max);}
 get orderStageCap(){return this.groupsCompleted<3?1:this.groupsCompleted<8?2:this.groupsCompleted<16?3:4;}
 validSlot(i:number){return Number.isInteger(i)&&i>=0&&i<9;}
 addItem(type=0){const slot=this.board.indexOf(null);if(!integer(type,0,2)||slot<0)return false;this.board[slot]={type,level:1};return true;}
 move(from:number,to:number){if(from===to||!this.validSlot(from)||!this.validSlot(to))return false;const a=this.board[from],b=this.board[to];if(!a)return false;if(!b){this.board[to]=a;this.board[from]=null;return true;}if(a.type===b.type&&a.level===b.level&&a.level<RULES.maxItemLevel){this.board[to]={type:a.type,level:a.level+1};this.board[from]=null;return true;}return false;}
 bin(i:number){if(!this.validSlot(i)||!this.board[i])return false;this.board[i]=null;return true;}
 purchaseDecoration(id:string){const d=DECORATIONS.find(d=>d.id===id);if(!d||this.owned.includes(id)||this.coins<d.price)return false;this.coins-=d.price;this.owned.push(id);this.equipped[d.category]=id;return true;}
 equipDecoration(id:string){const d=DECORATIONS.find(d=>d.id===id);if(!d||!this.owned.includes(id))return false;this.equipped[d.category]=id;return true;}
 decoration(category:DecorationCategory){return DECORATIONS.find(d=>d.id===this.equipped[category])!;}
 makeOrders(){
  const weights=[50,30,15,5].slice(0,this.orderStageCap),sum=weights.reduce((a,b)=>a+b,0),portraits=[0,1,2,3,4,5];
  const stage=()=>{let roll=this.random()*sum;for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0)return i+1;}return weights.length;};
  this.customers=Array.from({length:1+this.pick(3)},()=>{const portrait=portraits.splice(this.pick(portraits.length),1)[0];const items:Request[]=Array.from({length:1+this.pick(3)},()=>({type:this.pick(3),level:stage(),done:false}));return {portrait,items,payment:paymentFor(items),paid:false};});
 }
 deliver(slot:number,customerIndex:number){
  const item=this.board[slot],c=this.customers[customerIndex];if(!this.validSlot(slot)||!item||!c||c.paid)return {accepted:false,payment:0,groupComplete:false};
  const match=c.items.find(r=>!r.done&&r.type===item.type&&r.level===item.level);if(!match)return {accepted:false,payment:0,groupComplete:false};
  match.done=true;this.board[slot]=null;let payment=0;if(c.items.every(r=>r.done)){c.paid=true;payment=c.payment;this.coins+=payment;}
  const groupComplete=this.customers.every(customer=>customer.paid);if(groupComplete){this.groupsCompleted++;this.makeOrders();}
  return {accepted:true,payment,groupComplete};
 }
 snapshot(){return {version:5,coins:this.coins,groupsCompleted:this.groupsCompleted,rngState:this.rngState,board:this.board,customers:this.customers,owned:this.owned,equipped:this.equipped};}
 static restore(data:unknown){
  const fresh=new Kitchen();if(!data||typeof data!=='object')return fresh;const p=data as Record<string,any>;
  if(!integer(p.coins,0,1e9))return fresh;
  if([2,3,4].includes(p.version))return Kitchen.migrate(p,fresh);
  if(p.version!==5||!integer(p.groupsCompleted,0,1e9)||!integer(p.rngState,1,0xffffffff)||!Array.isArray(p.board)||p.board.length!==9||!p.board.every((v:any)=>v===null||validItem(v)))return fresh;
  if(!Array.isArray(p.customers)||!integer(p.customers.length,1,3)||p.customers.some((c:any)=>!c||!integer(c.portrait,0,5)||typeof c.paid!=='boolean'||!Array.isArray(c.items)||!integer(c.items.length,1,3)||c.items.some((r:any)=>!validItem(r)||typeof r.done!=='boolean')||c.payment!==paymentFor(c.items)||c.paid!==c.items.every((r:any)=>r.done))||p.customers.every((c:any)=>c.paid)||new Set(p.customers.map((c:any)=>c.portrait)).size!==p.customers.length)return fresh;
  if(!Kitchen.restoreDecor(p,fresh))return new Kitchen();
  fresh.coins=p.coins;fresh.groupsCompleted=p.groupsCompleted;fresh.rngState=p.rngState;fresh.board=structuredClone(p.board);fresh.customers=structuredClone(p.customers);return fresh;
 }
 private static restoreDecor(p:Record<string,any>,target:Kitchen){
  if(!Array.isArray(p.owned)||p.owned.some((id:any)=>!DECORATIONS.some(d=>d.id===id))||new Set(p.owned).size!==p.owned.length||!p.equipped)return false;
  if((['wall','counter','wallProp','counterProp'] as const).some(cat=>!p.owned.includes(p.equipped[cat])||!DECORATIONS.some(d=>d.id===p.equipped[cat]&&d.category===cat)))return false;
  target.owned=[...new Set([...target.owned,...p.owned])];target.equipped={wall:p.equipped.wall,counter:p.equipped.counter,wallProp:p.equipped.wallProp,counterProp:p.equipped.counterProp};return true;
 }
 private static migrate(p:Record<string,any>,target:Kitchen){
  if(!integer(p.shop,0,1)||!integer(p.completed,0,20)||!Array.isArray(p.board)||p.board.length!==9||!p.board.every((v:any)=>v===null||validItem(v)))return target;
  if(p.version>=3){const legacy=p.version===3,owned=p.owned;if(!Array.isArray(owned))return target;
   const allowed=owned.every((id:any)=>DECORATIONS.some(d=>d.id===id)||legacy&&['board-classic','board-mint'].includes(id));if(!allowed||!p.equipped)return target;
   const decor={owned:[...new Set([...target.owned,...owned.filter((id:string)=>!id.startsWith('board-'))])],equipped:legacy?{wall:p.equipped.wall,counter:p.equipped.counter,wallProp:'wall-prop-none',counterProp:p.equipped.prop}:p.equipped};
   if(!Kitchen.restoreDecor(decor,target))return new Kitchen();
  }
  target.coins=p.coins+(p.version===3&&p.owned.includes('board-mint')?150:0);target.groupsCompleted=p.completed+p.shop*20;
  // Old shop 1 used Fries / Burger / Drink. Shop 2 desserts have no fast-food equivalent.
  target.board=p.shop===0?p.board.map((v:any)=>v?{type:[1,0,2][v.type],level:v.level}:null):Array(9).fill(null);
  target.makeOrders();return target;
 }
}

