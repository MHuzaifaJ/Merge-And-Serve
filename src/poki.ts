import type PokiSDK from '@poki/sdk';

export type PokiAPI=Pick<typeof PokiSDK,'init'|'enableEventTracking'|'gameLoadingFinished'|'gameplayStart'|'gameplayStop'|'measure'>;
export type Measurement=readonly [category:string,what:string,action:string];
export type PokiLoader=(signal:AbortSignal)=>Promise<PokiAPI>;

/** Keeps the game independent of SDK availability and coalesces lifecycle transitions. */
export class PokiBridge {
 status:'disabled'|'loading'|'ready'|'degraded'|'unavailable';
 private sdk?:PokiAPI;
 private initialization?:Promise<void>;
 private loaded=false;
 private loadingReported=false;
 private playing=false;
 private playingReported=false;
 private pending:Measurement[]=[];
 constructor(enabled:boolean){this.status=enabled?'loading':'disabled';}
 initialize(loader:PokiLoader,timeoutMs=8000):Promise<void>{
  if(this.initialization)return this.initialization;
  if(this.status==='disabled')return Promise.resolve();
  const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Poki SDK initialization timed out'));},timeoutMs);});
  const initialize=Promise.resolve().then(()=>loader(controller.signal)).then(async sdk=>{
   if(controller.signal.aborted)return;
   let initialized=true;
   try{await sdk.init();}catch{initialized=false;}
   if(controller.signal.aborted)return;
   this.sdk=sdk;this.status=initialized?'ready':'degraded';this.call(()=>sdk.enableEventTracking());this.flush();
  });
  this.initialization=Promise.race([initialize,timeout]).catch(()=>{
   controller.abort();this.status='unavailable';this.sdk=undefined;this.pending=[];
  }).finally(()=>clearTimeout(timer));
  return this.initialization;
 }
 loadingFinished(){this.loaded=true;this.flush();}
 setPlaying(playing:boolean){this.playing=playing;this.flush();}
 measure(category:string,what:string,action:string){
  if(this.status==='disabled'||this.status==='unavailable')return;
  if(this.sdk&&this.loadingReported)this.call(()=>this.sdk!.measure(category,what,action));
  else {if(this.pending.length===256)this.pending.shift();this.pending.push([category,what,action]);}
 }
 private call(fn:()=>void){try{fn();}catch{/* SDK/analytics failures must never interrupt play. */}}
 private flush(){
  if(!this.sdk||!this.loaded)return;
  if(!this.loadingReported){this.loadingReported=true;this.call(()=>this.sdk!.gameLoadingFinished());}
  if(this.playing!==this.playingReported){
   this.playingReported=this.playing;
   this.call(()=>this.playing?this.sdk!.gameplayStart():this.sdk!.gameplayStop());
  }
  for(const [category,what,action] of this.pending.splice(0))this.call(()=>this.sdk!.measure(category,what,action));
 }
}
