/* MWSubmit: shared Submit button. Usage:
   MWSubmit.button(el,{agent,app,deck,getResults:()=>obj,getNotes:()=>str})
   MWSubmit.send({agent,app,deck,results,notes,partial,answered,total,unanswered,test}) -> Promise<bool>  (mid-deck Submit)
   POSTs text/plain JSON (no-cors) to the shared Apps Script receiver. No token in client code.
   PASSWORD GATE: every send goes through MWSubmit.gate(agent) (skipped for agent 'wellnest'). Custom code: await MWSubmit.gate(agent) or just use MWSubmit.send.
   send() resolves false with MWSubmit.blocked=true when the password was not given (nothing sent, nothing queued). */
(function(w){
  var URL='https://script.google.com/macros/s/AKfycbwoYorVuS4ZQdlmPM0CAYQ5qOoeuR4GjMk5Myg7rLpurHxt_6iqyZgJgYaxuZqoQdv7/exec';
  var QK='mw-submit-queue';
  var CSS='.mws-wrap{display:flex;flex-direction:column;align-items:stretch;gap:.5rem;margin:1rem 0;max-width:28rem}'+
  '.mws-btn{font-family:Khand,Hind,system-ui,sans-serif;font-weight:700;font-size:1.25rem;letter-spacing:.12em;text-transform:uppercase;min-height:56px;min-width:44px;padding:.9rem 2rem;border:2px solid #171717;border-radius:0;background:#171717;color:#FAFAFA;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:.6rem;touch-action:manipulation;-webkit-tap-highlight-color:transparent;-webkit-appearance:none;appearance:none}'+
  '.mws-btn[disabled]{opacity:.7;cursor:default}.mws-btn.sent{background:#FFFFFF;color:#0A0A0A}.mws-btn.fail{background:#FFFFFF;color:#0A0A0A;border-style:dashed}'+
  '.mws-msg{font-family:Hind,system-ui,sans-serif;font-size:.95rem;color:#737373;min-height:1.2em}'+
  '.mw-hover{transition:transform 180ms ease-out,box-shadow 180ms ease-out}.mw-hover:hover,.mw-hover:focus-visible{transform:translateY(-1px) scale(1.02);box-shadow:0 6px 18px rgba(10,10,10,.12)}'+
  '@media(hover:none){.mw-hover:hover{transform:none;box-shadow:none}}@media(prefers-reduced-motion:reduce){.mw-hover{transition:none}.mw-hover:hover{transform:none}}';
  var CHECK='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* Password gate (Oct 13 2026 rule): first Submit on a device asks for the team password.
     Only its SHA-256 is stored here. agent==='wellnest' skips the gate. Payloads carry auth:true + authKey (hash prefix). */
  var PH='6df85d68da9f1f949bc43346a2d84643736b955194f25738fd74100ae1874523',AK='mw-submit-auth2',AP=PH.slice(0,8);
  function exempt(a){return String(a||'').toLowerCase()==='wellnest';}
  function authed(){try{return localStorage.getItem(AK)===AP}catch(_){return false}}
  function sha256js(str){function R(n,x){return(x>>>n)|(x<<(32-n))}var K=[],H=[],P=[],i,j,c=2;function prime(n){for(var d=2;d*d<=n;d++)if(n%d===0)return false;return true}
    while(P.length<64){if(prime(c))P.push(c);c++}for(i=0;i<64;i++){K[i]=(Math.pow(P[i],1/3)%1)*4294967296|0;if(i<8)H[i]=(Math.pow(P[i],1/2)%1)*4294967296|0}
    var b=unescape(encodeURIComponent(str)),l=b.length*8,w=[];for(i=0;i<b.length;i++)w[i>>2]|=b.charCodeAt(i)<<((3-i%4)*8);w[l>>5]|=0x80<<(24-l%32);w[((l+64>>9)<<4)+15]=l;
    for(j=0;j<w.length;j+=16){var a=H.slice(0),W=[];for(i=0;i<64;i++){if(i<16)W[i]=w[i+j]|0;else{var x=W[i-15],y=W[i-2];W[i]=(W[i-16]+(R(7,x)^R(18,x)^(x>>>3))+W[i-7]+(R(17,y)^R(19,y)^(y>>>10)))|0}
      var t1=(a[7]+(R(6,a[4])^R(11,a[4])^R(25,a[4]))+((a[4]&a[5])^(~a[4]&a[6]))+K[i]+W[i])|0,t2=((R(2,a[0])^R(13,a[0])^R(22,a[0]))+((a[0]&a[1])^(a[0]&a[2])^(a[1]&a[2])))|0;a=[(t1+t2)|0].concat(a);a[4]=(a[4]+t1)|0;a.pop()}
      for(i=0;i<8;i++)H[i]=(H[i]+a[i])|0}
    return H.map(function(v){return('00000000'+(v>>>0).toString(16)).slice(-8)}).join('')}
  function hash(t){t=String(t||'').trim().toLowerCase();return Promise.resolve(sha256js(t));}
  var GCSS='.mwg-bg{position:fixed;inset:0;z-index:2147483000;background:rgba(10,10,10,.45);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}'+
  '.mwg{background:#FFFFFF;color:#0A0A0A;color-scheme:light;width:100%;max-width:340px;box-sizing:border-box;padding:20px 18px 18px;border:1px solid #E5E5E5;box-shadow:0 12px 40px rgba(10,10,10,.18);font-family:Hind,system-ui,-apple-system,sans-serif}'+
  '.mwg h2{margin:0 0 4px;font-family:Khand,Hind,system-ui,sans-serif;font-weight:700;font-size:1.35rem;letter-spacing:.04em}.mwg p{margin:0 0 12px;font-size:15px;color:#525252;line-height:1.4}'+
  '.mwg input{display:block;width:100%;box-sizing:border-box;font-size:16px;min-height:48px;padding:10px 12px;border:1px solid #A3A3A3;border-radius:0;background:#FFFFFF;color:#0A0A0A;-webkit-appearance:none;appearance:none}'+
  '.mwg input:focus{outline:2px solid #171717;outline-offset:0}.mwg .mwg-err{min-height:1.3em;margin:8px 0 0;font-size:15px;color:#B91C1C}'+
  '.mwg .mwg-row{display:flex;gap:8px;margin-top:12px}.mwg button{flex:1;min-height:48px;font-size:16px;font-family:Khand,Hind,system-ui,sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:2px solid #171717;border-radius:0;cursor:pointer;-webkit-appearance:none;appearance:none;touch-action:manipulation}'+
  '.mwg .mwg-ok{background:#171717;color:#FAFAFA}.mwg .mwg-no{background:#FFFFFF;color:#0A0A0A}';
  var pending=null;
  function ask(){if(pending)return pending;pending=new Promise(function(res){
      if(!document.getElementById('mwg-css')){var s=document.createElement('style');s.id='mwg-css';s.textContent=GCSS;document.head.appendChild(s);}
      var bg=document.createElement('div');bg.className='mwg-bg';bg.setAttribute('role','dialog');bg.setAttribute('aria-modal','true');bg.setAttribute('aria-labelledby','mwg-t');
      bg.innerHTML='<form class="mwg" autocomplete="off"><h2 id="mwg-t">Password Needed</h2><p>Enter the team password to send from this device. You only do this once.</p>'+
        '<input type="password" name="mwg-pw" aria-label="Password" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">'+
        '<div class="mwg-err" role="alert" aria-live="assertive"></div><div class="mwg-row"><button type="button" class="mwg-no">Cancel</button><button type="submit" class="mwg-ok">Unlock</button></div></form>';
      document.body.appendChild(bg);var f=bg.querySelector('form'),inp=bg.querySelector('input'),err=bg.querySelector('.mwg-err');
      function done(ok){bg.remove();pending=null;res(ok);}
      setTimeout(function(){try{inp.focus()}catch(_){}},30);
      bg.querySelector('.mwg-no').onclick=function(){done(false)};
      bg.addEventListener('keydown',function(e){if(e.key==='Escape')done(false)});
      f.addEventListener('submit',function(e){e.preventDefault();hash(inp.value).then(function(h){
        if(h===PH){try{localStorage.setItem(AK,AP)}catch(_){}done(true);}
        else{err.textContent='Wrong password. Nothing was sent.';inp.value='';inp.focus();}});});
    });return pending;}
  /* gate(agent) -> Promise<bool>. true = OK to send. Custom submit code must call this (or use send/post). */
  function gate(agent){if(exempt(agent)||authed())return Promise.resolve(true);return ask();}
  function stamp(p){if(!exempt(p.agent)&&authed()){p.auth=true;p.authKey=AP;}return p;}
  function css(){if(document.getElementById('mws-css'))return;var s=document.createElement('style');s.id='mws-css';s.textContent=CSS;document.head.appendChild(s);}
  function q(){try{return JSON.parse(localStorage.getItem(QK)||'[]')}catch(_){return[]}}
  function setQ(a){try{localStorage.setItem(QK,JSON.stringify(a))}catch(_){}}
  function post(p){stamp(p);return fetch(URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(p)});}
  function flush(){var all=q(),a=[],hold=[];all.forEach(function(p){(exempt(p.agent)||authed()?a:hold).push(p)});if(!a.length)return Promise.resolve(0);setQ(hold);var left=[];
    return Promise.all(a.map(function(p){return post(p).catch(function(){left.push(p)})})).then(function(){if(left.length)setQ(q().concat(left));return a.length-left.length;});}
  function button(el,o){css();o=o||{};
    var wrap=document.createElement('div');wrap.className='mws-wrap';
    var b=document.createElement('button');b.type='button';b.className='mws-btn mw-hover';
    var m=document.createElement('div');m.className='mws-msg';m.setAttribute('role','status');m.setAttribute('aria-live','polite');
    wrap.appendChild(b);wrap.appendChild(m);el.appendChild(wrap);
    function state(s){b.classList.remove('sent','fail');b.disabled=false;
      if(s==='idle'){b.textContent='Submit';m.textContent='';}
      if(s==='sending'){b.textContent='Sending';b.disabled=true;m.textContent='';}
      if(s==='sent'){b.innerHTML=CHECK+'<span>Sent</span>';b.classList.add('sent');m.textContent='Sent. Tap again to send an update.';}
      if(s==='fail'){b.textContent='Not Sent Yet';b.classList.add('fail');m.textContent='Saved on this device. Tap to retry; it also retries when you reopen.';}}
    b.addEventListener('click',function(){if(b.disabled)return;b.disabled=true;gate(o.agent).then(function(ok){b.disabled=false;if(!ok){state('idle');m.textContent='Password needed. Nothing was sent.';return;}state('sending');
      var p={agent:o.agent,app:o.app,deck:o.deck,results:o.getResults?o.getResults():null,notes:o.getNotes?o.getNotes():'',sentAt:new Date().toISOString(),ua:navigator.userAgent};
      post(p).then(function(){state('sent')},function(){setQ(q().concat([p]));state('fail')});});});
    state(q().some(function(p){return p.agent===o.agent&&p.deck===o.deck})?'fail':'idle');
    flush().then(function(n){if(n&&!q().some(function(p){return p.agent===o.agent&&p.deck===o.deck}))state('sent')});
    return {el:wrap,state:state};}
  /* send(o): one-shot submit with no button (mid-deck partial). o: {agent,app,deck,results,notes,partial,answered,total,unanswered,test}.
     Resolves true when posted, false when queued on device for retry. */
  function send(o){o=o||{};return gate(o.agent).then(function(ok){if(!ok){w.MWSubmit.blocked=true;return false;}w.MWSubmit.blocked=false;var p={agent:o.agent,app:o.app,deck:o.deck,results:o.results||null,notes:o.notes||'',sentAt:new Date().toISOString(),ua:navigator.userAgent};
    ['partial','answered','total','unanswered','test'].forEach(function(k){if(o[k]!==undefined)p[k]=o[k]});
    return post(p).then(function(){return true},function(){setQ(q().concat([p]));return false});});}
  w.MWSubmit={button:button,send:send,flush:flush,gate:gate,isAuthed:authed,url:URL,blocked:false};
  w.addEventListener('online',flush);
})(window);
