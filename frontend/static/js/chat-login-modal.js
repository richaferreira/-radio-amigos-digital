(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const TOKEN='radio_token';
  let authUser=null;
  let authCheckAt=0;

  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function toast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>t.style.display='none',3000)}

  function installStyles(){
    if($('#chatV3Styles'))return;
    const s=document.createElement('style');s.id='chatV3Styles';s.textContent=`
      .chat-auth-modal{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:1rem}.chat-auth-modal.open{display:flex}.chat-auth-backdrop{position:absolute;inset:0;background:rgba(2,1,7,.82);backdrop-filter:blur(8px)}.chat-auth-card{position:relative;width:min(500px,100%);border-radius:28px;border:1px solid rgba(255,255,255,.11);background:radial-gradient(circle at 90% 0,rgba(34,211,238,.10),transparent 28%),radial-gradient(circle at 0 0,rgba(255,45,141,.13),transparent 32%),#0d0915;box-shadow:0 35px 100px rgba(0,0,0,.65),0 0 70px rgba(138,77,255,.12);padding:1.35rem}.chat-auth-close{position:absolute;right:16px;top:14px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:1.2rem}.chat-auth-logo{display:flex;align-items:center;gap:.75rem;padding-right:2.5rem}.chat-auth-logo img{width:52px;height:52px;border-radius:15px}.chat-auth-logo strong{display:block;font-size:1.05rem}.chat-auth-logo span{display:block;color:#9e94a8;font-size:.75rem}.chat-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin:1.2rem 0}.chat-auth-tabs button{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);color:#b8afc2;padding:.65rem;border-radius:13px;font-weight:850}.chat-auth-tabs button.active{color:#fff;background:linear-gradient(120deg,rgba(255,45,141,.18),rgba(138,77,255,.18));border-color:rgba(255,45,141,.25)}.chat-auth-pane{display:none}.chat-auth-pane.active{display:block}.chat-auth-benefits{display:flex;gap:.45rem;flex-wrap:wrap;margin:.8rem 0}.chat-auth-benefits span{font-size:.65rem;padding:.35rem .5rem;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07);color:#c6bdcf}
      .chat-item{border-radius:18px!important;padding:.8rem .9rem!important;margin:.45rem 0!important}.chat-item:hover{border-color:rgba(138,77,255,.2)!important}.chat-profile-row{padding-right:4.8rem;position:relative}.chat-v3-actions{display:inline-flex;align-items:center;gap:.3rem;margin-left:.25rem}.chat-reply-btn{border:0;background:transparent;color:#8f8499;font-size:.65rem;padding:.2rem .35rem;border-radius:8px}.chat-reply-btn:hover{color:#7eeaff;background:rgba(34,211,238,.07)}.chat-mention{display:inline-block;color:#7eeaff;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.13);border-radius:6px;padding:0 .2rem;font-weight:800}.chat-reply-context{display:none;align-items:center;gap:.5rem;margin:.45rem 0 0;padding:.48rem .65rem;border-radius:12px;background:rgba(138,77,255,.07);border:1px solid rgba(138,77,255,.13);font-size:.7rem;color:#bcb2c7}.chat-reply-context.show{display:flex}.chat-reply-context button{margin-left:auto;border:0;background:transparent;color:#aaa0b4}.chat-scroll-bottom{position:absolute;right:18px;bottom:78px;z-index:8;border:1px solid rgba(255,255,255,.12);background:rgba(12,8,20,.88);color:#fff;width:38px;height:38px;border-radius:50%;display:none;place-items:center;box-shadow:0 12px 28px rgba(0,0,0,.35)}.chat-scroll-bottom.show{display:grid}.home-chat-panel,.chat-panel{position:relative}
      @media(max-width:560px){.chat-auth-card{padding:1rem;border-radius:22px}.chat-profile-row{padding-right:0}.chat-v3-actions{width:100%;margin-left:0}}
    `;document.head.appendChild(s);
  }

  async function validate(force=false){
    const tk=localStorage.getItem(TOKEN)||'';
    if(!tk){authUser=null;return null}
    if(!force&&authUser&&Date.now()-authCheckAt<30000)return authUser;
    try{const r=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${tk}`}});if(!r.ok)throw new Error();authUser=await r.json();authCheckAt=Date.now();return authUser}catch{localStorage.removeItem(TOKEN);localStorage.removeItem('radio_user');authUser=null;return null}
  }

  function installModal(){
    if($('#chatAuthModal'))return;
    const modal=document.createElement('div');modal.id='chatAuthModal';modal.className='chat-auth-modal';modal.innerHTML=`<div class="chat-auth-backdrop" data-auth-close></div><div class="chat-auth-card"><button class="chat-auth-close" type="button" data-auth-close>×</button><div class="chat-auth-logo"><img src="/static/img/logo-rad.svg" alt=""><div><strong>Entre na resenha da RAD</strong><span>Login obrigatório para conversar, reagir e pedir músicas.</span></div></div><div class="chat-auth-benefits"><span>💬 Chat ao vivo</span><span>🔥 Reações</span><span>🎵 Pedidos</span><span>🏅 Emblemas</span></div><div class="chat-auth-tabs"><button type="button" class="active" data-auth-tab="login">Entrar</button><button type="button" data-auth-tab="register">Criar conta</button></div><div class="chat-auth-pane active" data-auth-pane="login"><form id="modalLoginForm"><label class="form-label small">Usuário</label><input class="form-control mb-3" name="username" autocomplete="username" required><label class="form-label small">Senha</label><input class="form-control mb-3" name="password" type="password" autocomplete="current-password" required><button class="btn btn-rad w-100"><i class="bi bi-box-arrow-in-right"></i> Entrar no chat</button></form></div><div class="chat-auth-pane" data-auth-pane="register"><form id="modalRegisterForm"><label class="form-label small">Nome exibido</label><input class="form-control mb-2" name="display_name" maxlength="80" placeholder="Como você aparecerá no chat"><label class="form-label small">Usuário</label><input class="form-control mb-2" name="username" minlength="3" maxlength="40" required><label class="form-label small">E-mail</label><input class="form-control mb-2" name="email" type="email" placeholder="Opcional"><label class="form-label small">Senha</label><input class="form-control mb-3" name="password" type="password" minlength="8" required><button class="btn btn-rad w-100"><i class="bi bi-person-plus-fill"></i> Criar conta e entrar</button></form></div></div>`;document.body.appendChild(modal);
    modal.querySelectorAll('[data-auth-close]').forEach(x=>x.onclick=()=>modal.classList.remove('open'));
    modal.querySelectorAll('[data-auth-tab]').forEach(btn=>btn.onclick=()=>{modal.querySelectorAll('[data-auth-tab]').forEach(x=>x.classList.toggle('active',x===btn));modal.querySelectorAll('[data-auth-pane]').forEach(x=>x.classList.toggle('active',x.dataset.authPane===btn.dataset.authTab))});
    $('#modalLoginForm').onsubmit=async e=>authSubmit(e,'login');$('#modalRegisterForm').onsubmit=async e=>authSubmit(e,'register');
  }

  async function authSubmit(e,type){
    e.preventDefault();const form=e.currentTarget,btn=form.querySelector('button');btn.disabled=true;
    try{const r=await fetch(`/api/auth/${type}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Não foi possível entrar');localStorage.setItem(TOKEN,data.access_token);localStorage.setItem('radio_user',JSON.stringify(data.user));localStorage.setItem('nickname',data.user.display_name||data.user.username);authUser=data.user;toast(type==='login'?`Bem-vindo, ${data.user.display_name}!`:'Conta criada. Bem-vindo à RAD!');$('#chatAuthModal').classList.remove('open');location.hash='#chat';setTimeout(()=>location.reload(),120)}catch(err){toast(err.message)}finally{btn.disabled=false}
  }

  function openModal(tab='login'){
    installModal();const modal=$('#chatAuthModal');modal.classList.add('open');const button=modal.querySelector(`[data-auth-tab="${tab}"]`);button?.click();setTimeout(()=>modal.querySelector(`[data-auth-pane="${tab}"] input`)?.focus(),80);
  }

  function safeMentions(el){
    if(!el||el.dataset.mentions==='1')return;el.dataset.mentions='1';const text=el.textContent||'';const parts=text.split(/(@[A-Za-z0-9_.À-ÿ-]+)/g);el.innerHTML=parts.map(p=>p.startsWith('@')?`<span class="chat-mention">${esc(p)}</span>`:esc(p)).join('');
  }

  function replyTo(item){
    const name=item.querySelector('.chat-name')?.textContent?.trim()||'usuário';const input=item.closest('#chat')?$('#chatInput'):$('#homeChatInput');if(!input)return;
    const panel=input.closest('form')?.parentElement||input.parentElement;let ctx=panel.querySelector('.chat-reply-context');if(!ctx){ctx=document.createElement('div');ctx.className='chat-reply-context';input.closest('form')?.insertAdjacentElement('beforebegin',ctx)}ctx.innerHTML=`<i class="bi bi-reply-fill"></i> Respondendo a <strong>${esc(name)}</strong><button type="button">×</button>`;ctx.classList.add('show');ctx.querySelector('button').onclick=()=>ctx.classList.remove('show');input.value=`@${name} ${input.value||''}`;input.focus();
  }

  function enhanceMessages(){
    $$('.chat-item[data-id]').forEach(item=>{
      safeMentions(item.querySelector('.chat-message-copy'));
      if(item.querySelector('.chat-v3-actions'))return;
      const profile=item.querySelector('.chat-profile-row')||item.firstElementChild;if(!profile)return;
      const actions=document.createElement('span');actions.className='chat-v3-actions';actions.innerHTML='<button type="button" class="chat-reply-btn" title="Responder"><i class="bi bi-reply"></i> Responder</button>';profile.appendChild(actions);actions.querySelector('button').onclick=async()=>{if(!await validate(true))return openModal();replyTo(item)};
    });
  }

  function addScrollButton(container){
    if(!container||container.dataset.scrollV3==='1')return;container.dataset.scrollV3='1';const host=container.parentElement;if(!host)return;const btn=document.createElement('button');btn.type='button';btn.className='chat-scroll-bottom';btn.innerHTML='<i class="bi bi-arrow-down"></i>';host.appendChild(btn);const update=()=>{const away=container.scrollHeight-container.scrollTop-container.clientHeight>140;btn.classList.toggle('show',away)};container.addEventListener('scroll',update,{passive:true});btn.onclick=()=>container.scrollTo({top:container.scrollHeight,behavior:'smooth'});update();
  }

  installStyles();installModal();validate(true);
  document.addEventListener('click',event=>{
    const chatLink=event.target.closest('a[href="#chat"],.nav-chat,.chat-login-gate button');if(chatLink){if(!localStorage.getItem(TOKEN)){event.preventDefault();event.stopImmediatePropagation();openModal();return}validate(true).then(user=>{if(!user)openModal();else if(chatLink.matches('.chat-login-gate button'))location.hash='#chat'});}
  },true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#chat')validate(true).then(user=>{if(!user)openModal()})});
  setInterval(()=>{enhanceMessages();addScrollButton($('#homeChatMessages'));addScrollButton($('#chatMessages'))},900);
  if(location.hash==='#chat')setTimeout(()=>validate(true).then(user=>{if(!user)openModal()}),250);
})();