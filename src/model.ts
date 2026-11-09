export const RULES={startingCoins:0,maxItemLevel:4,orderUnitReward:30,shops:2,shopLevels:20};
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
export type Customer={name:string;items:Request[];payment:number;paid:boolean};
export class Kitchen {
 coins=RULES.startingCoins;shop=0;level=1;completed=0;board:(Item|null)[]=Array(9).fill(null);customers:Customer[]=[];shopReady=false;finished=false;
 owned:string[]=DECORATIONS.filter(d=>d.price===0).map(d=>d.id);
 equipped:Record<DecorationCategory,string>={wall:'wall-classic',counter:'counter-classic',wallProp:'wall-prop-none',counterProp:'prop-none'};
 constructor(){this.makeOrders();}
 get unlocked(){return this.completed>=10?3:this.completed>=5?2:1;}
 get milestone(){return this.completed<5?{start:0,end:5,label:'Item 2'}:this.completed<10?{start:5,end:10,label:'Item 3'}:{start:10,end:20,label:this.shop===0?'Shop 2':'Shop mastered'};}
 get progress(){const m=this.milestone;return (this.completed-m.start)/(m.end-m.start);}
 validSlot(i:number){return Number.isInteger(i)&&i>=0&&i<9;}
 addItem(type=0){const slot=this.board.indexOf(null);if(this.shopReady||this.finished||!Number.isInteger(type)||type<0||type>=this.unlocked||slot<0)return false;this.board[slot]={type,level:1};return true;}
 move(from:number,to:number){if(this.shopReady||this.finished||from===to||!this.validSlot(from)||!this.validSlot(to))return false;const a=this.board[from],b=this.board[to];if(!a)return false;if(!b){this.board[to]=a;this.board[from]=null;return true;}if(a.type===b.type&&a.level===b.level&&a.level<RULES.maxItemLevel){this.board[to]={type:a.type,level:a.level+1};this.board[from]=null;return true;}return false;}
 bin(i:number){if(!this.validSlot(i)||!this.board[i])return false;this.board[i]=null;return true;}
 purchaseDecoration(id:string){const d=DECORATIONS.find(d=>d.id===id);if(!d||this.owned.includes(id)||this.coins<d.price)return false;this.coins-=d.price;this.owned.push(id);this.equipped[d.category]=id;return true;}
 equipDecoration(id:string){const d=DECORATIONS.find(d=>d.id===id);if(!d||!this.owned.includes(id))return false;this.equipped[d.category]=id;return true;}
 decoration(category:DecorationCategory){return DECORATIONS.find(d=>d.id===this.equipped[category])!;}
 makeOrders(){const count=this.level<3?1:this.level<10?2:3,names=['Ayesha','Bilal','Sara','Omar','Noor','Zain'];this.customers=Array.from({length:count},(_,c)=>{const qty=this.level<6?1:this.level<12?2:3;const items:Request[]=Array.from({length:qty},(_,i)=>({type:(this.level+c+i-1)%this.unlocked,level:Math.min(4,1+Math.floor((this.level-1)/7)+(c+i)%2),done:false}));return {name:names[(this.level+c+this.shop)%names.length],items,payment:items.reduce((sum,item)=>sum+RULES.orderUnitReward*2**(item.level-1),0),paid:false};});}
 deliver(slot:number,customerIndex:number){const item=this.board[slot],c=this.customers[customerIndex];if(this.shopReady||this.finished||!this.validSlot(slot)||!item||!c||c.paid)return {accepted:false,payment:0,levelUp:false};const match=c.items.find(r=>!r.done&&r.type===item.type&&r.level===item.level);if(!match)return {accepted:false,payment:0,levelUp:false};match.done=true;this.board[slot]=null;let payment=0;if(c.items.every(r=>r.done)){c.paid=true;payment=c.payment;this.coins+=payment;}const levelUp=this.customers.every(customer=>customer.paid);if(levelUp){this.completed=this.level;if(this.level>=20){if(this.shop<RULES.shops-1)this.shopReady=true;else this.finished=true;}else{this.level++;this.makeOrders();}}return {accepted:true,payment,levelUp};}
 openShop(){if(!this.shopReady)return false;this.shop++;this.completed=0;this.level=1;this.board.fill(null);this.shopReady=false;this.makeOrders();return true;}
 snapshot(){return {version:4,coins:this.coins,shop:this.shop,level:this.level,completed:this.completed,board:this.board,customers:this.customers,owned:this.owned,equipped:this.equipped,shopReady:this.shopReady,finished:this.finished};}
 static restore(data:unknown){const fresh=new Kitchen();if(!data||typeof data!=='object')return fresh;const p=data as Record<string,any>;const integer=(n:unknown,min:number,max:number)=>Number.isInteger(n)&&Number(n)>=min&&Number(n)<=max;const item=(v:any)=>v&&integer(v.type,0,2)&&integer(v.level,1,4);if(![2,3,4].includes(p.version)||!integer(p.coins,0,1e9)||!integer(p.shop,0,1)||!integer(p.level,1,20)||!integer(p.completed,0,20)||!Array.isArray(p.board)||p.board.length!==9||!p.board.every((v:any)=>v===null||item(v))||typeof p.shopReady!=='boolean'||typeof p.finished!=='boolean')return fresh;
 const unlocked=p.completed>=10?3:p.completed>=5?2:1;if(p.board.some((v:any)=>v&&v.type>=unlocked)||p.completed!==(p.shopReady||p.finished?20:p.level-1)||p.shopReady&&p.shop!==0||p.finished&&p.shop!==1||p.shopReady&&p.finished)return fresh;
 fresh.shop=p.shop;fresh.level=p.level;fresh.completed=p.completed;fresh.makeOrders();if(!Array.isArray(p.customers)||p.customers.length!==fresh.customers.length||p.customers.some((c:any,index:number)=>{const expected=fresh.customers[index];return !c||c.name!==expected.name||c.payment!==expected.payment||typeof c.paid!=='boolean'||!Array.isArray(c.items)||c.items.length!==expected.items.length||c.items.some((r:any,i:number)=>!item(r)||typeof r.done!=='boolean'||r.type!==expected.items[i].type||r.level!==expected.items[i].level)||c.paid!==c.items.every((r:any)=>r.done);}))return new Kitchen();
 if(p.customers.every((c:any)=>c.paid)!==(p.shopReady||p.finished))return new Kitchen();
 if(p.version>=3){
  const legacy=p.version===3;
  if(!Array.isArray(p.owned)||p.owned.some((id:any)=>!DECORATIONS.some(d=>d.id===id)&&!(legacy&&['board-classic','board-mint'].includes(id)))||new Set(p.owned).size!==p.owned.length||!p.equipped)return new Kitchen();
  const equipped=legacy?{wall:p.equipped.wall,counter:p.equipped.counter,wallProp:'wall-prop-none',counterProp:p.equipped.prop}:p.equipped;
  if((['wall','counter','wallProp','counterProp'] as const).some(cat=>!(legacy&&cat==='wallProp')&&!p.owned.includes(equipped[cat])||!DECORATIONS.some(d=>d.id===equipped[cat]&&d.category===cat)))return new Kitchen();
  fresh.owned=[...new Set([...fresh.owned,...p.owned.filter((id:string)=>!id.startsWith('board-'))])];fresh.equipped={...equipped};
 }
 fresh.coins=p.coins+(p.version===3&&p.owned.includes('board-mint')?150:0);fresh.board=p.board;fresh.customers=p.customers;fresh.shopReady=p.shopReady;fresh.finished=p.finished;return fresh;
 }
}
