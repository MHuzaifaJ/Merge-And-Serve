export const COST = 2;
export type Item = { type: number; level: number };
export type Order = { type: number; level: number; time: number };
export class Kitchen {
  coins=80; day=1; served=0; missed=0; unlocked=1; capacity=4;
  board: (Item|null)[]=Array(9).fill(null);
  order:Order={type:0,level:2,time:38}; remaining=38; ended=false; completed=0; target=6;
  get reserve(){return 32+this.unlocked*8;}
  get spendable(){return Math.max(0,this.coins-this.reserve);}
  validSlot(i:number){return Number.isInteger(i)&&i>=0&&i<this.capacity;}
  buy(type=0){const slot=this.board.findIndex((v,i)=>!v&&i<this.capacity);if(this.ended||!Number.isInteger(type)||type<0||type>=this.unlocked||slot<0||this.coins<COST)return false;this.board[slot]={type,level:1};this.coins-=COST;return true;}
  move(from:number,to:number){if(this.ended||from===to||!this.validSlot(from)||!this.validSlot(to))return false;const item=this.board[from],target=this.board[to];if(!item)return false;if(!target){this.board[to]=item;this.board[from]=null;return true;}if(item.type===target.type&&item.level===target.level&&item.level<4){this.board[to]={type:item.type,level:item.level+1};this.board[from]=null;return true;}return false;}
  bin(slot:number){if(this.ended||!this.validSlot(slot)||!this.board[slot])return false;this.board[slot]=null;return true;}
  serve(slot:number){const item=this.board[slot];if(this.ended||!this.validSlot(slot)||!item||item.type!==this.order.type||item.level!==this.order.level)return 0;const pay=2**(this.order.level-1)*COST+8+Math.ceil(this.remaining/5);this.board[slot]=null;this.coins+=pay;this.served++;this.next();return pay;}
  next(){this.completed++;if(this.completed>=this.target){this.ended=true;return;}const level=2+(this.completed%3===2?1:0);this.order={type:this.completed%this.unlocked,level,time:Math.max(24,42-this.day*2+(level===3?8:0))};this.remaining=this.order.time;}
  tick(dt:number){if(this.ended)return;this.remaining-=dt;if(this.remaining<=0){this.remaining=0;this.missed++;this.next();}}
  upgrade(kind:'item'|'slots'){const price=kind==='item'?60:40,requiredReserve=this.reserve+(kind==='item'?8:0);if(!this.ended||this.coins-price<requiredReserve||(kind==='item'?this.unlocked>=3:this.capacity>=9))return false;this.coins-=price;if(kind==='item')this.unlocked++;else this.capacity=this.capacity===4?6:9;return true;}
  startDay(){if(!this.ended)return;this.day++;this.completed=0;this.served=0;this.missed=0;this.ended=false;this.order={type:0,level:2,time:40};this.remaining=40;}
}
