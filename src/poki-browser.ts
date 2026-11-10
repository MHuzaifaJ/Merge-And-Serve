import {PokiBridge,type PokiAPI,type PokiLoader} from './poki';

const SDK_URL='https://game-cdn.poki.com/scripts/v2/poki-sdk.js';
declare global {interface Window {PokiSDK?:PokiAPI;}}

// Normal/itch builds and development review fixtures never load or report to Poki.
export const poki=new PokiBridge(import.meta.env.MODE==='poki'&&!(import.meta.env.DEV&&new URLSearchParams(location.search).has('review')));
const loadSDK:PokiLoader=signal=>new Promise((resolve,reject)=>{
 if(signal.aborted){reject(new Error('SDK loading aborted'));return;}
 if(window.PokiSDK){resolve(window.PokiSDK);return;}
 const script=document.createElement('script');script.src=SDK_URL;script.async=true;
 const cleanup=()=>{script.onload=null;script.onerror=null;signal.removeEventListener('abort',abort);};
 const fail=(message:string)=>{cleanup();script.remove();reject(new Error(message));};
 const abort=()=>fail('SDK loading aborted');
 script.onload=()=>{cleanup();if(window.PokiSDK)resolve(window.PokiSDK);else fail('Poki SDK unavailable');};
 script.onerror=()=>fail('Poki SDK could not be loaded');signal.addEventListener('abort',abort,{once:true});document.head.appendChild(script);
});
export function initializePoki(){
 // Loading runs alongside Phaser/assets; the game remains usable if the CDN or init is blocked.
 void poki.initialize(loadSDK).then(()=>{if(poki.status==='unavailable')console.warn('Poki SDK unavailable; continuing without Poki tracking.');else if(poki.status==='degraded')console.warn('Poki initialization failed; continuing with available SDK methods.');});
}
