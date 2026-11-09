export type Point={x:number;y:number};
export type Rect=Point&{w:number;h:number};
export type ServeTarget={dialog:Rect;body?:Rect;cx:number};
export const BOARD:Rect={x:90,y:418,w:300,h:300};
export const BIN:Rect={x:408,y:418,w:58,h:300};
export const ORDER_ICON_SIZE=40;
export const contains=(p:Point,r:Rect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
export const boardCell=(i:number):Rect=>({x:122+i%3*83,y:453+Math.floor(i/3)*80,w:70,h:70});
export const spawnerRect=(type:number):Rect=>({x:17+type*154,y:774,w:138,h:78});
export const buttonIconSize=(r:Rect)=>Math.min(60,r.w-20,r.h-20);
export const orderIconCenters=(cx:number,count:number)=>Array.from({length:count},(_,i)=>({x:cx+(i-(count-1)/2)*ORDER_ICON_SIZE,y:195,size:ORDER_ICON_SIZE}));
export function customerDialog(count:number,index:number):Rect{const width=count===3?140:150,gap=count===3?12:30,total=width*count+gap*(count-1);return {x:(480-total)/2+index*(width+gap),y:153,w:width,h:100};}
export function servingCustomer(p:Point,targets:ServeTarget[]){let result=-1,distance=Infinity;targets.forEach((t,i)=>{if(contains(p,t.dialog)||t.body&&contains(p,t.body)){const d=Math.abs(p.x-t.cx);if(d<distance){result=i;distance=d;}}});return result;}
