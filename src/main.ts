import Phaser from 'phaser';
import {Kitchen,DECORATIONS} from './model';
import './style.css';


// Render above CSS resolution while keeping all gameplay coordinates logical.
const DENSITY=Math.min(3,Math.max(2,Math.ceil(window.devicePixelRatio||1)));
const green=0x438d70,cream=0xf9d3a0,ink='#183e37',muted='#718177',red=0xc45b43;
const menus=[{name:'Lunch Corner'},{name:'Sweet Street'}];
type Rect={x:number;y:number;w:number;h:number};const inside=(p:{x:number;y:number},r:Rect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
class Shop extends Phaser.Scene{
 k=new Kitchen();ui!:Phaser.GameObjects.Container;fx!:Phaser.GameObjects.Container;selected=-1;drag=-1;moved=false;origin={x:0,y:0};ghost?:Phaser.GameObjects.Image;cells:Rect[]=[];orders:Rect[]=[];bin={x:392,y:369,w:65,h:65};message='Add free ingredients below. Drag matching items together.';notice='';noticeUntil=0;panel=false;decorTab:'wall'|'counter'|'wallProp'|'counterProp'='wall';soundOn=true;audio?:AudioContext;lastPaint=0;lastSave=0;
 preload(){this.load.spritesheet('foods','art/food-v1.png',{frameWidth:256,frameHeight:256});this.load.spritesheet('people','art/customers-v1.png',{frameWidth:512,frameHeight:512});this.load.image('shop-wall','art/shop-v1.png');this.load.image('board','art/board-v2.png');this.load.spritesheet('controls','art/controls-v2.png',{frameWidth:512,frameHeight:512});this.load.image('wood','art/wood-v2.png');}
 frame(type:number,level:number){return this.k.shop*12+type*4+level-1;}
 get menu(){return menus[this.k.shop];}
 logical(p:Phaser.Input.Pointer){return this.cameras.main.getWorldPoint(p.x,p.y);}
 art(key:string,x:number,y:number,w:number,h:number,frame?:number|string){const image=this.add.image(x,y,key,frame).setDisplaySize(w,h);this.ui.add(image);return image;}
 control(r:Rect,frame:number,fn:()=>void){this.art('controls',r.x+r.w/2,r.y+r.h/2,r.w,r.h,frame);this.hit(r,fn);}
 create(){this.cameras.main.setZoom(DENSITY).centerOn(240,430);this.textures.get('controls').add('green',0,0,620,512,300);this.textures.get('controls').add('gold',0,512,620,512,300);try{const saved=localStorage.getItem('merge-serve-v4')??localStorage.getItem('merge-serve-v3')??localStorage.getItem('merge-serve-v2');if(saved)this.k=Kitchen.restore(JSON.parse(saved));this.soundOn=localStorage.getItem('merge-serve-sound')!=='off';}catch{}this.ui=this.add.container(0,0);this.fx=this.add.container(0,0).setDepth(20);
 this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const p=this.logical(pointer);if(this.panel||this.k.shopReady||this.k.finished)return;const i=this.cells.findIndex(r=>inside(p,r));if(i<0||!this.k.board[i])return;this.drag=i;this.origin={x:p.x,y:p.y};this.moved=false;});
 this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{const p=this.logical(pointer);if(this.drag<0)return;const started=!this.moved&&Phaser.Math.Distance.Between(p.x,p.y,this.origin.x,this.origin.y)>10;this.moved ||= started;if(started)this.paint();const item=this.k.board[this.drag];if(this.moved&&item){if(!this.ghost)this.ghost=this.add.image(p.x,p.y,'foods',this.frame(item.type,item.level)).setDisplaySize(82,82).setDepth(50);this.ghost.setPosition(p.x,p.y-20);}});
 this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.up(this.logical(p)));this.input.on('pointerupoutside',()=>this.cancel());window.addEventListener('blur',()=>{this.cancel();this.save();});window.addEventListener('pagehide',()=>this.save());document.addEventListener('visibilitychange',()=>{if(document.hidden){this.cancel();this.save();}});this.paint();this.save();}
 save(){try{localStorage.setItem('merge-serve-v4',JSON.stringify(this.k.snapshot()));}catch{}}
 cancel(){this.drag=-1;this.moved=false;this.ghost?.destroy();this.ghost=undefined;}
 tone(kind:'buy'|'merge'|'serve'|'error'|'bin'){if(!this.soundOn)return;try{this.audio??=new AudioContext();void this.audio.resume();const ctx=this.audio;({buy:[440],merge:[520,780],serve:[523,659,784],error:[170],bin:[240,150]}[kind]).forEach((f,i)=>{const osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.09;osc.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.13);osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.15);});}catch{}}
 box(r:Rect,c:number,radius=14){const g=this.add.graphics().fillStyle(0x5d412b,.28).fillRoundedRect(r.x,r.y+4,r.w,r.h,radius).fillStyle(c).fillRoundedRect(r.x,r.y,r.w,r.h,radius).lineStyle(2,0x244a3e,.85).strokeRoundedRect(r.x,r.y,r.w,r.h,radius);this.ui.add(g);return g;}
 text(x:number,y:number,s:string,size=17,c=ink,width?:number){const t=this.add.text(x,y,s,{fontFamily:'Trebuchet MS, Arial, sans-serif',fontSize:size,fontStyle:'bold',color:c,wordWrap:width?{width,useAdvancedWrap:true}:undefined}).setResolution(DENSITY);this.ui.add(t);return t;}
 button(r:Rect,label:string,fn:()=>void,c=green,size=17){this.box(r,c);this.text(r.x+r.w/2,r.y+r.h/2,label,size,'#fff').setOrigin(.5);this.hit(r,fn);}
 hit(r:Rect,fn:()=>void){const z=this.add.zone(r.x,r.y,r.w,r.h).setOrigin(0).setInteractive({useHandCursor:true});this.ui.add(z);z.on('pointerup',()=>{if(this.drag<0)fn();});}
 note(s:string,error=false){this.message=s;if(error){this.tone('error');this.cameras.main.shake(90,.002);}this.save();this.paint();}
 food(x:number,y:number,type:number,level:number,size:number){const icon=this.add.image(x,y,'foods',this.frame(type,level)).setDisplaySize(size,size);this.ui.add(icon);return icon;}
 pop(s:string,x:number,y:number){const t=this.add.text(x,y,s,{fontSize:'23px',fontFamily:'Arial',fontStyle:'bold',color:ink,stroke:'#fffcf3',strokeThickness:5}).setOrigin(.5);this.fx.add(t);this.tweens.add({targets:t,y:y-35,alpha:0,duration:850,onComplete:()=>t.destroy()});}
 up(p:{x:number;y:number}){const from=this.drag,moved=this.moved;this.cancel();if(this.panel||this.k.shopReady||this.k.finished)return;if(moved&&from>=0){if(inside(p,this.bin))this.discard(from);else{const c=this.orders.findIndex(r=>inside(p,r));if(c>=0)this.deliver(from,c);else{const to=this.cells.findIndex(r=>inside(p,r));if(to>=0)this.move(from,to);else this.note('Drop on a matching slot, customer order or bin.');}}return;}const i=this.cells.findIndex(r=>inside(p,r));if(i<0)return;if(this.selected>=0&&i!==this.selected)this.move(this.selected,i);else{this.selected=this.selected===i?-1:(this.k.board[i]?i:-1);this.paint();}}
 move(a:number,b:number){const merged=!!this.k.board[b];this.selected=-1;if(!this.k.move(a,b)){this.note('Match the same type and level. Maximum level: 4.',true);return;}this.note(merged?'Nice merge!':'Item moved.');if(merged){this.tone('merge');const r=this.cells[b];const flash=this.add.rectangle(r.x+r.w/2,r.y+r.h/2,r.w-8,r.h-8,0xe8f19c,.5);this.fx.add(flash);this.tweens.add({targets:flash,scale:1.1,alpha:0,duration:300,onComplete:()=>flash.destroy()});}}
 discard(i:number){if(!this.k.bin(i)){this.note('Drag an item to BIN, or select one first.');return;}this.selected=-1;this.tone('bin');this.note('Item discarded. No coins added.');}
 deliver(i:number,c:number){const before=this.k.unlocked;const result=this.k.deliver(i,c);if(!result.accepted){this.note('This customer needs a different item or level. Item returned.',true);return;}this.selected=-1;this.tone('serve');if(result.levelUp){if(this.k.unlocked>before)this.announce('🔓');else if(this.k.shopReady)this.announce('🔓 🏪');else if(this.k.finished)this.announce('✨ 🏆 ✨');this.message=this.k.shopReady?'Ready for a new shop? Your coins and decorations carry over.':this.k.finished?'All 20 levels mastered. Your shop is complete!':`Level ${this.k.level}! New customers are here.`;}else this.message=result.payment?`Order complete! +${result.payment} coins.`:'Item delivered. Payment arrives when the order is complete.';this.save();this.paint();if(result.payment)this.pop(`+${result.payment} 🪙`,365,90);}
 announce(s:string){this.notice=s;this.noticeUntil=this.time.now+2600;}
 buy(type:number){if(type>=this.k.unlocked){this.note(`Unlock Item ${type+1} after level ${type===1?5:10}.`);return;}if(!this.k.addItem(type)){this.note('Board full. Merge or discard an item.',true);return;}this.tone('buy');this.note('');}
 paint(){this.ui.removeAll(true);const k=this.k;
 this.box({x:0,y:0,w:480,h:860},cream,0);
 this.shopScene();
 this.control({x:8,y:8,w:62,h:62},0,()=>{this.soundOn=!this.soundOn;try{localStorage.setItem('merge-serve-sound',this.soundOn?'on':'off');}catch{}if(this.soundOn)this.tone('buy');this.paint();});
 if(!this.soundOn){const line=this.add.graphics().lineStyle(4,0xffeee0).lineBetween(21,56,57,21);this.ui.add(line);}
 const m=k.milestone;
 this.box({x:82,y:17,w:208,h:43},0xfff2d8,23);this.box({x:88,y:23,w:196,h:31},0xdeb884,17);
 if(k.progress>0)this.box({x:88,y:23,w:Math.max(20,196*k.progress),h:31},0x42c98b,17);
 this.text(169,37,`${Math.max(0,k.completed-m.start)}/${m.end-m.start}`,27,'#123c32').setOrigin(.5).setStroke('#fff8df',3);
 if(k.completed<10)this.food(269,36,k.completed<5?1:2,1,48);else this.text(269,36,k.finished?'🏆':'🏪',28).setOrigin(.5);
 this.text(177,68,`${k.level}`,12,ink).setOrigin(.5);
 this.box({x:304,y:15,w:165,h:48},0xfff2d8,24);this.text(386,39,`🪙 ${k.coins.toLocaleString()}`,25,ink).setOrigin(.5);
 this.art('board',239,580,410,405);this.cells=[];
 for(let i=0;i<9;i++){const r={x:80+i%3*106,y:432+Math.floor(i/3)*102,w:100,h:95};this.cells.push(r);const item=k.board[i];if(this.selected===i)this.box(r,0xd9f2a1,18).setAlpha(.65);if(item)this.food(r.x+50,r.y+47,item.type,item.level,107);}
 this.control(this.bin,1,()=>this.discard(this.selected));
 this.control({x:396,y:727,w:68,h:68},2,()=>{this.cancel();this.panel=true;this.message='';this.paint();});
 [1,0,2].forEach((type,pos)=>{const r={x:17+pos*154,y:774,w:138,h:78},locked=type>=k.unlocked;
 this.art('controls',r.x+r.w/2,r.y+r.h/2,r.w,r.h,locked?'green':'gold');this.hit(r,()=>this.buy(type));
 if(locked)this.art('controls',r.x+r.w/2,r.y+r.h/2,64,64,5);else this.food(r.x+r.w/2,r.y+r.h/2,type,1,90);});
 if(this.notice&&this.time.now<this.noticeUntil){this.box({x:110,y:690,w:270,h:42},0xe8f19c);this.text(245,711,this.notice,24).setOrigin(.5);}
 if(k.shopReady||k.finished){this.box({x:20,y:150,w:440,h:146},0xe6efb5);this.text(240,169,k.shopReady?'SHOP 2 UNLOCKED':'BOTH SHOPS MASTERED',22).setOrigin(.5,0);this.text(42,203,k.shopReady?'Coins + decorations carry over.\nBoard clears. No return to this shop.':'All orders complete. Your progress is saved.',15,ink,396);if(k.shopReady)this.button({x:60,y:248,w:360,h:38},'OPEN NEXT SHOP →',()=>{k.openShop();this.selected=-1;this.note('Welcome to Sweet Street! A fresh board and new dishes.');});}
 if(this.panel)this.decorationPanel();}
 shopScene(){const k=this.k;
 const wallImage=this.art('shop-wall',240,220,480,280);if(k.decoration('wall').id!=='wall-classic')wallImage.setTint(k.decoration('wall').color);
 this.text(240,127,this.menu.name,25,'#49301d').setFontFamily('Georgia, serif').setOrigin(.5);
 const wall=k.decoration('wallProp');
 if(wall.id==='wall-prop-clock'){this.box({x:433,y:191,w:37,h:44},0x85674c,5);const clock=this.add.graphics();this.ui.add(clock);clock.fillStyle(0xfff9e8).fillCircle(451,212,15).lineStyle(2,0x485a4b).lineBetween(451,212,451,201).lineBetween(451,212,460,216);}
 else if(wall.id==='wall-prop-picture'){this.box({x:431,y:184,w:40,h:63},0x85674c,3);this.box({x:435,y:188,w:32,h:55},0xf8efd7,1);this.text(451,216,'🌿',29).setOrigin(.5);}
 const n=k.customers.length,cw=n===3?128:150,gap=n===3?10:22,total=cw*n+gap*(n-1),start=(430-total)/2;this.orders=[];
 k.customers.forEach((customer,i)=>{const r={x:start+i*(cw+gap),y:153,w:cw,h:87},cx=r.x+cw/2;this.orders.push(r);
 if(!customer.paid)this.art('people',cx,299,n===3?155:174,n===3?155:174,(k.level+i+k.shop)%6);
 this.box(r,customer.paid?0xe0ebce:0xfffcf3,27);
 const tail=this.add.graphics().fillStyle(customer.paid?0xe0ebce:0xfffcf3).fillTriangle(cx-9,237,cx+10,237,cx-2,253).lineStyle(2,0x244a3e).lineBetween(cx-9,240,cx-2,253).lineBetween(cx-2,253,cx+10,240);this.ui.add(tail);
 const iw=Math.min(70,(cw-12)/customer.items.length),total=iw*customer.items.length;
 customer.items.forEach((item,j)=>{const x=r.x+(cw-total)/2+j*iw+iw/2,icon=this.food(x,185,item.type,item.level,Math.min(68,iw));if(item.done){icon.setAlpha(.25);this.text(x,185,'✓',25,'#315d3b').setOrigin(.5);}});
 this.text(cx,223,customer.paid?'✓':`🪙 ${customer.payment}`,18,ink).setOrigin(.5);this.hit(r,()=>{if(!this.panel)this.deliver(this.selected,i);});});
 const counter=this.art('wood',240,602,480,516);if(k.decoration('counter').id!=='counter-classic')counter.setTint(k.decoration('counter').color);
 const prop=k.decoration('counterProp');if('symbol' in prop)this.text(449,350,prop.symbol,42).setOrigin(.5,1);
 }
 decorationPanel(){const k=this.k;this.box({x:15,y:105,w:450,h:670},0x173f35);const shield=this.add.zone(0,0,480,860).setOrigin(0).setInteractive();this.ui.add(shield);this.text(34,128,'DECORATIONS',25,'#fff');this.button({x:393,y:120,w:48,h:43},'×',()=>{this.panel=false;this.paint();},0x52775d,26);
 const tabs=[['wall','Wall'],['counter','Counter'],['wallProp','Wall slot'],['counterProp','Counter slot']] as const;
 tabs.forEach(([category,label],i)=>this.button({x:29+i*106,y:180,w:100,h:48},label,()=>{this.decorTab=category;this.message='';this.paint();},this.decorTab===category?0x8b9f69:0x31584a,13));
 DECORATIONS.filter(d=>d.category===this.decorTab).forEach((d,i)=>{const y=255+i*92,owned=k.owned.includes(d.id),equipped=k.equipped[d.category]===d.id;this.box({x:30,y,w:420,h:76},0x31584a,10);if(d.category==='wall'||d.category==='counter')this.box({x:42,y:y+19,w:35,h:35},d.color,5);else this.text(42,y+18,'symbol' in d?d.symbol:'—',30,'#fff');this.text(91,y+15,d.name,16,'#fff',175);this.button({x:285,y:y+20,w:155,h:37},equipped?'✓':owned?'Equip':`🪙 ${d.price}`,()=>{if(equipped)return;const ok=owned?k.equipDecoration(d.id):k.purchaseDecoration(d.id);if(!ok){this.note('Not enough coins. Complete customer orders to earn more.',true);return;}this.tone('merge');this.note(`${d.name} equipped!`);},equipped?0x7c8862:green,14);});
 this.text(34,677,this.message,15,'#eef1c1',405);
 }
 update(t:number){if(t-this.lastSave>=1000){this.save();this.lastSave=t;}if(this.notice&&t>=this.noticeUntil&&this.drag<0){this.notice='';this.paint();}}
}
new Phaser.Game({type:Phaser.AUTO,parent:'game',width:480*DENSITY,height:860*DENSITY,backgroundColor:'#153d37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Shop,render:{antialias:true}});
