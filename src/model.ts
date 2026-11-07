export const COST = 2;
export type Order = { station: number; level: number; time: number };
export class Kitchen {
  coins = 80; day = 1; served = 0; missed = 0; active = 0; unlocked = 1; capacity = 4;
  boards: number[][] = Array.from({length:3},()=>Array(9).fill(0));
  order: Order = {station:0,level:2,time:38};
  remaining = 38; ended = false; completed = 0; target = 6; tray: number[] = [];
  get reserve() { return 32 + this.unlocked * 8; }
  get spendable() { return Math.max(0,this.coins-this.reserve); }
  buy() {
    const slot=this.boards[this.active].findIndex((v,i)=>!v&&i<this.capacity);
    if(this.ended||slot<0||this.coins<COST)return false;
    this.boards[this.active][slot]=1;this.coins-=COST;return true;
  }
  move(from:number,to:number) {
    if(this.ended||from===to||to>=this.capacity||from>=this.capacity)return false;
    const b=this.boards[this.active]; if(!b[from])return false;
    if(!b[to]){b[to]=b[from];b[from]=0;return true;}
    if(b[to]===b[from]&&b[to]<4){b[to]++;b[from]=0;return true;}return false;
  }
  bin(slot:number){if(this.ended||!this.boards[this.active][slot])return false;this.boards[this.active][slot]=0;return true;}
  serve(slot:number){
    if(this.ended||this.active!==this.order.station||this.boards[this.active][slot]!==this.order.level)return 0;
    const pay=2**(this.order.level-1)*COST+8+Math.ceil(this.remaining/5);
    this.boards[this.active][slot]=0;this.coins+=pay;this.served++;this.next();return pay;
  }
  next(){this.completed++;if(this.completed>=this.target){this.ended=true;return;}
    const level=2+(this.completed%3===2?1:0);
    this.order={station:this.completed%this.unlocked,level,time:Math.max(24,42-this.day*2+(level===3?8:0))};this.remaining=this.order.time;
  }
  tick(dt:number){if(this.ended)return;this.remaining-=dt;if(this.remaining<=0){this.remaining=0;this.missed++;this.next();}}
  upgrade(kind:'station'|'slots'){
    const price=kind==='station'?60:40;
    const requiredReserve=this.reserve+(kind==='station'?8:0);
    if(!this.ended||this.coins-price<requiredReserve||(kind==='station'?this.unlocked>=3:this.capacity>=9))return false;
    this.coins-=price;if(kind==='station')this.unlocked++;else this.capacity=this.capacity===4?6:9;return true;
  }
  startDay(){if(!this.ended)return;this.day++;this.completed=0;this.served=0;this.missed=0;this.ended=false;this.order={station:0,level:2,time:40};this.remaining=40;this.active=0;}
}
