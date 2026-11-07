import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Kitchen} from '../src/model.ts';
test('purchases spend coins and merging preserves item value',()=>{const k=new Kitchen();k.buy();k.buy();assert.equal(k.coins,76);assert.equal(k.move(0,1),true);assert.deepEqual(k.boards[0].slice(0,4),[0,2,0,0]);assert.equal(k.move(1,1),false);});
test('only requested station and exact level can be served',()=>{const k=new Kitchen();k.boards[0][0]=3;assert.equal(k.serve(0),0);k.boards[0][0]=2;assert.ok(k.serve(0)>4);assert.equal(k.served,1);assert.equal(k.boards[0][0],0);});
test('purchases reject full board and insufficient funds',()=>{const k=new Kitchen();k.boards[0].fill(1);assert.equal(k.buy(),false);k.boards[0].fill(0);k.coins=1;assert.equal(k.buy(),false);});
test('upgrades protect tomorrow budget and cap stations at three',()=>{const k=new Kitchen();k.ended=true;k.coins=90;assert.equal(k.upgrade('station'),false);k.coins=500;assert.equal(k.upgrade('station'),true);assert.equal(k.upgrade('station'),true);assert.equal(k.upgrade('station'),false);assert.equal(k.unlocked,3);});
test('expired orders advance and shift ends at target',()=>{const k=new Kitchen();for(let i=0;i<6;i++)k.tick(100);assert.equal(k.missed,6);assert.equal(k.ended,true);const coins=k.coins;k.tick(100);assert.equal(k.missed,6);k.startDay();assert.equal(k.day,2);assert.equal(k.coins,coins);assert.equal(k.ended,false);});
