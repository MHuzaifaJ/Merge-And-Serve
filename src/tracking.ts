import type {Kitchen,Item} from './model';

export interface EventSink {measure(category:string,what:string,action:string):void;}
export const itemName=(item:Item)=>`${['burger','fries','drink'][item.type]}_${item.level}`;
export const captureTrackingState=(k:Kitchen)=>({tutorialStep:k.tutorialStep,groups:k.groupsCompleted,highest:[...k.demand.highestServed],pending:k.demand.pending?{...k.demand.pending}:null});
type BeforeAction=ReturnType<typeof captureTrackingState>;

/** Bounded, non-identifying event names; called only after a successful game action. */
export class GameTracking {
 private startedGroup:number|null=null;
 private sink:EventSink;
 constructor(sink:EventSink){this.sink=sink;}
 action(before:BeforeAction,k:Kitchen,what:string,action:string,orderComplete=false){
  if(this.startedGroup!==before.groups){this.startedGroup=before.groups;this.sink.measure('round','customer_group','start');}
  if(before.tutorialStep===0)this.sink.measure('tutorial','onboarding','start');
  this.sink.measure('item',what,action);
  if(before.tutorialStep!==null&&before.tutorialStep!==k.tutorialStep){
   this.sink.measure('tutorial',`step_${before.tutorialStep+1}`,'complete');
   if(k.tutorialStep===null)this.sink.measure('tutorial','onboarding','complete');
  }
  if(orderComplete)this.sink.measure('round','customer_order','complete');
  for(let type=0;type<3;type++)if(k.demand.highestServed[type]>before.highest[type])this.sink.measure('upgrade',itemName({type,level:k.demand.highestServed[type]}),'complete');
  if(k.groupsCompleted>before.groups){
   this.sink.measure('round','customer_group','complete');this.startedGroup=null;
   if([1,3,5,10,25,50,100].includes(k.groupsCompleted))this.sink.measure('checkpoint',`groups_${k.groupsCompleted}`,'complete');
  }
  const pending=k.demand.pending;
  if(pending&&(!before.pending||pending.type!==before.pending.type||pending.level!==before.pending.level))this.sink.measure('upgrade',itemName(pending),'start');
 }
 resumed(k:Kitchen){
  if(k.tutorialStep!==null&&k.tutorialStep>0)this.sink.measure('tutorial','onboarding','resume');
  if(k.demand.pending)this.sink.measure('upgrade',itemName(k.demand.pending),'resume');
 }
 reset(){this.sink.measure('button','reset_game','complete');this.startedGroup=null;}
}
