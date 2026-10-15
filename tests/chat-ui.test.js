import test from 'node:test';
import assert from 'node:assert/strict';
const desktop={value:true};
class Element {
 constructor(tag){this.tagName=tag.toUpperCase();this.nodes=[];this.attrs={};this.events={};this.style={};this.value='';this.hidden=false;this.disabled=false;this.scrollHeight=200;this.clientHeight=100;this.scrollTop=0;this.className='';this.classList={add:(...a)=>{this.className=[...new Set([...this.className.split(' ').filter(Boolean),...a])].join(' ');},remove:(...a)=>{this.className=this.className.split(' ').filter(x=>!a.includes(x)).join(' ');},contains:a=>this.className.split(' ').includes(a),toggle:(a,v)=>{const yes=v??!this.classList.contains(a);yes?this.classList.add(a):this.classList.remove(a);}};}
 get children(){return this.nodes.filter(n=>n instanceof Element);}get offsetParent(){return this.parentNode;}get firstChild(){return this.nodes[0];}
 set textContent(v){this.nodes=[String(v)];}get textContent(){return this.nodes.map(n=>n instanceof Element?n.textContent:String(n)).join('');}
 append(...nodes){for(const n of nodes){if(n==null)continue;if(n instanceof Element){n.remove();n.parentNode=this;}this.nodes.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.nodes=[];this.append(...nodes);}
 remove(){if(this.parentNode){this.parentNode.nodes=this.parentNode.nodes.filter(n=>n!==this);this.parentNode=null;}}
 replaceWith(node){const parent=this.parentNode;if(parent){const i=parent.nodes.indexOf(this);this.remove();parent.nodes.splice(i,0,node);node.parentNode=parent;}}
 setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=String(v);if(k==='hidden')this.hidden=true;if(k==='value')this.value=String(v);if(k==='id')this.id=String(v);if(k==='checked')this.checked=true;}
 removeAttribute(k){delete this.attrs[k];}getAttribute(k){return this.attrs[k]??null;}
 addEventListener(k,f){(this.events[k]??=[]).push(f);}removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(x=>x!==f);}
 async fire(k,more={}){const e={target:this,preventDefault(){},...more};for(const f of this.events[k]||[])await f(e);if(this['on'+k])await this['on'+k](e);}
 click(){return this.fire('click');}
 focus(){if(!this.hidden)document.activeElement=this;}contains(n){return this===n||this.children.some(c=>c.contains(n));}
 matches(selector){if(selector.startsWith('#'))return this.id===selector.slice(1);if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));const a=selector.match(/^\[([^=]+)="([^"]+)"\]$/);if(a)return this.getAttribute(a[1])===a[2];return this.tagName.toLowerCase()===selector;}
 querySelectorAll(q){const selectors=q.split(',');const result=[];const visit=n=>{for(const c of n.children){if(selectors.some(s=>c.matches(s.trim())))result.push(c);visit(c);}};visit(this);return result;}querySelector(q){return this.querySelectorAll(q)[0]||null;}
 closest(q){return q.split(',').some(s=>this.matches(s.trim()))?this:this.parentNode?.closest(q)||null;}
 getBoundingClientRect(){return {top:0,left:0,width:390,height:600};}
}
globalThis.Node=Element;
const body=new Element('body');for(const id of ['chat','layers','toast']){const e=new Element('div');e.id=id;body.append(e);}
globalThis.document={body,activeElement:null,createElement:t=>new Element(t),createTextNode:s=>s,querySelector:q=>body.querySelector(q),querySelectorAll:q=>body.querySelectorAll(q)};
globalThis.window=globalThis;globalThis.innerWidth=1400;globalThis.innerHeight=900;
globalThis.matchMedia=q=>({matches:q.includes('max-width')?!desktop.value:desktop.value,addEventListener(){},removeEventListener(){}});
globalThis.requestAnimationFrame=f=>{queueMicrotask(f);return 1;};globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
const {avatar}=await import('../js/ui.js');const {createChat}=await import('../js/chat.js');const {demoGateway}=await import('../js/demo.js');
const tick=()=>new Promise(r=>setTimeout(r,70));
test('avatars support PNG and data URLs with a fixed circle size',()=>{const raw='iVBORw0KGgo=';const a=avatar({photoBase64:raw},54);assert.equal(a.children[0].getAttribute('src'),'data:image/png;base64,'+raw);const b=avatar({photoBase64:'data:image/png;base64,'+raw},54);assert.equal(b.children[0].getAttribute('src'),'data:image/png;base64,'+raw);assert.equal(b.getAttribute('style'),'--size:54px');});
test('composer keeps focus, preserves the next draft, and uses a direct native file input',async()=>{
 const gateway=demoGateway();const member=await gateway.login('19kimj','password');let roster=[];gateway.watchPublic(d=>roster=d.members);await tick();const chat=createChat({account:()=>member,members:()=>roster,gateway,tab:()=> 'chat',guest:()=>new Element('div')});
 await chat.render(document.querySelector('#chat'));await tick();assert.equal(body.querySelector('[aria-label="Chat notifications"]'),null);assert.equal(localStorage.getItem('kmc.notify.19kimj'),'all');
 const team=body.querySelectorAll('.inbox-row').find(n=>n.textContent.includes('Team Chat'));await team.fire('click');await tick();assert.equal(body.querySelector('[aria-label="Search messages"]'),null);assert.equal(body.querySelector('[aria-label="Close Team Chat"]').hidden,true);
 const input=body.querySelector('textarea'),send=body.querySelector('[aria-label="Send message"]');input.value='First';await input.fire('input');input.focus();
 let release;const original=gateway.send;gateway.send=async(...args)=>{await new Promise(r=>release=r);return original(...args);};
 const sending=send.fire('click');await new Promise(r=>setTimeout(r,0));assert.equal(input.disabled,false);assert.equal(input.readOnly,false);input.value='FirstNext';await input.fire('input');release();await sending;assert.equal(input.value,'Next');assert.equal(document.activeElement,input);
 await body.querySelector('[aria-label="Add photos or files"]').fire('click');assert.equal(body.querySelectorAll('.panel').length,1);assert.equal(body.querySelector('input').tagName,'INPUT');assert.ok(body.querySelectorAll('input').some(n=>n.getAttribute('type')==='file'));
 await body.querySelector('[aria-label="Conversation details"]').fire('click');assert.ok(!body.textContent.includes('Mute on this device'));chat.reset();
});
