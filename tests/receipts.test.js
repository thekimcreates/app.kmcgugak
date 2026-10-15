import test from 'node:test';
import assert from 'node:assert/strict';
import {unseenCount} from '../js/receipts.js';
import {demoGateway} from '../js/demo.js';
test('team starts at 22 others, drops as people read, and hides at zero',()=>{
 const members=Array.from({length:23},(_,i)=>({id:'member'+i}));
 const message={senderId:'member0',sentAt:new Date('2026-10-15T00:00:00Z')},thread={id:'team'};
 assert.equal(unseenCount(message,thread,members,{}),22);
 const readers=Object.fromEntries(members.slice(1,21).map(m=>[m.id,+message.sentAt]));
 assert.equal(unseenCount(message,thread,members,readers),2);
 readers.member21=+message.sentAt;readers.member22=+message.sentAt;
 assert.equal(unseenCount(message,thread,members,readers),0);
 assert.equal(unseenCount({...message,sentAt:new Date(+message.sentAt+1)},thread,members,readers),22);
});
test('private counts include only participants other than sender',()=>{
 const m={senderId:'a',sentAt:new Date(1000)},t={id:'dm_a_b',participants:['a','b']};
 assert.equal(unseenCount(m,t,[{id:'outsider'}],{outsider:2000}),1);
 assert.equal(unseenCount(m,t,[],{b:1000}),0);
});
test('read receipts notify live conversation listeners',async()=>{
 const g=demoGateway(),seen=[];const stop=g.watchReaders('team',r=>seen.push(r));
 await new Promise(r=>setTimeout(r,0));await g.markRead('team','19kimj',new Date(1000));
 assert.equal(seen.at(-1)['19kimj'],1000);stop();
});
