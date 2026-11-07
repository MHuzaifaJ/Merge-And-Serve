import Phaser from 'phaser';
import {Kitchen} from './model';
import './style.css';

const C={bg:0xf4eddb,ink:'#183e37',green:0x245e4e,lime:0xe8f19c,muted:'#718177',red:0xc45b43};
const foods=[['Potato','Fries','Loaded fries','Party fries'],['Bun','Burger','Cheeseburger','Mega burger'],['Cup','Soda','Float','Party pitcher']];
const symbols=[['🥔','🍟','🍟','🍟'],['🥯','🍔','🍔','🍔'],['🥤','🥤','🍹','🍹']];
class Shop extends Phaser.Scene {
  k=new Kitchen(); layer!:Phaser.GameObjects.Container; selected=-1; message='Welcome! Buy two items, then merge them.'; saved=false;
  create(){
    try{const s=localStorage.getItem('merge-serve-v1');if(s){const p=JSON.parse(s);if(p.version===1&&typeof p.coins==='number'&&p.coins>=0&&[1,2,3].includes(p.unlocked)&&[4,6,9].includes(p.capacity)&&Number.isInteger(p.day)&&p.day>0){this.k.coins=p.coins;this.k.day=p.day;this.k.unlocked=p.unlocked;this.k.capacity=p.capacity;}}}catch{}
    this.layer=this.add.container(0,0);this.paint();
  }
  box(x:number,y:number,w:number,h:number,color:number,r=16){const g=this.add.graphics();g.fillStyle(color);g.fillRoundedRect(x,y,w,h,r);this.layer.add(g);return g;}
  text(x:number,y:number,s:string,size=18,color=C.ink){const t=this.add.text(x,y,s,{fontFamily:'Arial, sans-serif',fontSize:size,color,fontStyle:'bold'});this.layer.add(t);return t;}
  button(x:number,y:number,w:number,h:number,s:string,fn:()=>void,color=C.green){this.box(x,y,w,h,color,12);const t=this.text(x+w/2,y+h/2,s,17,'#ffffff').setOrigin(.5);const hit=this.add.zone(x,y,w,h).setOrigin(0).setInteractive({useHandCursor:true});this.layer.add(hit);hit.on('pointerdown',fn);return t;}
  note(s:string){this.message=s;this.paint();}
  save(){try{localStorage.setItem('merge-serve-v1',JSON.stringify({version:1,coins:this.k.coins,day:this.k.day,unlocked:this.k.unlocked,capacity:this.k.capacity}));}catch{}}
  paint(){
    this.layer.removeAll(true);const k=this.k;
    this.box(0,0,960,760,C.bg,0);this.box(0,0,960,85,C.green,0);
    this.text(30,18,'MERGE & SERVE',29,'#ffffff');this.text(32,53,'THE LITTLE LUNCH SHOP',12,'#c9d9b8');
    this.text(645,28,`DAY ${k.day}     •     ${k.coins} coins`,23,'#f0f4bf');
    this.text(32,105,'01 / FAST FOOD CORNER',15,C.muted);
    this.text(32,130,'A little merge. A happy customer.',28);
    this.text(680,112,`Orders ${k.completed}/${k.target}`,20);this.text(680,140,`Served ${k.served}  •  Missed ${k.missed}`,15,C.muted);
    this.box(30,185,570,70,0xe4ddc9);
    ['FRIES','BURGERS','DRINKS'].forEach((name,i)=>this.button(40+i*186,195,176,50,i<k.unlocked?name:`${name} 🔒`,()=>{if(i<k.unlocked){k.active=i;this.selected=-1;this.paint();}else this.note('Unlock this station after your shift.');},i===k.active?C.green:0x8a9584));
    const boardY=278;this.box(30,boardY,570,325,0xd9cfb7);
    for(let i=0;i<9;i++){
      const x=44+(i%3)*182,y=292+Math.floor(i/3)*100,v=k.boards[k.active][i],locked=i>=k.capacity;
      this.box(x,y,170,88,locked?0xc7bea9:this.selected===i?0xe8f19c:0xfffcf3,12);
      if(locked)this.text(x+85,y+43,'LOCKED',14,'#918976').setOrigin(.5);
      else if(v){this.text(x+15,y+12,symbols[k.active][v-1],34);this.text(x+62,y+15,`LV ${v}`,13,C.muted);this.text(x+12,y+63,foods[k.active][v-1],14);}
      else this.text(x+85,y+44,'+',28,'#c2c7b8').setOrigin(.5);
      if(!locked){const z=this.add.zone(x,y,170,88).setOrigin(0).setInteractive({useHandCursor:true});this.layer.add(z);z.on('pointerdown',()=>{if(k.ended)return;if(this.selected<0){if(v)this.selected=i;}else{if(!k.move(this.selected,i)&&this.selected!==i)this.message='Merge matching levels, or move to an empty slot.';this.selected=-1;}this.paint();});}
    }
    this.button(30,620,274,57,'+ Buy ingredient · 2 coins',()=>{this.note(k.buy()?'Fresh ingredient added.':'Board full or not enough coins.');});
    this.button(318,620,132,57,'BIN',()=>{if(this.selected>=0&&k.bin(this.selected)){this.selected=-1;this.note('Item discarded.');}else this.note('Select an item first, then use the bin.');},C.red);
    this.button(462,620,138,57,'SERVE →',()=>{const pay=this.selected>=0?k.serve(this.selected):0;this.selected=-1;if(k.ended)this.save();this.note(pay?`Order served! +${pay} coins`:'Select the exact item requested, then serve.');});
    this.box(625,185,305,418,0xfffcf3);this.text(650,208,'ORDER TICKET',15,C.muted);
    this.text(650,245,'👤',46);this.text(715,252,['Ayesha','Bilal','Sara','Omar','Zain','Noor'][k.completed%6],24);
    this.text(650,315,foods[k.order.station][k.order.level-1],25);this.text(650,352,`Level ${k.order.level} · ${['Fries','Burger','Drinks'][k.order.station]} station`,16,C.muted);
    this.text(650,404,`PATIENCE   ${Math.ceil(k.remaining)}s`,17);
    this.box(650,438,255,12,0xe9e4d7,6);this.box(650,438,Math.max(1,255*k.remaining/k.order.time),12,k.remaining<10?C.red:C.green,6);
    this.text(650,480,'HOW TO PLAY',14,C.muted);this.text(650,510,'Tap an item, then a matching\nitem to merge. Select the exact\norder item and press SERVE.',15).setLineSpacing(7);
    this.text(32,702,this.message,16);this.text(650,632,'MERGE GUIDE',13,C.muted);this.text(650,660,'1 + 1 → 2    2 + 2 → 3\n3 + 3 → 4',16).setLineSpacing(8);
    if(k.ended)this.summary();
  }
  summary(){const k=this.k;this.box(0,0,960,760,0x153d37,0);this.text(90,65,`DAY ${k.day} COMPLETE`,18,'#d4e7ae');this.text(90,103,'Good things take a little merging.',33,'#ffffff');this.text(90,165,`${k.served} served   /   ${k.missed} missed`,22,'#ffffff');
    this.box(90,220,780,135,0xf4eddb);this.text(115,245,`Balance: ${k.coins} coins`,25);this.text(115,291,`Tomorrow’s reserve: ${k.reserve}  •  Upgrade budget: ${k.spendable}`,21);
    this.button(90,390,375,70,k.capacity<9?`Expand board · 40 coins (${k.capacity} slots)`:'Board fully expanded',()=>{this.message=k.upgrade('slots')?'Board expanded!':'Need 40 surplus coins, or already maxed.';this.paint();},0x527c62);
    this.button(485,390,385,70,k.unlocked<3?'Unlock next station · 60 coins':'All 3 stations unlocked',()=>{this.message=k.upgrade('station')?'New station unlocked!':'Need 60 surplus coins, or already maxed.';this.paint();},0x527c62);
    this.text(90,490,this.message,17,'#ffffff');this.text(90,535,'Unspent coins and board items carry over. Your reserve is protected\nfrom upgrades; ingredient purchases use your normal balance.',18,'#d4e7ae').setLineSpacing(10);
    this.button(90,630,500,65,'OPEN NEXT DAY →',()=>{k.startDay();this.save();this.message='A fresh shift. Let’s serve something good.';this.paint();});
    this.button(610,630,260,65,'Restart shop',()=>{this.k=new Kitchen();this.selected=-1;this.save();this.message='Fresh start!';this.paint();},0x98634c);
  }
  update(_time:number,delta:number){if(this.k.ended)return;const before=Math.ceil(this.k.remaining);this.k.tick(Math.min(delta,250)/1000);if(before!==Math.ceil(this.k.remaining)||this.k.ended){if(this.k.ended)this.save();this.paint();}}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:960,height:760,backgroundColor:'#153d37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Shop,render:{antialias:true},callbacks:{postBoot:game=>{document.addEventListener('visibilitychange',()=>{if(document.hidden)game.scene.pause('default');else game.scene.resume('default');});}}});
