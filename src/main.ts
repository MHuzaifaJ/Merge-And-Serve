import Phaser from 'phaser';
import {Kitchen,DECORATIONS,type DecorationCategory} from './model';
import './style.css';

// UI coordinates stay logical; canvas and text backing stores render at device density.
const DENSITY=Math.min(3,Math.max(2,Math.ceil(window.devicePixelRatio||1)));
const FONT='Lilita One, Trebuchet MS, Arial, sans-serif';
const ink='#183e37',menus=['Lunch Corner','Sweet Street'];
type Point={x:number;y:number};
type Rect=Point&{w:number;h:number};
type Panel='cream'|'wood'|'card'|'bubble'|'track'|'fill';
const inside=(p:Point,r:Rect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
const props:Record<string,number>={'wall-prop-clock':0,'wall-prop-picture':1,'prop-plant':2,'prop-flowers':3};
const ICON={coin:0,check:1,close:2,mute:3,unlock:4,shop:5,trophy:6,sparkle:7,empty:8};

class Shop extends Phaser.Scene{
 k=new Kitchen();ui!:Phaser.GameObjects.Container;fx!:Phaser.GameObjects.Container;
 selected=-1;drag=-1;moved=false;origin={x:0,y:0};ghost?:Phaser.GameObjects.Image;
 cells:Rect[]=[];orders:Rect[]=[];bin={x:392,y:369,w:65,h:65};
 message='';notice:''|'item'|'shop'|'finished'='';noticeUntil=0;panel=false;decorTab:DecorationCategory='wall';
 soundOn=true;audio?:AudioContext;lastSave=0;review=false;
 preload(){
  this.load.spritesheet('foods','art/food-v1.png',{frameWidth:256,frameHeight:256});
  this.load.spritesheet('people','art/customers-v1.png',{frameWidth:512,frameHeight:512});
  this.load.spritesheet('controls','art/controls-v2.png',{frameWidth:512,frameHeight:512});
  for(const [key,path] of Object.entries({'shop-wall':'shop-v1','board':'board-v2','wood':'wood-v2','panels':'panels-v3','icons':'icons-v3','props':'props-v3'}))this.load.image(key,`art/${path}.png`);
 }
 registerFrames(){
  this.textures.get('controls').add('green',0,0,620,512,300);
  this.textures.get('controls').add('gold',0,512,620,512,300);
  this.textures.get('shop-wall').add('swatch',0,40,300,400,400);this.textures.get('wood').add('swatch',0,200,250,500,500);
  const panels:Record<Panel,number[]>={cream:[16,112,480,336],wood:[528,108,480,340],card:[1040,112,480,336],bubble:[16,600,480,345],track:[526,697,484,135],fill:[1040,696,480,135]};
  for(const [key,[x,y,w,h]] of Object.entries(panels))this.textures.get('panels').add(key,0,x,y,w,h);
  for(const [key,n] of [['icons',3],['props',2]] as const){const t=this.textures.get(key),source=t.getSourceImage() as HTMLImageElement;
   for(let y=0;y<n;y++)for(let x=0;x<n;x++)t.add(y*n+x,0,Math.round(x*source.width/n),Math.round(y*source.height/n),Math.round((x+1)*source.width/n)-Math.round(x*source.width/n),Math.round((y+1)*source.height/n)-Math.round(y*source.height/n));}
 }
 create(){
  this.cameras.main.setZoom(DENSITY).centerOn(240,430);this.registerFrames();
  try{const saved=localStorage.getItem('merge-serve-v4')??localStorage.getItem('merge-serve-v3')??localStorage.getItem('merge-serve-v2');if(saved)this.k=Kitchen.restore(JSON.parse(saved));this.soundOn=localStorage.getItem('merge-serve-sound')!=='off';}catch{}
  // Review fixtures are stripped from production and never read or write a player's save.
  if(import.meta.env.DEV){const state=new URLSearchParams(location.search).get('review');if(state){this.review=true;this.k=new Kitchen();this.k.coins=900;this.k.owned=DECORATIONS.map(d=>d.id);
  this.k.level=12;this.k.completed=11;this.k.makeOrders();this.k.board=Array.from({length:9},(_,i)=>i<6?{type:i%3,level:1+Math.floor(i/3)}:null);
  this.k.equipped.wallProp='wall-prop-picture';this.k.equipped.counterProp='prop-plant';
  if(state.startsWith('decor-')){this.panel=true;this.decorTab=state.slice(6) as DecorationCategory;}
  if(state==='shop2'){this.k.shop=1;this.k.equipped.wallProp='wall-prop-clock';this.k.equipped.counterProp='prop-flowers';this.k.makeOrders();}
  if(state==='shopReady'||state==='finished'){this.k.level=20;this.k.completed=20;this.k.shopReady=state==='shopReady';this.k.finished=state==='finished';this.k.shop=state==='finished'?1:0;this.k.makeOrders();for(const c of this.k.customers){c.paid=true;for(const r of c.items)r.done=true;}}
  if(state==='unlock'){this.notice='item';this.noticeUntil=Number.POSITIVE_INFINITY;}
  if(state==='muted')this.soundOn=false;if(state==='purchase'||state==='poor'){this.k.owned=DECORATIONS.filter(d=>d.price===0).map(d=>d.id);this.k.equipped.wallProp='wall-prop-none';this.k.equipped.counterProp='prop-none';this.k.coins=state==='poor'?0:200;}
 
  }
  }
  this.ui=this.add.container(0,0);this.fx=this.add.container(0,0).setDepth(20);
  this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{const p=this.logical(pointer);if(this.panel||this.k.shopReady||this.k.finished)return;const i=this.cells.findIndex(r=>inside(p,r));if(i<0||!this.k.board[i])return;this.drag=i;this.origin={x:p.x,y:p.y};this.moved=false;});
  this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{const p=this.logical(pointer);if(this.drag<0)return;const started=!this.moved&&Phaser.Math.Distance.Between(p.x,p.y,this.origin.x,this.origin.y)>10;this.moved ||= started;if(started)this.paint();const item=this.k.board[this.drag];if(this.moved&&item){if(!this.ghost)this.ghost=this.add.image(p.x,p.y,'foods',this.frame(item.type,item.level)).setDisplaySize(100,100).setDepth(50);this.ghost.setPosition(p.x,p.y-20);}});
  this.input.on('pointerup',(p:Phaser.Input.Pointer)=>this.up(this.logical(p)));this.input.on('pointerupoutside',()=>this.cancel());
  window.addEventListener('blur',()=>{this.cancel();this.save();});window.addEventListener('pagehide',()=>this.save());document.addEventListener('visibilitychange',()=>{if(document.hidden){this.cancel();this.save();}});
  this.paint();this.save();document.getElementById('loading')?.remove();
 }

 logical(p:Phaser.Input.Pointer){return this.cameras.main.getWorldPoint(p.x,p.y);}
 frame(type:number,level:number){return this.k.shop*12+type*4+level-1;}
 art(key:string,x:number,y:number,w:number,h:number,frame?:number|string){const image=this.add.image(x,y,key,frame??'__BASE').setDisplaySize(w,h);this.ui.add(image);return image;}
 surface(r:Rect,frame:Panel='cream',scale=.25){
  // Nine-slicing preserves painted borders on large dialogs and small cards alike.
  const border=frame==='track'||frame==='fill'?64:84;
  if(this.game.renderer.type!==Phaser.WEBGL)return this.art('panels',r.x+r.w/2,r.y+r.h/2,r.w,r.h,frame);
  const image=this.add.nineslice(r.x+r.w/2,r.y+r.h/2,'panels',frame,r.w/scale,r.h/scale,border,border,border,border).setScale(scale);this.ui.add(image);return image;
 }
 icon(x:number,y:number,key:keyof typeof ICON,size=32){return this.art('icons',x,y,size,size,ICON[key]);}
 text(x:number,y:number,s:string,size=17,c=ink,width?:number){const t=this.add.text(x,y,s,{fontFamily:FONT,fontSize:size,fontStyle:'normal',color:c,wordWrap:width?{width,useAdvancedWrap:true}:undefined}).setResolution(DENSITY);this.ui.add(t);return t;}
 buttonSurface(r:Rect,active=false){const frame=active?'gold':'green',scale=.16;
  if(this.game.renderer.type!==Phaser.WEBGL)return this.art('controls',r.x+r.w/2,r.y+r.h/2,r.w,r.h,frame);
  const image=this.add.nineslice(r.x+r.w/2,r.y+r.h/2,'controls',frame,r.w/scale,r.h/scale,120,120,96,96).setScale(scale);this.ui.add(image);return image;
 }
 button(r:Rect,label:string,fn:()=>void,active=false,size=17){this.buttonSurface(r,active);this.text(r.x+r.w/2,r.y+r.h/2,label,size).setOrigin(.5);this.hit(r,fn);}
 hit(r:Rect,fn:()=>void){const z=this.add.zone(r.x,r.y,r.w,r.h).setOrigin(0).setInteractive({useHandCursor:true});this.ui.add(z);z.on('pointerup',()=>{if(this.drag<0)fn();});}
 control(r:Rect,frame:number,fn:()=>void){this.art('controls',r.x+r.w/2,r.y+r.h/2,r.w,r.h,frame);this.hit(r,fn);}
 food(x:number,y:number,type:number,level:number,size:number){return this.art('foods',x,y,size,size,this.frame(type,level));}
 price(x:number,y:number,amount:number,size=20){this.icon(x-24,y,'coin',size+12);this.text(x-6,y,amount.toLocaleString(),size).setOrigin(0,.5);}
 save(){if(this.review)return;try{localStorage.setItem('merge-serve-v4',JSON.stringify(this.k.snapshot()));}catch{}}
 cancel(){this.drag=-1;this.moved=false;this.ghost?.destroy();this.ghost=undefined;}
 tone(kind:'buy'|'merge'|'serve'|'error'|'bin'){if(!this.soundOn)return;try{this.audio??=new AudioContext();void this.audio.resume();const ctx=this.audio;({buy:[440],merge:[520,780],serve:[523,659,784],error:[170],bin:[240,150]}[kind]).forEach((f,i)=>{const osc=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.09;osc.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.13);osc.connect(g);g.connect(ctx.destination);osc.start(t);osc.stop(t+.15);});}catch{}}
 note(s:string,error=false){this.message=s;if(error){this.tone('error');this.cameras.main.shake(90,.002);}this.save();this.paint();}
 pop(amount:number,x:number,y:number){const group=this.add.container(x,y);const coin=this.add.image(-30,0,'icons',ICON.coin).setDisplaySize(34,34),t=this.add.text(-9,0,`+${amount}`,{fontSize:'23px',fontFamily:FONT,fontStyle:'normal',color:ink,stroke:'#fffcf3',strokeThickness:4}).setResolution(DENSITY).setOrigin(0,.5);group.add([coin,t]);this.fx.add(group);this.tweens.add({targets:group,y:y-35,alpha:0,duration:850,onComplete:()=>group.destroy()});}
 up(p:Point){const from=this.drag,moved=this.moved;this.cancel();if(this.panel||this.k.shopReady||this.k.finished)return;if(moved&&from>=0){if(inside(p,this.bin))this.discard(from);else{const c=this.orders.findIndex(r=>inside(p,r));if(c>=0)this.deliver(from,c);else{const to=this.cells.findIndex(r=>inside(p,r));if(to>=0)this.move(from,to);}}return;}const i=this.cells.findIndex(r=>inside(p,r));if(i<0)return;if(this.selected>=0&&i!==this.selected)this.move(this.selected,i);else{this.selected=this.selected===i?-1:(this.k.board[i]?i:-1);this.paint();}}
 move(a:number,b:number){const merged=!!this.k.board[b];this.selected=-1;if(!this.k.move(a,b)){this.note('',true);return;}this.note('');if(merged){this.tone('merge');const r=this.cells[b],sparkle=this.add.image(r.x+r.w/2,r.y+r.h/2,'icons',ICON.sparkle).setDisplaySize(92,92);this.fx.add(sparkle);this.tweens.add({targets:sparkle,scaleX:sparkle.scaleX*1.35,scaleY:sparkle.scaleY*1.35,alpha:0,duration:380,onComplete:()=>sparkle.destroy()});}}
 discard(i:number){if(!this.k.bin(i))return;this.selected=-1;this.tone('bin');this.note('');}
 deliver(i:number,c:number){const before=this.k.unlocked,result=this.k.deliver(i,c);if(!result.accepted){this.note('',true);return;}this.selected=-1;this.tone('serve');if(result.levelUp){if(this.k.unlocked>before)this.announce('item');else if(this.k.shopReady)this.announce('shop');else if(this.k.finished)this.announce('finished');}this.save();this.paint();if(result.payment)this.pop(result.payment,365,90);}
 announce(kind:'item'|'shop'|'finished'){this.notice=kind;this.noticeUntil=this.time.now+2600;}
 buy(type:number){if(type>=this.k.unlocked)return;if(!this.k.addItem(type)){this.note('',true);return;}this.tone('buy');this.note('');}
 paint(){this.ui.removeAll(true);const k=this.k;
  this.surface({x:0,y:0,w:480,h:85});this.shopScene();
  const sound={x:8,y:8,w:62,h:62};if(this.soundOn)this.control(sound,0,()=>this.toggleSound());else{this.icon(39,39,'mute',62);this.hit(sound,()=>this.toggleSound());}
  const m=k.milestone;this.surface({x:82,y:17,w:208,h:43},'track');
  if(k.progress>0){const width=196*Math.min(1,k.progress);this.surface({x:88,y:23,w:width,h:31},'fill',Math.min(.23,width/128));}
  this.text(169,37,`${Math.max(0,k.completed-m.start)}/${m.end-m.start}`,27).setOrigin(.5).setStroke('#fff8df',3);
  if(k.completed<10)this.food(269,36,k.completed<5?1:2,1,48);else this.icon(269,36,k.finished?'trophy':'shop',43);
  this.text(177,68,`${k.level}`,12).setOrigin(.5);
  this.surface({x:304,y:15,w:165,h:48});this.icon(329,39,'coin',40);this.text(395,39,k.coins.toLocaleString(),25).setOrigin(.5);
  this.art('board',239,580,410,405);this.cells=[];
  for(let i=0;i<9;i++){const r={x:80+i%3*106,y:432+Math.floor(i/3)*102,w:100,h:95};this.cells.push(r);const item=k.board[i];if(this.selected===i)this.surface(r,'card').setTint(0xe8f5a0).setAlpha(.65);if(item)this.food(r.x+50,r.y+47,item.type,item.level,107);}
  this.control(this.bin,1,()=>this.discard(this.selected));this.control({x:396,y:727,w:68,h:68},2,()=>{this.cancel();this.panel=true;this.message='';this.paint();});
  [1,0,2].forEach((type,pos)=>{const r={x:17+pos*154,y:774,w:138,h:78},locked=type>=k.unlocked;this.buttonSurface(r,!locked);this.hit(r,()=>this.buy(type));if(locked)this.art('controls',r.x+r.w/2,r.y+r.h/2,64,64,5);else this.food(r.x+r.w/2,r.y+r.h/2,type,1,90);});
  if(this.notice&&this.time.now<this.noticeUntil&&!k.shopReady&&!k.finished){this.surface({x:152,y:687,w:176,h:58},'wood');this.icon(196,716,'unlock',42);if(this.notice==='item')this.food(262,716,Math.max(1,k.unlocked-1),1,52);else this.icon(262,716,this.notice==='shop'?'shop':'trophy',46);}
  if(k.shopReady||k.finished)this.completionPanel();if(this.panel)this.decorationPanel();
 }
 toggleSound(){this.soundOn=!this.soundOn;if(!this.review)try{localStorage.setItem('merge-serve-sound',this.soundOn?'on':'off');}catch{}if(this.soundOn)this.tone('buy');this.paint();}
 shopScene(){const k=this.k,wallImage=this.art('shop-wall',240,220,480,280);if(k.decoration('wall').id!=='wall-classic')wallImage.setTint(k.decoration('wall').color);
  this.text(240,127,menus[k.shop],25,'#49301d').setOrigin(.5);
  const wallProp=props[k.equipped.wallProp];if(wallProp!==undefined)this.art('props',451,214,58,80,wallProp);
  const n=k.customers.length,cw=n===3?128:150,gap=n===3?10:22,total=cw*n+gap*(n-1),start=(430-total)/2;this.orders=[];
  k.customers.forEach((customer,i)=>{const r={x:start+i*(cw+gap),y:153,w:cw,h:100},cx=r.x+cw/2;this.orders.push(r);
   if(!customer.paid)this.art('people',cx,299,n===3?155:174,n===3?155:174,(k.level+i+k.shop)%6);
   const bubble=this.art('panels',cx,204,cw+4,107,'bubble');if(customer.paid)bubble.setTint(0xe3efca);
   const iw=Math.min(70,(cw-12)/customer.items.length),total=iw*customer.items.length;
   if(customer.paid)this.icon(cx,195,'check',46);else customer.items.forEach((item,j)=>{const x=r.x+(cw-total)/2+j*iw+iw/2,icon=this.food(x,195,item.type,item.level,Math.min(72,iw));if(item.done){icon.setAlpha(.25);this.icon(x,195,'check',30);}});
   this.hit(r,()=>{if(!this.panel)this.deliver(this.selected,i);});});
  const counter=this.art('wood',240,602,480,516);if(k.decoration('counter').id!=='counter-classic')counter.setTint(k.decoration('counter').color);
  const prop=props[k.equipped.counterProp];if(prop!==undefined)this.art('props',448,316,76,76,prop);
 }
 completionPanel(){const k=this.k;this.surface({x:28,y:145,w:424,h:188},'wood');this.icon(85,201,k.shopReady?'shop':'trophy',72);this.text(262,182,k.shopReady?'SHOP 2 UNLOCKED':'BOTH SHOPS MASTERED',20).setOrigin(.5);
  this.text(141,211,k.shopReady?'Coins and decorations carry over.':'All orders complete. Progress saved.',14,ink,280);
  if(k.shopReady)this.button({x:110,y:266,w:260,h:45},'OPEN NEXT SHOP',()=>{k.openShop();this.selected=-1;this.note('');},true,17);else this.icon(240,281,'sparkle',54);
 }
 decorationPreview(id:string,x:number,y:number,size:number){const d=DECORATIONS.find(d=>d.id===id)!;
  if(d.category==='wall'||d.category==='counter'){this.surface({x:x-size/2,y:y-size/2,w:size,h:size},'wood',.12);const image=this.art(d.category==='wall'?'shop-wall':'wood',x,y,size-22,size-22,'swatch');if(d.id!=='wall-classic'&&d.id!=='counter-classic')image.setTint(d.color);}
  else if(props[id]!==undefined)this.art('props',x,y,size,size,props[id]);else this.icon(x,y,'empty',size);
 }
 decorationPanel(){const k=this.k;
  this.surface({x:0,y:0,w:480,h:860},'card').setTint(0x224e42).setAlpha(.72);const shield=this.add.zone(0,0,480,860).setOrigin(0).setInteractive();this.ui.add(shield);
  this.surface({x:15,y:105,w:450,h:670},'wood');this.text(240,143,'DECORATIONS',26).setOrigin(.5);
  this.icon(423,140,'close',43);this.hit({x:400,y:117,w:46,h:46},()=>{this.panel=false;this.paint();});
  const tabs=[['wall','Wall'],['counter','Counter'],['wallProp','Wall slot'],['counterProp','Counter slot']] as const;
  tabs.forEach(([category,label],i)=>this.button({x:30+i*105,y:184,w:99,h:45},label,()=>{this.decorTab=category;this.message='';this.paint();},this.decorTab===category,13));
  DECORATIONS.filter(d=>d.category===this.decorTab).forEach((d,i)=>{const y=250+i*110,owned=k.owned.includes(d.id),equipped=k.equipped[d.category]===d.id;
   this.surface({x:30,y,w:420,h:98},equipped?'card':'cream');this.decorationPreview(d.id,72,y+49,66);this.text(120,y+29,d.name,15,ink,160);
   const r={x:292,y:y+29,w:143,h:43};this.button(r,owned&&!equipped?'Equip':'',()=>{if(equipped)return;const ok=owned?k.equipDecoration(d.id):k.purchaseDecoration(d.id);if(!ok){this.note('Not enough coins. Complete orders to earn more.',true);return;}this.tone('merge');this.note('');},equipped,14);
   if(equipped)this.icon(r.x+r.w/2,y+50,'check',34);else if(!owned)this.price(r.x+r.w/2-1,y+50,d.price,17);
  });
  if(this.message){this.surface({x:34,y:674,w:412,h:65});this.text(51,687,this.message,14,ink,375);}
 }
 update(t:number){if(t-this.lastSave>=1000){this.save();this.lastSave=t;}if(this.notice&&t>=this.noticeUntil&&this.drag<0){this.notice='';this.paint();}}
}
// Wait for the bundled display font before Phaser creates canvas text textures.
document.fonts.load('24px "Lilita One"').catch(()=>[]).then(()=>new Phaser.Game({type:Phaser.AUTO,parent:'game',width:480*DENSITY,height:860*DENSITY,backgroundColor:'#153d37',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Shop,render:{antialias:true}}));
