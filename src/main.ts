import Phaser from 'phaser';
import { Kitchen, COST } from './model';
import './style.css';

const green=0x245e4e, cream=0xf4eddb, ink='#183e37', muted='#718177', red=0xc45b43;
const foods=[['Potato','Fries','Loaded fries','Party fries'],['Bun','Burger','Cheeseburger','Mega burger'],['Cup','Soda','Float','Party pitcher']];
const icons=[['🥔','🍟','🍟','🍟'],['🥯','🍔','🍔','🍔'],['🥤','🥤','🍹','🍹']];
type Rect={x:number;y:number;w:number;h:number};
const inside=(p:Phaser.Input.Pointer,r:Rect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
class Shop extends Phaser.Scene {
  k=new Kitchen(); ui!:Phaser.GameObjects.Container; effects!:Phaser.GameObjects.Container;
  selected=-1; message='Buy two potatoes. Drag them together to merge.';
  cells:Rect[]=[]; binRect={x:382,y:302,w:72,h:50}; serveRect={x:20,y:100,w:440,h:172};
  drag=-1; origin={x:0,y:0}; ghost?:Phaser.GameObjects.Text; moved=false; lastWarning=-1;
  soundOn=true; audio?:AudioContext; soundRect={x:20,y:20,w:58,h:54};
  create(){
    try{const p=JSON.parse(localStorage.getItem('merge-serve-v1')||'null');if(p?.version===1&&Number.isFinite(p.coins)&&p.coins>=0&&[1,2,3].includes(p.unlocked)&&[4,6,9].includes(p.capacity)&&Number.isInteger(p.day)&&p.day>0)Object.assign(this.k,{coins:p.coins,day:p.day,unlocked:p.unlocked,capacity:p.capacity});this.soundOn=localStorage.getItem('merge-serve-sound')!=='off';}catch{}
    this.ui=this.add.container(0,0);this.effects=this.add.container(0,0).setDepth(20);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>this.down(p));
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.drag<0)return;if(Phaser.Math.Distance.Between(p.x,p.y,this.origin.x,this.origin.y)>10)this.moved=true;const item=this.k.board[this.drag];if(this.moved&&item){if(!this.ghost)this.ghost=this.add.text(p.x,p.y,icons[item.type][item.level-1],{fontSize:'50px'}).setOrigin(.5).setDepth(50);this.ghost.setPosition(p.x,p.y-25);}});
    this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.up(p));this.input.on('pointerupoutside',()=>this.cancelDrag());
    window.addEventListener('blur',()=>this.cancelDrag());this.paint();
  }
  tone(kind:'buy'|'merge'|'serve'|'error'|'bin'|'warning'){
    if(!this.soundOn)return;
    try{this.audio??=new AudioContext();void this.audio.resume();const ctx=this.audio,notes={buy:[440],merge:[520,780],serve:[523,659,784],error:[170],bin:[240,150],warning:[740,740]}[kind];notes.forEach((f,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*.09;osc.type='sine';osc.frequency.value=f;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.1,t+.01);gain.gain.exponentialRampToValueAtTime(.0001,t+.13);osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+.15);});}catch{}
  }
  cancelDrag(){this.drag=-1;this.moved=false;this.ghost?.destroy();this.ghost=undefined;}
  save(){try{localStorage.setItem('merge-serve-v1',JSON.stringify({version:1,coins:this.k.coins,day:this.k.day,unlocked:this.k.unlocked,capacity:this.k.capacity}));}catch{}}
  box(r:Rect,color:number,radius=14){const g=this.add.graphics().fillStyle(color).fillRoundedRect(r.x,r.y,r.w,r.h,radius);this.ui.add(g);return g;}
  text(x:number,y:number,s:string,size=18,color=ink,width?:number){const t=this.add.text(x,y,s,{fontFamily:'Arial, sans-serif',fontSize:size,color,fontStyle:'bold',wordWrap:width?{width,useAdvancedWrap:true}:undefined});this.ui.add(t);return t;}
  button(r:Rect,label:string,fn:()=>void,color=green,size=17){this.box(r,color);this.text(r.x+r.w/2,r.y+r.h/2,label,size,'#fff').setOrigin(.5);const z=this.add.zone(r.x,r.y,r.w,r.h).setOrigin(0).setInteractive({useHandCursor:true});this.ui.add(z);z.on('pointerup',()=>{if(this.drag<0)fn();});}
  note(s:string,error=false){this.message=s;if(error)this.tone('error');this.paint();}
  pop(s:string,x:number,y:number,color='#245e4e'){const t=this.add.text(x,y,s,{fontFamily:'Arial',fontSize:24,fontStyle:'bold',color,stroke:'#fffcf3',strokeThickness:5}).setOrigin(.5);this.effects.add(t);this.tweens.add({targets:t,y:y-35,alpha:0,duration:850,onComplete:()=>t.destroy()});}
  down(p:Phaser.Input.Pointer){if(this.k.ended)return;const i=this.cells.findIndex(r=>inside(p,r));if(i<0||!this.k.validSlot(i)||!this.k.board[i])return;this.drag=i;this.origin={x:p.x,y:p.y};this.moved=false;}
  up(p:Phaser.Input.Pointer){if(this.k.ended){this.cancelDrag();return;}const from=this.drag,wasDrag=this.moved;this.cancelDrag();if(wasDrag&&from>=0){if(inside(p,this.binRect))this.discard(from);else if(inside(p,this.serveRect))this.serve(from);else{const to=this.cells.findIndex(r=>inside(p,r));if(this.k.validSlot(to))this.move(from,to);else this.note('Drop on a matching item, empty slot, order or bin.');}return;}
    const to=this.cells.findIndex(r=>inside(p,r));if(!this.k.validSlot(to))return;if(this.selected>=0&&to!==this.selected)this.move(this.selected,to);else{this.selected=this.selected===to?-1:(this.k.board[to]?to:-1);this.paint();}
  }
  move(from:number,to:number){const a=this.k.board[from],b=this.k.board[to],merged=from!==to&&a&&b&&a.type===b.type&&a.level===b.level;this.selected=-1;if(!this.k.move(from,to)){this.note('Only the same item AND level merge. Max level: 4.',true);return;}this.message=merged?'Nice merge! Drop the requested dish on the order.':'Item moved.';this.paint();const r=this.cells[to];if(merged){this.tone('merge');this.pop('MERGED!',r.x+r.w/2,r.y+34);const flash=this.add.rectangle(r.x+r.w/2,r.y+r.h/2,r.w-8,r.h-8,0xe8f19c,.45);this.effects.add(flash);this.tweens.add({targets:flash,scale:1.1,alpha:0,duration:300,onComplete:()=>flash.destroy()});}}
  discard(i:number){if(!this.k.bin(i)){this.note('Drag an item into the bin, or select one then tap BIN.');return;}this.selected=-1;this.tone('bin');this.note('Discarded. No coins refunded.');}
  serve(i:number){const item=this.k.board[i];if(!item){this.note('Drag the requested dish onto this order.');return;}if(item.type!==this.k.order.type||item.level!==this.k.order.level){this.note(`Needs ${foods[this.k.order.type][this.k.order.level-1]} · level ${this.k.order.level}. Item returned.`,true);return;}const pay=this.k.serve(i);this.selected=-1;this.tone('serve');if(this.k.ended)this.save();this.note(`Happy customer! +${pay} coins`);this.pop(`+${pay} coins`,350,84);}
  buy(type:number){if(type>=this.k.unlocked){this.note(`Item ${type+1} unlocks with coins after your shift.`);return;}if(!this.k.buy(type)){this.note(this.k.coins<COST?'Need 2 coins for an ingredient.':'Board full! Merge or bin an item.',true);return;}this.tone('buy');this.note(`${foods[type][0]} added to the board.`);}
  topBar(){this.box({x:0,y:0,w:480,h:92},green,0);this.button(this.soundRect,this.soundOn?'🔊':'🔇',()=>{this.soundOn=!this.soundOn;try{localStorage.setItem('merge-serve-sound',this.soundOn?'on':'off');}catch{}if(this.soundOn)this.tone('buy');this.paint();},0x39735f,26);this.text(93,24,'MERGE &',18,'#f5f0d9');this.text(93,46,'SERVE',22,'#fff');this.box({x:284,y:20,w:176,h:54},0x173f35);this.text(302,47,`●  ${this.k.coins} coins`,22,'#f0e7a5').setOrigin(0,.5);}
  paint(){this.ui.removeAll(true);const k=this.k;this.box({x:0,y:0,w:480,h:860},cream,0);this.topBar();if(k.ended){this.summary();return;}
    const r=this.serveRect,low=k.remaining<=10;this.box(r,low?0xffe0c9:0xfffcf3);this.text(38,115,`${['Ayesha','Bilal','Sara','Omar','Zain','Noor'][k.completed%6]} wants`,17,muted);this.text(442,116,`DAY ${k.day} · ${k.completed}/${k.target}`,14,muted).setOrigin(1,0);this.text(40,147,icons[k.order.type][k.order.level-1],40);this.text(102,147,foods[k.order.type][k.order.level-1],25);this.text(103,178,`Level ${k.order.level}`,16,muted);this.text(38,209,low?`HURRY! ${Math.ceil(k.remaining)}s`:`Patience ${Math.ceil(k.remaining)}s`,16,low?'#a23925':ink);this.text(440,209,'DROP DISH HERE',13,muted).setOrigin(1,0);this.box({x:38,y:242,w:404,h:10},0xe9e4d7,5);this.box({x:38,y:242,w:Math.max(1,404*k.remaining/k.order.time),h:10},low?red:green,5);
    // The counter itself is the serving target. Tap-selected items also work.
    const counter=this.add.zone(r.x,r.y,r.w,r.h).setOrigin(0).setInteractive({useHandCursor:true});this.ui.add(counter);counter.on('pointerup',()=>{if(this.drag<0)this.serve(this.selected);});
    this.box({x:20,y:290,w:440,h:410},0xd9cfb7,20);this.text(38,319,'MERGE BOARD',16,muted);this.button(this.binRect,'BIN',()=>this.discard(this.selected),red,16);this.cells=[];
    for(let i=0;i<9;i++){const cell={x:34+(i%3)*140,y:365+Math.floor(i/3)*108,w:132,h:100};this.cells.push(cell);const v=k.board[i],locked=i>=k.capacity;this.box(cell,locked?0xc7bea9:this.selected===i?0xe8f19c:0xfffcf3);if(locked)this.text(cell.x+66,cell.y+50,'LOCKED',12,'#8e8571').setOrigin(.5);else if(v){this.text(cell.x+12,cell.y+9,icons[v.type][v.level-1],36);this.text(cell.x+120,cell.y+17,`L${v.level}`,15,muted).setOrigin(1,0);this.text(cell.x+10,cell.y+72,foods[v.type][v.level-1],13,ink,114);}else this.text(cell.x+66,cell.y+50,'+',28,'#bdc4b5').setOrigin(.5);}
    this.text(22,711,this.message,16,ink,436);
    this.box({x:0,y:766,w:480,h:94},0xe3d9c0,0);
    [1,0,2].forEach((type,pos)=>{const x=18+pos*154,locked=type>=k.unlocked;this.button({x,y:778,w:144,h:70},'',()=>this.buy(type),locked?0x909780:green);if(locked){this.text(x+72,795,'🔒',25,'#fff').setOrigin(.5,0);this.text(x+72,831,`ITEM ${type+1}`,13,'#f2efe1').setOrigin(.5);}else{this.text(x+24,789,icons[type][0],29);this.text(x+74,790,foods[type][0],14,'#fff',64);this.text(x+74,814,`${COST} coins`,15,'#edf2b7');}});
  }
  summary(){const k=this.k;this.text(24,121,`DAY ${k.day} COMPLETE`,18,muted);this.text(24,157,'A good day at the shop.',29);this.text(24,206,`${k.served} served / ${k.missed} missed`,20);this.box({x:24,y:253,w:432,h:126},0xfffcf3);this.text(44,276,`Tomorrow: ${k.reserve} reserved`,21);this.text(44,316,`Upgrade budget: ${k.spendable} coins`,21);
    this.button({x:24,y:410,w:432,h:64},k.capacity<9?'Expand board · 40 coins':'Board fully expanded',()=>{this.note(k.upgrade('slots')?'Board expanded!':'Need 40 surplus coins, or already maxed.');this.save();});
    this.button({x:24,y:492,w:432,h:64},k.unlocked<3?`Unlock Item ${k.unlocked+1} · 60 coins`:'All 3 items unlocked',()=>{this.note(k.upgrade('item')?'New ingredient unlocked!':'Need 60 coins plus tomorrow’s reserve, or already maxed.');this.save();});
    this.text(24,581,this.message,17,ink,432);this.text(24,660,'Coins and board items carry over.\nTomorrow’s budget stays protected.',17,muted).setLineSpacing(8);
    this.button({x:24,y:766,w:280,h:66},'NEXT DAY →',()=>{k.startDay();this.selected=-1;this.lastWarning=-1;this.save();this.note('Fresh shift. Start with Item 1!');});this.button({x:320,y:766,w:136,h:66},'Restart',()=>{this.cancelDrag();this.k=new Kitchen();this.selected=-1;this.lastWarning=-1;this.save();this.note('Fresh start! Buy two potatoes.');},red);
  }
  update(_t:number,delta:number){if(this.k.ended)return;const second=Math.ceil(this.k.remaining),completed=this.k.completed;this.k.tick(Math.min(delta,250)/1000);if(this.k.completed!==completed){this.cancelDrag();this.selected=-1;this.message='Customer left. Try the next order!';}if(this.k.remaining<=10&&this.lastWarning!==this.k.completed){this.lastWarning=this.k.completed;this.pop('Patience running low!',240,290,'#a23925');this.tone('warning');}if(this.k.ended){this.cancelDrag();this.save();this.paint();}else if(this.drag<0&&(second!==Math.ceil(this.k.remaining)||completed!==this.k.completed))this.paint();}
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:480,height:860,backgroundColor:'#153d37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Shop,render:{antialias:true}});
document.addEventListener('visibilitychange',()=>{for(const scene of game.scene.getScenes(false)){if(document.hidden)scene.scene.pause();else scene.scene.resume();}});
