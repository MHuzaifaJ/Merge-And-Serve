export const RULES={baseCost:20,startingCoins:200,maxItemLevel:4,jarPayout:5,jarIntervals:[5,4,3,2],jarCapacities:[40,60,100,160],speedPrices:[100,200,400],capacityPrices:[120,240,480],shops:2,shopLevels:20};
export const COST=RULES.baseCost;
export type Item={type:number;level:number};
export type Request=Item&{done:boolean};
export type Customer={name:string;items:Request[];payment:number;paid:boolean};
export class Kitchen {
  coins=RULES.startingCoins;shop=0;level=1;completed=0;board:(Item|null)[]=Array(9).fill(null);customers:Customer[]=[];
  jarCoins=0;jarElapsed=0;speed=0;capacityTier=0;shopReady=false;finished=false;
  constructor(){this.makeOrders();}
  get unlocked(){return this.completed>=10?3:this.completed>=5?2:1;}
  get capacity(){return RULES.jarCapacities[this.capacityTier];}
  get interval(){return RULES.jarIntervals[this.speed];}
  get milestone(){return this.completed<5?{start:0,end:5,label:'Item 2'}:this.completed<10?{start:5,end:10,label:'Item 3'}:{start:10,end:20,label:this.shop===0?'Shop 2':'Shop mastered'};}
  get progress(){const m=this.milestone;return (this.completed-m.start)/(m.end-m.start);}
  validSlot(i:number){return Number.isInteger(i)&&i>=0&&i<9;}
  value(item:Item){return COST*2**(item.level-1);}
  refund(i:number){return this.validSlot(i)&&this.board[i]?this.value(this.board[i]!)/2:0;}
  buy(type=0){const slot=this.board.indexOf(null);if(this.shopReady||this.finished||!Number.isInteger(type)||type<0||type>=this.unlocked||slot<0||this.coins<COST)return false;this.board[slot]={type,level:1};this.coins-=COST;return true;}
  move(from:number,to:number){if(this.shopReady||this.finished||from===to||!this.validSlot(from)||!this.validSlot(to))return false;const a=this.board[from],b=this.board[to];if(!a)return false;if(!b){this.board[to]=a;this.board[from]=null;return true;}if(a.type===b.type&&a.level===b.level&&a.level<RULES.maxItemLevel){this.board[to]={type:a.type,level:a.level+1};this.board[from]=null;return true;}return false;}
  bin(i:number){const refund=this.refund(i);if(!refund)return 0;this.board[i]=null;this.coins+=refund;return refund;}
  makeOrders(){const count=this.level<3?1:this.level<10?2:3,names=['Ayesha','Bilal','Sara','Omar','Noor','Zain'];this.customers=Array.from({length:count},(_,c)=>{const qty=this.level<6?1:this.level<12?2:3;const items:Request[]=Array.from({length:qty},(_,i)=>({type:(this.level+c+i-1)%this.unlocked,level:Math.min(4,1+Math.floor((this.level-1)/7)+(c+i)%2),done:false}));return {name:names[(this.level+c+this.shop)%names.length],items,payment:Math.ceil(items.reduce((sum,item)=>sum+this.value(item),0)*1.5),paid:false};});}
  deliver(slot:number,customerIndex:number){const item=this.board[slot],c=this.customers[customerIndex];if(this.shopReady||this.finished||!this.validSlot(slot)||!item||!c||c.paid)return {accepted:false,payment:0,levelUp:false};const match=c.items.find(r=>!r.done&&r.type===item.type&&r.level===item.level);if(!match)return {accepted:false,payment:0,levelUp:false};match.done=true;this.board[slot]=null;let payment=0;if(c.items.every(r=>r.done)){c.paid=true;payment=c.payment;this.coins+=payment;}const levelUp=this.customers.every(customer=>customer.paid);if(levelUp){this.completed=this.level;if(this.level>=20){if(this.shop<RULES.shops-1)this.shopReady=true;else this.finished=true;}else{this.level++;this.makeOrders();}}return {accepted:true,payment,levelUp};}
  tick(dt:number){if(!Number.isFinite(dt)||dt<=0)return;if(this.jarCoins>=this.capacity){this.jarElapsed=0;return;}this.jarElapsed+=dt;const ticks=Math.floor(this.jarElapsed/this.interval);if(ticks){this.jarCoins=Math.min(this.capacity,this.jarCoins+ticks*RULES.jarPayout);this.jarElapsed%=this.interval;if(this.jarCoins===this.capacity)this.jarElapsed=0;}}
  collect(){const amount=this.jarCoins;this.coins+=amount;this.jarCoins=0;return amount;}
  upgradePrice(kind:'speed'|'capacity'){return kind==='speed'?RULES.speedPrices[this.speed]:RULES.capacityPrices[this.capacityTier];}
  upgrade(kind:'speed'|'capacity'){const price=this.upgradePrice(kind);if(price===undefined||this.coins<price)return false;this.coins-=price;if(kind==='speed')this.speed++;else this.capacityTier++;this.jarCoins=this.capacity;this.jarElapsed=0;return true;}
  openShop(){if(!this.shopReady)return false;this.shop++;this.completed=0;this.level=1;this.board.fill(null);this.jarCoins=0;this.jarElapsed=0;this.shopReady=false;this.makeOrders();return true;}
  snapshot(){return {version:2,coins:this.coins,shop:this.shop,level:this.level,completed:this.completed,board:this.board,customers:this.customers,jarCoins:this.jarCoins,jarElapsed:this.jarElapsed,speed:this.speed,capacityTier:this.capacityTier,shopReady:this.shopReady,finished:this.finished};}
  static restore(data:unknown){const fresh=new Kitchen();if(!data||typeof data!=='object')return fresh;const p=data as Record<string,any>;const integer=(n:unknown,min:number,max:number)=>Number.isInteger(n)&&Number(n)>=min&&Number(n)<=max;const item=(v:any)=>v&&integer(v.type,0,2)&&integer(v.level,1,4);if(p.version!==2||!integer(p.coins,0,1e9)||!integer(p.shop,0,1)||!integer(p.level,1,20)||!integer(p.completed,0,20)||!integer(p.speed,0,3)||!integer(p.capacityTier,0,3)||!Array.isArray(p.board)||p.board.length!==9||!p.board.every((v:any)=>v===null||item(v))||typeof p.shopReady!=='boolean'||typeof p.finished!=='boolean'||!Number.isFinite(p.jarElapsed)||p.jarElapsed<0||!integer(p.jarCoins,0,RULES.jarCapacities[p.capacityTier]))return fresh;
    const unlocked=p.completed>=10?3:p.completed>=5?2:1;if(p.board.some((v:any)=>v&&v.type>=unlocked)||p.completed!==(p.shopReady||p.finished?20:p.level-1)||p.shopReady&&p.shop!==0||p.finished&&p.shop!==1||p.shopReady&&p.finished)return fresh;
    fresh.shop=p.shop;fresh.level=p.level;fresh.completed=p.completed;fresh.makeOrders();if(!Array.isArray(p.customers)||p.customers.length!==fresh.customers.length||p.customers.some((c:any,index:number)=>{const expected=fresh.customers[index];return !c||c.name!==expected.name||c.payment!==expected.payment||typeof c.paid!=='boolean'||!Array.isArray(c.items)||c.items.length!==expected.items.length||c.items.some((r:any,i:number)=>!item(r)||typeof r.done!=='boolean'||r.type!==expected.items[i].type||r.level!==expected.items[i].level)||c.paid!==c.items.every((r:any)=>r.done);}))return new Kitchen();
    if(p.customers.every((c:any)=>c.paid)!==(p.shopReady||p.finished))return new Kitchen();Object.assign(fresh,p);return fresh;
  }
}
