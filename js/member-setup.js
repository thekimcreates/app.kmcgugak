import {el,button,sheet,toast,failure} from './ui.js';
export function memberSetup(ctx,{photo,checklist=false,reset=false}={}) {
  const uid=ctx.account()?.id;if(!uid)return;
  const layer=sheet(checklist?'Make yourself at home':reset?'Reset password':'Contact & notifications');
  let data,busy=false;
  async function request(action,data={}){if(ctx.account()?.id!==uid)throw Error('Your account changed. Reopen Settings.');const result=await ctx.gateway.memberSettings(action,data);if(ctx.account()?.id!==uid)throw Error('Your account changed. Reopen Settings.');return result;}
  const error=el('p',{class:'error',role:'status'});
  const active=()=>ctx.account()?.id===uid&&layer.body.isConnected;
  async function run(work){if(busy)return;busy=true;error.textContent='';layer.body.querySelectorAll('button,input').forEach(n=>n.disabled=true);try{await work();}catch(e){if(active())error.textContent=failure(e);}finally{busy=false;if(active())layer.body.querySelectorAll('button,input').forEach(n=>n.disabled=false);}}
  async function load(){data=await request('get');if(active())draw();}
  function input(label,type='text',value=''){const node=el('input',{type,value,'aria-label':label,placeholder:label,autocomplete:type==='password'?'current-password':'off'});return [el('label',{class:'field'},[el('span',{text:label}),node]),node];}
  function edit(channel){
    const view=sheet(channel==='email'?'Add your email':'Add your phone number');
    const [valueRow,value]=input(channel==='email'?'Email address':'Phone number (include +country code)',channel==='email'?'email':'tel',data[channel]?.value||'');
    const [passwordRow,password]=input('Current password','password');
    const message=el('p',{class:'error',role:'status'});
    const send=button('Send verification code',async()=>{send.disabled=true;try{
      if(ctx.account()?.id!==uid)return view.close();
      await ctx.gateway.confirmPassword(password.value);password.value='';
      await request('start',{channel,value:value.value});
      const [codeRow,code]=input('6-digit verification code');code.inputMode='numeric';code.autocomplete='one-time-code';code.maxLength=6;
      const verify=button('Verify',async()=>{verify.disabled=true;try{if(ctx.account()?.id!==uid)return view.close();await request('verify',{channel,code:code.value});view.close();await load();}catch(e){message.textContent=failure(e);}finally{verify.disabled=false;}},'primary');
      view.body.replaceChildren(el('p',{text:'Check your inbox. This code expires in 10 minutes.'}),codeRow,verify,message);
    }catch(e){message.textContent=failure(e);}finally{send.disabled=false;}},'primary');
    view.body.append(valueRow,passwordRow,send,message);
  }
  function remove(channel){const view=sheet('Remove contact method'),[row,pw]=input('Current password','password'),msg=el('p',{class:'error'});const remove=button('Remove',async()=>{remove.disabled=true;try{await ctx.gateway.confirmPassword(pw.value);await request('remove',{channel});view.close();await load();}catch(e){msg.textContent=failure(e);}finally{remove.disabled=false;}},'danger');view.body.append(row,remove,msg);}
  function draw(){
    layer.body.replaceChildren();
    if(checklist){layer.body.append(el('p',{class:'setup-intro',text:'A few little things to make KMC Gugak yours.'}),el('p',{text:`${Number(!!ctx.account()?.photoBase64)+Number(!!data.email?.verified)+Number(!!data.sms?.verified)} of 3 little things done`}),el('p',{class:'muted',text:'Everything here is optional. Come back any time in Settings.'}),button(`${ctx.account()?.photoBase64?'✓':'＋'} Put a face to your name`,()=>photo?.(),'settings-row'));}
    if(reset)layer.body.append(el('p',{text:'Choose where to receive your reset link. Add and verify a contact method below if you haven’t yet.'}));
    for(const channel of ['email','sms']){
      const group=el('section',{class:'settings-group'}),verified=data[channel]?.verified;
      group.append(el('h2',{text:channel==='email'?'Email':'Phone number'}),el('p',{text:verified?`${data[channel].value} · Verified`:'Not added'}),button(verified?'Edit':'Add',()=>edit(channel)));
      if(!data.available?.[channel])group.append(el('p',{class:'muted',text:`${channel==='email'?'Email':'Text message'} delivery is not available yet.`}));
      if(verified){
        if(reset)group.append(button(`Send reset link by ${channel==='email'?'email':'text'}`,()=>run(async()=>{await request('reset',{channel});toast('Reset link sent. Open it in your browser.');}),'primary'));
        else for(const kind of ['performances','messages']){
          const key=`${channel}_${kind}`,toggle=el('input',{type:'checkbox',role:'switch','aria-label':`${kind} by ${channel}`});toggle.checked=data.preferences?.[key]===true;
          toggle.onchange=()=>run(async()=>{try{await request('preferences',{preferences:{...data.preferences,[key]:toggle.checked}});}finally{await load();}});
          group.append(el('label',{class:'settings-row'},[el('span',{text:`${kind==='performances'?'Performance changes':'New messages'} by ${channel==='email'?'email':'text'}`}),toggle]));
        }
        group.append(button('Remove',()=>remove(channel),'danger'));
      }
      layer.body.append(group);
    }
    if(checklist)layer.body.append(button('All set — let’s go!',()=>run(async()=>{await request('checklist',{done:true});layer.close();}),'primary'),button('I’ll explore this later',()=>layer.close()));
    layer.body.append(error);
  }
  layer.body.append(el('p',{text:'Loading your settings…'}),error);run(load);
  return layer;
}
const prompted=new Set();
export async function promptChecklist(ctx,photo){const uid=ctx.account()?.id;if(!uid||prompted.has(uid))return;prompted.add(uid);try{const p=await ctx.gateway.memberSettings('get');if(ctx.account()?.id===uid&&!p.checklistDone)memberSetup(ctx,{photo,checklist:true});}catch{prompted.delete(uid);}}
