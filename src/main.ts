import Phaser from 'phaser';
import { Kitchen } from './model';
import './style.css';

const green=0x245e4e, cream=0xf4eddb, ink='#183e37', muted='#718177', red=0xc45b43;
const foods=[['Potato','Fries','Loaded fries','Party fries'],['Bun','Burger','Cheeseburger','Mega burger'],['Cup','Soda','Float','Party pitcher']];
const icons=[['🥔','🍟','🍟','🍟'],['🥯','🍔','🍔','🍔'],['🥤','🥤','🍹','🍹']];
type Rect={x:number;y:number;w:number;h:number};
const inside=(p:Phaser.Input.Pointer,r:Rect)=>Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(r.x,r.y,r.w,r.h),p.x,p.y);
class Shop extends Phaser.Scene {
  k=new Kitchen(); ui!:Phaser.GameObjects.Container; selected=-1; message='Buy two ingredients. Drag matching items together.';
  cells:Rect[]=[]; binRect!:Rect; serveRect!:Rect; drag=-1; origin={x:0,y:0}; ghost?:Phaser.GameObjects.Text; moved=false;
  mobile=false; logicalW=960; logicalH=760; lastWarning=-1; effects!:Phaser.GameObjects.Container;
  create(){
    try{const p=JSON.parse(localStorage.getItem('merge-serve-v1')||'null');if(p?.version===1&&Number.isFinite(p.coins)&&p.coins>=0&&[1,2,3].includes(p.unlocked)&&[4,6,9].includes(p.capacity)&&Number.isInteger(p.day)&&p.day>0)Object.assign(this.k,{coins:p.coins,day:p.day,unlocked:p.unlocked,capacity:p.capacity});}catch{}
    this.ui=this.add.container(0,0);this.effects=this.add.container(0,0).setDepth(20);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.down(p));
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.drag<0)return;if(Phaser.Math.Distance.Between(p.x,p.y,this.origin.x,this.origin.y)>10)this.moved=true;if(this.moved){if(!this.ghost)this.ghost=this.add.text(p.x,p.y,icons[this.k.active][this.k.boards[this.k.active][this.drag]-1],{fontSize:'48px'}).setOrigin(.5).setDepth(50);this.ghost.setPosition(p.x,p.y-20);}});
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.up(p));
    this.input.on('pointerupoutside',()=>this.cancelDrag());
    this.scale.on('resize',()=>{this.cancelDrag();this.paint();});
    window.addEventListener('blur',()=>this.cancelDrag());
    this.paint();
  }
  cancelDrag(){this.drag=-1;this.moved=false;this.ghost?.destroy();this.ghost=undefined;}
  save(){try{localStorage.setItem('merge-serve-v1',JSON.stringify({version:1,coins:this.k.coins,day:this.k.day,unlocked:this.k.unlocked,capacity:this.k.capacity}));}catch{}}
  box(r:Rect,color:number,radius=14){const g=this.add.graphics().fillStyle(color).fillRoundedRect(r.x,r.y,r.w,r.h,radius);this.ui.add(g);return g;}
  text(x:number,y:number,s:string,size=18,color=ink,width?:number){const t=this.add.text(x,y,s,{fontFamily:'Arial, sans-serif',fontSize:size,color,fontStyle:'bold',wordWrap:width?{width,useAdvancedWrap:true}:undefined});this.ui.add(t);return t;}
  button(r:Rect,label:string,fn:()=>void,color=green,size=17){this.box(r,color);this.text(r.x+r.w/2,r.y+r.h/2,label,size,'#fff').setOrigin(.5);const z=this.add.zone(r.x,r.y,r.w,r.h).setOrigin(0).setInteractive({useHandCursor:true});this.ui.add(z);z.on('pointerup',()=>{if(this.drag<0&&!this.k.ended)fn();else if(this.k.ended)fn();});}
  note(s:string){this.message=s;this.paint();}
  pop(s:string,x:number,y:number,color='#245e4e'){const t=this.add.text(x,y,s,{fontFamily:'Arial',fontSize:25,fontStyle:'bold',color,stroke:'#fffcf3',strokeThickness:5}).setOrigin(.5);this.effects.add(t);this.tweens.add({targets:t,y:y-50,alpha:0,duration:950,onComplete:()=>t.destroy()});}
  down(p:Phaser.Input.Pointer){if(this.k.ended)return;const i=this.cells.findIndex(r=>inside(p,r));if(i<0||i>=this.k.capacity||!this.k.boards[this.k.active][i])return;this.drag=i;this.origin={x:p.x,y:p.y};this.moved=false;}
  up(p:Phaser.Input.Pointer){if(this.k.ended){this.cancelDrag();return;}const from=this.drag,wasDrag=this.moved;this.cancelDrag();if(wasDrag&&from>=0){if(inside(p,this.binRect))this.discard(from);else if(inside(p,this.serveRect))this.serve(from);else{const to=this.cells.findIndex(r=>inside(p,r));if(to>=0&&to<this.k.capacity)this.move(from,to);else this.note('Drop on a slot, SERVE or BIN.');}return;}
    const to=this.cells.findIndex(r=>inside(p,r));if(to<0||to>=this.k.capacity)return;
    if(this.selected>=0&&to!==this.selected)this.move(this.selected,to);else{this.selected=this.selected===to?-1:(this.k.boards[this.k.active][to]?to:-1);this.paint();}
  }
  move(from:number,to:number){const merged=from!==to&&this.k.boards[this.k.active][from]===this.k.boards[this.k.active][to];this.selected=-1;if(!this.k.move(from,to)){this.note('Match the same level, or use an empty slot. Max level is 4.');return;}this.message=merged?'Nice merge!':'Item moved.';this.paint();const r=this.cells[to];this.pop(merged?'MERGED!':'Moved',r.x+r.w/2,r.y+35);const flash=this.add.rectangle(r.x+r.w/2,r.y+r.h/2,r.w-8,r.h-8,0xe8f19c,.45);this.effects.add(flash);this.tweens.add({targets:flash,scale:1.1,alpha:0,duration:300,onComplete:()=>flash.destroy()});}
  discard(i:number){if(i<0||!this.k.bin(i)){this.note('Select an item or drag one into BIN.');return;}this.selected=-1;this.note('Discarded. No coins refunded.');this.pop('Discarded',this.binRect.x+this.binRect.w/2,this.binRect.y);}
  serve(i:number){if(i<0){this.note('Select an item or drag it onto SERVE.');return;}if(this.k.active!==this.k.order.station){this.note(`Wrong station. Customer wants ${['fries','burgers','drinks'][this.k.order.station]}.`);return;}if(this.k.boards[this.k.active][i]!==this.k.order.level){this.note(`Customer needs level ${this.k.order.level}. Select that exact level.`);return;}const pay=this.k.serve(i);this.selected=-1;if(this.k.ended)this.save();this.note(`Happy customer! +${pay} coins`);this.pop(`+${pay} coins`,this.mobile?350:780,this.mobile?84:56);}
  buy(){if(!this.k.buy()){this.note(this.k.coins<2?'Need 2 coins for an ingredient.':'Board full! Merge or bin an item to make room.');return;}this.note('Fresh ingredient added.');}
  paint(){
    this.ui.removeAll(true);const k=this.k,w=this.scale.width;this.mobile=w<700;this.logicalW=w;this.logicalH=this.scale.height;const m=this.mobile;
    this.box({x:0,y:0,w,h:this.logicalH},cream,0);this.box({x:0,y:0,w,h:m?94:85},green,0);
    this.text(22,17,'MERGE & SERVE',m?26:29,'#fff');this.text(23,54,'THE LITTLE LUNCH SHOP',12,'#cfddbb');this.text(m?w-20:645,m?76:29,`DAY ${k.day}  •  ${k.coins} coins`,m?17:23,'#f0f4bf').setOrigin(m?1:0,m?1:0);
    if(m){this.text(20,108,`SHIFT ${k.completed}/${k.target}   •   ${k.served} served   •   ${k.missed} missed`,15,muted);this.ticket({x:18,y:140,w:w-36,h:142});}
    else{this.text(30,106,'01 / FAST FOOD CORNER',15,muted);this.text(30,135,'A little merge. A happy customer.',28);this.text(690,120,`Orders ${k.completed}/${k.target}`,20);this.ticket({x:625,y:185,w:305,h:418});}
    const tabsY=m?296:195,boardY=m?365:278,bx=m?18:30,bw=m?w-36:570,gap=m?9:12,cw=(bw-28-gap*2)/3,ch=m?94:88;
    ['FRIES','BURGERS','DRINKS'].forEach((name,i)=>this.button({x:bx+i*(bw/3)+3,y:tabsY,w:bw/3-6,h:52},i<k.unlocked?name:`${name} 🔒`,()=>{if(i<k.unlocked){this.selected=-1;k.active=i;this.note('Station switched.');}else this.note('Unlock this station after your shift.');},i===k.active?green:0x8a9584,m?14:17));
    this.box({x:bx,y:boardY,w:bw,h:ch*3+gap*2+28},0xd9cfb7);this.cells=[];
    for(let i=0;i<9;i++){const r={x:bx+14+(i%3)*(cw+gap),y:boardY+14+Math.floor(i/3)*(ch+gap),w:cw,h:ch};this.cells.push(r);const v=k.boards[k.active][i],locked=i>=k.capacity;this.box(r,locked?0xc7bea9:this.selected===i?0xe8f19c:0xfffcf3);if(locked)this.text(r.x+cw/2,r.y+ch/2,'LOCKED',12,'#8e8571').setOrigin(.5);else if(v){this.text(r.x+12,r.y+8,icons[k.active][v-1],m?31:34);this.text(r.x+cw-9,r.y+15,`L${v}`,15,muted).setOrigin(1,0);this.text(r.x+9,r.y+ch-25,foods[k.active][v-1],m?12:14,ink,cw-16);}else this.text(r.x+cw/2,r.y+ch/2,'+',28,'#bdc4b5').setOrigin(.5);}
    const actionY=m?721:620;
    this.binRect={x:m?bx+bw*.52:318,y:actionY,w:m?bw*.21-6:132,h:58};this.serveRect={x:m?bx+bw*.75:462,y:actionY,w:m?bw*.25:138,h:58};
    this.button({x:bx,y:actionY,w:m?bw*.5:274,h:58},m?'+ Item · 2 coins':'+ Buy ingredient · 2 coins',()=>this.buy());
    this.button(this.binRect,'BIN',()=>this.discard(this.selected),red,16);this.button(this.serveRect,'SERVE',()=>this.serve(this.selected),green,16);
    this.text(bx,m?798:699,this.message,m?17:16,ink,m?bw:575);
    if(!m){this.text(650,632,'DRAG TO MERGE',14,muted);this.text(650,660,'1 + 1 → 2    2 + 2 → 3\n3 + 3 → 4',16).setLineSpacing(9);}
    if(k.ended)this.summary();
  }
  ticket(r:Rect){const k=this.k,m=this.mobile,low=k.remaining<=10;this.box(r,low?0xffe0c9:0xfffcf3);const x=r.x+20,y=r.y+17;this.text(x,y,m?`${['Ayesha','Bilal','Sara','Omar','Zain','Noor'][k.completed%6]} wants`:'ORDER TICKET',m?16:15,muted);this.text(x,y+(m?27:90),foods[k.order.station][k.order.level-1],m?23:25);this.text(x,y+(m?56:132),`Level ${k.order.level} · ${['Fries','Burger','Drinks'][k.order.station]} station`,m?15:16,muted);const py=m?r.y+98:y+202;this.text(x,py,`${low?'HURRY!':'PATIENCE'} ${Math.ceil(k.remaining)}s`,16,low?'#a23925':ink);const barY=py+25;this.box({x,y:barY,w:r.w-40,h:9},0xe9e4d7,4);this.box({x,y:barY,w:Math.max(1,(r.w-40)*k.remaining/k.order.time),h:9},low?red:green,4);if(!m){this.text(x,y+280,'DRAG OR TAP',14,muted);this.text(x,y+310,'Drag matching items together.\nDrop an item on SERVE or BIN.\nOr tap to select, then act.',15).setLineSpacing(9);}}
  summary(){const k=this.k,m=this.mobile,w=this.scale.width,p=m?24:90,bw=w-2*p;this.box({x:0,y:0,w,h:this.scale.height},0x153d37,0);this.text(p,55,`DAY ${k.day} COMPLETE`,18,'#d4e7ae');this.text(p,95,'A good day at the shop.',m?29:36,'#fff',bw);this.text(p,155,`${k.served} served  /  ${k.missed} missed`,22,'#fff');this.box({x:p,y:210,w:bw,h:145},cream);this.text(p+20,230,`Balance: ${k.coins} coins`,25);this.text(p+20,275,`Tomorrow: ${k.reserve} reserved\nUpgrade budget: ${k.spendable} coins`,19).setLineSpacing(8);
    this.button({x:p,y:385,w:bw,h:64},k.capacity<9?'Expand board · 40 coins':'Board fully expanded',()=>{this.note(k.upgrade('slots')?'Board expanded!':'Need 40 surplus coins, or already maxed.');this.save();},0x527c62);
    this.button({x:p,y:463,w:bw,h:64},k.unlocked<3?'Unlock station · 60 coins':'All stations unlocked',()=>{this.note(k.upgrade('station')?'Station unlocked!':'Need 60 coins plus the new station’s reserve.');this.save();},0x527c62);
    this.text(p,551,this.message,17,'#fff',bw);this.text(p,615,'Reserve coins stay protected from upgrades.\nUnspent coins and board items carry over.',16,'#d4e7ae',bw).setLineSpacing(8);
    this.button({x:p,y:m?708:680,w:m?bw*.66:bw*.7,h:60},'NEXT DAY →',()=>{k.startDay();this.selected=-1;this.save();this.note('Fresh shift. Let’s serve something good.');});this.button({x:p+bw*(m?.69:.73),y:m?708:680,w:bw*(m?.31:.27),h:60},'Restart',()=>{this.k=new Kitchen();this.selected=-1;this.save();this.note('Fresh start!');},0x98634c,15);
  }
  update(_t:number,delta:number){if(this.k.ended)return;const second=Math.ceil(this.k.remaining),completed=this.k.completed;this.k.tick(Math.min(delta,250)/1000);if(this.k.completed!==completed){this.cancelDrag();this.selected=-1;this.message='Customer left. Try the next order!';}if(this.k.remaining<=10&&this.lastWarning!==this.k.completed){this.lastWarning=this.k.completed;this.pop('Patience running low!',this.scale.width/2,this.mobile?135:180,'#a23925');}if(this.k.ended){this.cancelDrag();this.save();this.paint();}else if(this.drag<0&&(second!==Math.ceil(this.k.remaining)||completed!==this.k.completed))this.paint();}
}
const portrait=window.innerWidth<700;
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:portrait?480:960,height:portrait?880:760,backgroundColor:'#153d37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Shop,render:{antialias:true}});
window.addEventListener('resize',()=>{const narrow=window.innerWidth<700;game.scale.setGameSize(narrow?480:960,narrow?880:760);});
document.addEventListener('visibilitychange',()=>{for(const scene of game.scene.getScenes(false)){if(document.hidden)scene.scene.pause();else scene.scene.resume();}});

