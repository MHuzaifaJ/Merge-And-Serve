import Phaser from 'phaser';
import {Kitchen,DECORATIONS,type DecorationCategory} from './model';
import './style.css';
import sliceLayout from './slice-layout.json';
import {BOARD,BIN,contains as inside,boardCell,spawnerRect,buttonIconSize,orderIconCenters,customerDialog,servingCustomer,type Point,type Rect,type ServeTarget} from './layout';
type Insets={left:number;right:number;top:number;bottom:number};
const SLICES=sliceLayout as {atlases:Record<string,{image:string;data:string;insets?:Record<string,Insets>}>};

// UI coordinates stay logical; canvas and text backing stores render at device density.
const DENSITY=Math.min(3,Math.max(2,Math.ceil(window.devicePixelRatio||1)));
const FONT='Lilita One, Trebuchet MS, Arial, sans-serif';
const ink='#183e37';
type Panel='cream'|'wood'|'card'|'bubble'|'track'|'fill';
const ICON={coin:0,check:1,close:2,mute:3,unlock:4,shop:5,trophy:6,sparkle:7,empty:8};

class Shop extends Phaser.Scene{
 k=new Kitchen();ui!:Phaser.GameObjects.Container;fx!:Phaser.GameObjects.Container;
 drag=-1;moved=false;origin={x:0,y:0};ghost?:Phaser.GameObjects.Image;
 cells:Rect[]=[];orders:(ServeTarget&{customerIndex:number})[]=[];bin=BIN;binArt?:Phaser.GameObjects.Image;
 message='';panel=false;resetConfirm=false;hintObjects:Phaser.GameObjects.GameObject[]=[];decorTab:DecorationCategory='wall';
 soundOn=true;audio?:AudioContext;lastSave=0;review=false;
 preload(){
  for(const [key,atlas] of Object.entries(SLICES.atlases))this.load.atlas(key,atlas.image,atlas.data);
  this.load.image('board','art/board-v2.png');this.load.svg('tutorial-hand','art/tutorial-hand.svg',{width:128,height:160});
 }
 create(){
  this.cameras.main.setZoom(DENSITY).centerOn(240,430);const [x,y,X,Y]=sliceLayout.boardFrame;this.textures.get('board').add('visible',0,x,y,X-x,Y-y);
  try{const saved=localStorage.getItem('merge-serve-v6')??localStorage.getItem('merge-serve-v5')??localStorage.getItem('merge-serve-v4')??localStorage.getItem('merge-serve-v3')??localStorage.getItem('merge-serve-v2');if(saved)this.k=Kitchen.restore(JSON.parse(saved));else this.k=Kitchen.newPlayer();this.soundOn=localStorage.getItem('merge-serve-sound')!=='off';}catch{}
  // Review fixtures are stripped from production and never read or write a player's save.
  if(import.meta.env.DEV){const state=new URLSearchParams(location.search).get('review');if(state){this.review=true;this.k=new Kitchen(42);this.k.coins=900;this.k.owned=DECORATIONS.map(d=>d.id);
   this.k.groupsCompleted=20;this.k.makeOrders();this.k.board=Array.from({length:9},(_,i)=>i<6?{type:i%3,level:1+Math.floor(i/3)}:null);
   this.k.customers=Array.from({length:3},(_,i)=>{const items=Array.from({length:3},(_,j)=>({type:(i+j)%3,level:1+(j%2),done:false}));return {portrait:i,items,payment:items.reduce((sum,r)=>sum+30*2**(r.level-1),0),paid:false};});
   if(state.startsWith('theme-')){const n=Number(state.slice(6));for(const category of ['wall','counter','nameplate'] as const)this.k.equipped[category]=DECORATIONS.find(d=>d.category===category&&d.asset===n)!.id;}
   if(state.startsWith('decor-')){this.panel=true;this.decorTab=state.slice(6) as DecorationCategory;}
   if(state==='single'){this.k.customers=this.k.customers.slice(0,1);this.k.customers[0].items=this.k.customers[0].items.slice(0,1);this.k.customers[0].payment=30;}
   if(state==='paid'){const c=this.k.customers[0];c.items.forEach(r=>r.done=true);c.paid=true;}
   if(state==='muted')this.soundOn=false;
   if(state==='purchase'||state==='poor'){this.k.owned=DECORATIONS.filter(d=>d.price===0).map(d=>d.id);this.k.coins=state==='poor'?0:200;}
  }}
  this.ui=this.add.container(0,0);this.fx=this.add.container(0,0).setDepth(20);
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const p=this.logical(pointer);if(this.panel)return;const i=this.cells.findIndex(r=>inside(p,r));const action=this.k.tutorialAction;if(i<0||!this.k.board[i]||action&&(action.kind==='generate'||action.from!==i))return;this.drag=i;this.origin={x:p.x,y:p.y};this.moved=false;});
  this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{const p=this.logical(pointer);if(this.drag<0)return;const started=!this.moved&&Phaser.Math.Distance.Between(p.x,p.y,this.origin.x,this.origin.y)>10;this.moved ||= started;if(started)this.paint();const item=this.k.board[this.drag];if(this.moved&&item){if(!this.ghost)this.ghost=this.add.image(p.x,p.y,'foods',this.frame(item.type,item.level)).setDisplaySize(100,100).setDepth(50);this.ghost.setPosition(p.x,p.y-20);this.binArt?.setTint(inside(p,BIN)?0xffe4a3:0xffffff);}});
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.up(this.logical(p)));this.input.on('pointerupoutside',()=>this.cancel());
  window.addEventListener('blur',()=>{this.cancel();this.save();});window.addEventListener('pagehide',()=>this.save());document.addEventListener('visibilitychange',()=>{if(document.hidden){this.cancel();this.save();}});
  this.paint();this.save();document.getElementById('loading')?.remove();
 }

 logical(p:Phaser.Input.Pointer){return this.cameras.main.getWorldPoint(p.x,p.y);}
 frame(type:number,level:number){return type*4+level-1;}
 art(key:string,x:number,y:number,w:number,h:number,frame?:number|string){const image=this.add.image(x,y,key,frame??'__BASE').setDisplaySize(w,h).setOrigin(.5);this.ui.add(image);return image;}
 slicedSurface(key:string,frame:string,r:Rect,requestedScale:number){
  const c=SLICES.atlases[key].insets?.[frame];
  if(!c||this.game.renderer.type!==Phaser.WEBGL)return this.art(key,r.x+r.w/2,r.y+r.h/2,r.w,r.h,frame);
  // Clamp cap scale at tiny progress values so neither source nor destination slices invert.
  const scale=Math.min(requestedScale,r.w/(c.left+c.right),r.h/(c.top+c.bottom));
  const image=this.add.nineslice(r.x+r.w/2,r.y+r.h/2,key,frame,r.w/scale,r.h/scale,c.left,c.right,c.top,c.bottom).setScale(scale);this.ui.add(image);return image;
 }
 surface(r:Rect,frame:Panel='cream',scale=.25){return this.slicedSurface('panels',frame,r,scale);}

 icon(x:number,y:number,key:keyof typeof ICON,size=32){return this.art('icons',x,y,size,size,ICON[key]);}
 text(x:number,y:number,s:string,size=17,c=ink,width?:number){const t=this.add.text(x,y,s,{fontFamily:FONT,fontSize:size,fontStyle:'normal',color:c,wordWrap:width?{width,useAdvancedWrap:true}:undefined}).setResolution(DENSITY);this.ui.add(t);return t;}
 buttonSurface(r:Rect,active=false){return this.slicedSurface('controls',active?'gold':'green',r,.16);}
 button(r:Rect,label:string,fn:()=>void,active=false,size=17){this.buttonSurface(r,active);this.text(r.x+r.w/2,r.y+r.h/2,label,size).setOrigin(.5);this.hit(r,fn);}
 hit(r:Rect,fn:()=>void,tutorialAllowed=false){const z=this.add.zone(r.x,r.y,r.w,r.h).setOrigin(0).setInteractive({useHandCursor:true});this.ui.add(z);z.on('pointerup',()=>{if(this.drag<0&&(!this.k.tutorialAction||tutorialAllowed))fn();});}
 control(r:Rect,frame:number,fn:()=>void){this.art('controls',r.x+r.w/2,r.y+r.h/2,r.w,r.h,frame);this.hit(r,fn);}
 food(x:number,y:number,type:number,level:number,size:number){return this.art('foods',x,y,size,size,this.frame(type,level));}
 price(x:number,y:number,amount:number,size=20){this.icon(x-24,y,'coin',size+12);this.text(x-6,y,amount.toLocaleString(),size).setOrigin(0,.5);}
 save(){if(this.review)return;try{localStorage.setItem('merge-serve-v6',JSON.stringify(this.k.snapshot()));}catch{}}
 cancel(){this.binArt?.clearTint();this.drag=-1;this.moved=false;this.ghost?.destroy();this.ghost=undefined;}
 tone(kind:'buy'|'merge'|'serve'|'error'|'bin'){if(!this.soundOn)return;try{this.audio??=new AudioContext();void this.audio.resume();const ctx=this.audio;({buy:[440],merge:[520,780],serve:[523,659,784],error:[170],bin:[240,150]}[kind]).forEach((f,i)=>{const osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.09;osc.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.13);osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.15);});}catch{}}
 note(s:string,error=false){this.message=s;if(error)this.tone('error');this.save();this.paint();}
 pop(amount:number,x:number,y:number){const group=this.add.container(x,y);const coin=this.add.image(-30,0,'icons',ICON.coin).setDisplaySize(34,34),t=this.add.text(-9,0,`+${amount}`,{fontSize:'23px',fontFamily:FONT,fontStyle:'normal',color:ink,stroke:'#fffcf3',strokeThickness:4}).setResolution(DENSITY).setOrigin(0,.5);group.add([coin,t]);this.fx.add(group);this.tweens.add({targets:group,y:y-35,alpha:0,duration:850,onComplete:()=>group.destroy()});}
 up(p:Point){const from=this.drag,moved=this.moved;this.cancel();if(this.panel||!moved||from<0)return;if(inside(p,this.bin))this.discard(from);else{const c=servingCustomer(p,this.orders);if(c>=0)this.deliver(from,this.orders[c].customerIndex);else{const to=this.cells.findIndex(r=>inside(p,r));if(to>=0)this.move(from,to);}}}
 move(a:number,b:number){const source=this.k.board[a],target=this.k.board[b],merged=!!source&&!!target&&source.type===target.type&&source.level===target.level&&source.level<4;if(!this.k.move(a,b)){this.note('',true);return;}this.note('');if(merged){this.tone('merge');const r=this.cells[b],sparkle=this.add.image(r.x+r.w/2,r.y+r.h/2,'icons',ICON.sparkle).setDisplaySize(92,92);this.fx.add(sparkle);this.tweens.add({targets:sparkle,scaleX:sparkle.scaleX*1.35,scaleY:sparkle.scaleY*1.35,alpha:0,duration:380,onComplete:()=>sparkle.destroy()});}}
 discard(i:number){if(!this.k.bin(i))return;this.tone('bin');this.note('');}
 deliver(i:number,c:number){const result=this.k.deliver(i,c);if(!result.accepted){this.note('',true);return;}this.tone('serve');this.save();this.paint();if(result.payment)this.pop(result.payment,365,90);}
 buy(type:number){if(!this.k.addItem(type)){this.note('',true);return;}this.tone('buy');this.note('');}
 paint(){for(const object of this.hintObjects)this.tweens.killTweensOf(object);this.hintObjects=[];this.ui.removeAll(true);const k=this.k;
  if(import.meta.env.DEV){const page=new URLSearchParams(location.search).get('review');if(page?.startsWith('atlas-')){
   this.surface({x:0,y:0,w:480,h:860});this.text(240,52,'SLICE REVIEW',28).setOrigin(.5);
   const group=page==='atlas-icons'?'icons':page==='atlas-controls'?'controls':page==='atlas-people'?'people':page==='atlas-walls'?'walls':page==='atlas-counters'?'counters':page==='atlas-nameplates'?'nameplates':'foods';
   const offset=0,total=group==='foods'?12:group==='icons'?9:['walls','counters','nameplates'].includes(group)?4:6,cols=group==='people'||['walls','counters','nameplates'].includes(group)?2:4;
   for(let i=0;i<total;i++){const x=cols===2?130+i%2*220:70+i%4*112,y=165+Math.floor(i/cols)*(cols===2?210:185),size=cols===2?155:96;
    this.surface({x:x-size/2-3,y:y-size/2-8,w:size+6,h:size+35},i%2?'card':'cream');
    const preview=this.art(group,x,y,size,size,i+offset).setOrigin(.5);if(group==='nameplates')preview.setScale(Math.min(size/preview.width,size/preview.height));this.text(x,y+size/2+14,`${group} ${i+offset}`,13).setOrigin(.5);
   }return;
  }}
  this.surface({x:0,y:0,w:480,h:85});this.shopScene();
  const sound={x:8,y:8,w:62,h:62};if(this.soundOn)this.control(sound,0,()=>this.toggleSound());else{this.icon(39,39,'mute',62);this.hit(sound,()=>this.toggleSound());}
  this.surface({x:304,y:15,w:165,h:48});this.icon(329,39,'coin',40);this.text(395,39,k.coins.toLocaleString(),25).setOrigin(.5);
  this.art('board',BOARD.x+BOARD.w/2,BOARD.y+BOARD.h/2,BOARD.w,BOARD.h,'visible');this.cells=[];
  for(let i=0;i<9;i++){const r=boardCell(i);this.cells.push(r);const item=k.board[i];if(item)this.food(r.x+r.w/2,r.y+r.h/2,item.type,item.level,74);}
  this.binArt=this.art('binzone',BIN.x+BIN.w/2,BIN.y+BIN.h/2,BIN.w,BIN.h,0);this.art('controls',BIN.x+BIN.w/2,BIN.y+BIN.h/2,50,50,1);
  this.control({x:76,y:8,w:62,h:62},2,()=>{this.cancel();this.panel=true;this.message='';this.paint();});
  [0,1,2].forEach(type=>{const r=spawnerRect(type);this.buttonSurface(r,true);this.hit(r,()=>this.buy(type),true);this.food(r.x+r.w/2,r.y+r.h/2,type,1,buttonIconSize(r));});
  if(this.panel)this.decorationPanel();
  if(this.k.tutorialAction)this.tutorialHint();
 }
 toggleSound(){this.soundOn=!this.soundOn;if(!this.review)try{localStorage.setItem('merge-serve-sound',this.soundOn?'on':'off');}catch{}if(this.soundOn)this.tone('buy');this.paint();}
 shopScene(){const k=this.k;this.art('walls',240,220,480,280,k.decoration('wall').asset);
  const plate=k.decoration('nameplate');this.slicedSurface('nameplates',String(plate.asset),{x:100,y:85,w:280,h:64},.25);
  this.text(240,117,'Lunch Corner',25,plate.asset>=2?'#fff4dc':ink).setOrigin(.5);
  const n=k.customers.length;this.orders=[];
  k.customers.forEach((customer,i)=>{if(customer.paid)return;const r=customerDialog(n,i),cx=r.x+r.w/2,size=n===3?155:174;
   const body={x:cx-size/2,y:299-size/2,w:size,h:344-(299-size/2)};this.orders.push({dialog:r,body,cx,customerIndex:i});
   this.art('people',cx,299,size,size,customer.portrait);
   this.art('panels',cx,204,r.w+4,107,'bubble');
   const positions=orderIconCenters(cx,customer.items.length);customer.items.forEach((item,j)=>{const p=positions[j],icon=this.food(p.x,p.y,item.type,item.level,p.size);if(item.done){icon.setAlpha(.25);this.icon(p.x,p.y,'check',30);}});
  });
  this.art('counters',240,602,480,516,k.decoration('counter').asset);
 }
 decorationPreview(id:string,x:number,y:number,size:number){const d=DECORATIONS.find(d=>d.id===id)!;
  if(d.category==='nameplate'){const image=this.art('nameplates',x,y,size,size*.5,d.asset);image.setScale(Math.min(size/image.width,size*.5/image.height));}
  else {this.surface({x:x-size/2,y:y-size/2,w:size,h:size},'wood',.12);this.art('swatches',x,y,size-22,size-22,`${d.category}-${d.asset}`);}
 }
 decorationPanel(){const k=this.k;
  this.surface({x:0,y:0,w:480,h:860},'card').setTint(0x224e42).setAlpha(.72);const shield=this.add.zone(0,0,480,860).setOrigin(0).setInteractive();this.ui.add(shield);
  this.surface({x:15,y:105,w:450,h:670},'wood');this.text(240,143,'DECORATIONS',26).setOrigin(.5);
  this.icon(423,140,'close',43);this.hit({x:400,y:117,w:46,h:46},()=>{this.panel=false;this.paint();});
  const tabs=[['wall','Walls'],['counter','Counters'],['nameplate','Nameplates']] as const;
  tabs.forEach(([category,label],i)=>this.button({x:32+i*136,y:184,w:128,h:45},label,()=>{this.decorTab=category;this.message='';this.paint();},this.decorTab===category,15));
  DECORATIONS.filter(d=>d.category===this.decorTab).forEach((d,i)=>{const y=235+i*104,owned=k.owned.includes(d.id),equipped=k.equipped[d.category]===d.id;
   this.surface({x:30,y,w:420,h:88},equipped?'card':'cream');this.decorationPreview(d.id,70,y+44,58);this.text(112,y+26,d.name,15,ink,166);
   const r={x:292,y:y+24,w:143,h:40};this.button(r,owned&&!equipped?'Equip':'',()=>{if(equipped)return;const ok=owned?k.equipDecoration(d.id):k.purchaseDecoration(d.id);if(!ok){this.note('Not enough coins. Complete orders to earn more.',true);return;}this.tone('merge');this.note('');},equipped,14);
   if(equipped)this.icon(r.x+r.w/2,y+44,'check',34);else if(!owned)this.price(r.x+r.w/2-1,y+44,d.price,17);
  });
  if(this.message){this.surface({x:34,y:654,w:412,h:45});this.text(51,660,this.message,14,ink,375);}
  this.button({x:140,y:710,w:200,h:44},'Reset Game',()=>{this.resetConfirm=true;this.paint();},false,18);
  if(this.resetConfirm){
   this.surface({x:0,y:0,w:480,h:860},'card').setTint(0x224e42).setAlpha(.8);this.ui.add(this.add.zone(0,0,480,860).setOrigin(0).setInteractive());
   this.surface({x:40,y:310,w:400,h:230});this.text(240,350,'Reset all progress?',25).setOrigin(.5);
   this.text(240,397,'Your shop and tutorial will start over.',16).setOrigin(.5);
   this.button({x:65,y:456,w:160,h:48},'Cancel',()=>{this.resetConfirm=false;this.paint();});
   this.button({x:255,y:456,w:160,h:48},'Reset',()=>this.resetGame(),true);
  }
 }
 resetGame(){
  this.cancel();this.fx.removeAll(true);this.panel=false;this.resetConfirm=false;this.message='';this.decorTab='wall';
  if(!this.review)try{for(const key of ['merge-serve-v2','merge-serve-v3','merge-serve-v4','merge-serve-v5','merge-serve-v6','merge-serve-sound'])localStorage.removeItem(key);}catch{}
  this.soundOn=true;this.k=Kitchen.newPlayer();this.save();this.paint();
 }
 tutorialHint(){const action=this.k.tutorialAction;if(!action)return;
  const center=(r:Rect)=>({x:r.x+r.w/2,y:r.y+r.h/2});
  const source=action.kind==='generate'?spawnerRect(action.type):boardCell(action.from);
  const target=action.kind==='merge'?boardCell(action.to):action.kind==='serve'?customerDialog(3,action.customer):source;
  const start=center(source),end=center(target);if(action.kind==='generate')start.y-=34;
  const hand=this.art('tutorial-hand',start.x,start.y,54,68).setOrigin(.25,.0625);this.hintObjects.push(hand);
  if(action.kind==='generate')this.tweens.add({targets:hand,y:start.y+12,scaleX:hand.scaleX*.9,scaleY:hand.scaleY*.9,duration:500,yoyo:true,repeat:-1});
  else this.tweens.add({targets:hand,x:end.x,y:end.y,duration:1100,hold:250,repeatDelay:450,repeat:-1});
 }
 update(t:number){if(t-this.lastSave>=1000){this.save();this.lastSave=t;}}
}
// Wait for the bundled display font before Phaser creates canvas text textures.
document.fonts.load('24px "Lilita One"').catch(()=>[]).then(()=>new Phaser.Game({type:Phaser.AUTO,parent:'game',width:480*DENSITY,height:860*DENSITY,backgroundColor:'#153d37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Shop,render:{antialias:true}}));
