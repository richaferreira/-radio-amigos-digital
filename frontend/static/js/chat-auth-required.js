(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const TOKEN_KEY='radio_token';
  let verifiedUser=null;
  let checking=false;

  function toast(message){const t=$('#toast');if(!t)return;t.textContent=message;t.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>t.style.display='none',3000)}
  function token(){return localStorage.getItem(TOKEN_KEY)||'';}

  function installStyles(){
    if($('#chatAuthRequiredStyles'))return;
    const s=document.createElement('style');s.id='chatAuthRequiredStyles';s.textContent=`
      .chat-login-gate{display:flex;align-items:center;gap:.8rem;margin:.65rem 0;padding:.85rem 1rem;border-radius:16px;border:1px solid rgba(255,45,141,.18);background:linear-gradient(110deg,rgba(255,45,141,.075),rgba(138,77,255,.07),rgba(34,211,238,.045));color:#dcd4e6}.chat-login-gate i{font-size:1.15rem;color:#ff7eb8}.chat-login-gate strong{display:block;font-size:.82rem}.chat-login-gate span{display:block;color:#9d94a8;font-size:.72rem;margin-top:.18rem}.chat-login-gate button{margin-left:auto;white-space:nowrap}.chat-auth-locked{opacity:.55;cursor:not-allowed!important}.chat-auth-member{box-shadow:inset 0 0 0 1px rgba(34,211,238,.08)}
      .rad-auth-modal{position:fixed;inset:0;z-index:120000;display:none;align-items:center;justify-content:center;padding:1rem}.rad-auth-modal.open{display:flex}.rad-auth-backdrop{position:absolute;inset:0;background:rgba(2,1,7,.86);backdrop-filter:blur(9px)}.rad-auth-card{position:relative;width:min(500px,100%);border-radius:28px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 100% 0,rgba(34,211,238,.11),transparent 30%),radial-gradient(circle at 0 0,rgba(255,45,141,.14),transparent 34%),#0d0915;box-shadow:0 35px 100px rgba(0,0,0,.7),0 0 60px rgba(138,77,255,.14);padding:1.35rem}.rad-auth-close{position:absolute;right:15px;top:14px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:1.25rem}.rad-auth-head{display:flex;align-items:center;gap:.8rem;padding-right:2.6rem}.rad-auth-head img{width:54px;height:54px;border-radius:15px}.rad-auth-head strong{display:block;font-size:1.08rem}.rad-auth-head span{display:block;color:#9f95a8;font-size:.74rem;margin-top:.18rem}.rad-auth-benefits{display:flex;gap:.4rem;flex-wrap:wrap;margin:1rem 0}.rad-auth-benefits span{font-size:.65rem;padding:.34rem .5rem;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.rad-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-bottom:1rem}.rad-auth-tabs button{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);color:#afa5b9;padding:.65rem;border-radius:13px;font-weight:850}.rad-auth-tabs button.active{color:#fff;border-color:rgba(255,45,141,.3);background:linear-gradient(120deg,rgba(255,45,141,.17),rgba(138,77,255,.18))}.rad-auth-pane{display:none}.rad-auth-pane.active{display:block}@media(max-width:640px){.chat-login-gate{align-items:flex-start;flex-wrap:wrap}.chat-login-gate button{margin-left:0;width:100%}.rad-auth-card{border-radius:22px;padding:1rem}}
    `;document.head.appendChild(s);
  }

  function installModal(){
    if($('#radAuthModal'))return;
    const modal=document.createElement('div');modal.id='radAuthModal';modal.className='rad-auth-modal';modal.innerHTML=`<div class="rad-auth-backdrop" data-close-auth></div><div class="rad-auth-card"><button class="rad-auth-close" type="button" data-close-auth>×</button><div class="rad-auth-head"><img src="/static/img/logo-rad.svg" alt=""><div><strong>Entre na resenha da RAD</strong><span>Faça login ou crie sua conta para participar do chat.</span></div></div><div class="rad-auth-benefits"><span>💬 Chat ao vivo</span><span>🔥 Reações</span><span>🎵 Pedidos</span><span>🏅 Emblemas</span></div><div class="rad-auth-tabs"><button class="active" type="button" data-tab="login">Entrar</button><button type="button" data-tab="register">Criar conta</button></div><div class="rad-auth-pane active" data-pane="login"><form id="radModalLogin"><input class="form-control mb-2" name="username" placeholder="Usuário" autocomplete="username" required><input class="form-control mb-3" name="password" type="password" placeholder="Senha" autocomplete="current-password" required><button class="btn btn-rad w-100"><i class="bi bi-box-arrow-in-right"></i> Entrar no chat</button></form></div><div class="rad-auth-pane" data-pane="register"><form id="radModalRegister"><input class="form-control mb-2" name="display_name" maxlength="80" placeholder="Nome exibido"><input class="form-control mb-2" name="username" minlength="3" maxlength="40" placeholder="Usuário" required><input class="form-control mb-2" name="email" type="email" placeholder="E-mail opcional"><input class="form-control mb-3" name="password" type="password" minlength="8" placeholder="Senha (8+ caracteres)" required><button class="btn btn-rad w-100"><i class="bi bi-person-plus-fill"></i> Criar conta e entrar</button></form></div></div>`;document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-auth]').forEach(x=>x.onclick=()=>modal.classList.remove('open'));
    modal.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{modal.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));modal.querySelectorAll('[data-pane]').forEach(x=>x.classList.toggle('active',x.dataset.pane===btn.dataset.tab));setTimeout(()=>modal.querySelector(`[data-pane="${btn.dataset.tab}"] input`)?.focus(),50)});
    $('#radModalLogin').onsubmit=e=>submitAuth(e,'login');$('#radModalRegister').onsubmit=e=>submitAuth(e,'register');
  }

  async function submitAuth(event,type){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
    try{const r=await fetch(`/api/auth/${type}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Não foi possível entrar');localStorage.setItem(TOKEN_KEY,data.access_token);localStorage.setItem('radio_user',JSON.stringify(data.user));localStorage.setItem('nickname',data.user.display_name||data.user.username);verifiedUser=data.user;$('#radAuthModal').classList.remove('open');applyAccess();location.hash='#chat';toast(type==='login'?`Bem-vindo, ${data.user.display_name}!`:'Conta criada com sucesso!')}catch(error){toast(error.message)}finally{button.disabled=false}
  }

  function openModal(tab='login'){installModal();const modal=$('#radAuthModal');modal.classList.add('open');modal.querySelector(`[data-tab="${tab}"]`)?.click()}

  function ensureGate(container){if(!container)return;const id=container.id==='homeChatMessages'?'homeChatLoginGate':'fullChatLoginGate';let gate=$(`#${id}`);if(!gate){gate=document.createElement('div');gate.id=id;gate.className='chat-login-gate';gate.innerHTML='<i class="bi bi-shield-lock-fill"></i><div><strong>Login obrigatório para participar</strong><span>Entre ou crie uma conta para conversar, reagir e pedir músicas.</span></div><button type="button" class="btn btn-sm btn-rad">Entrar / cadastrar</button>';gate.querySelector('button').onclick=()=>openModal();container.insertAdjacentElement('beforebegin',gate)}gate.classList.toggle('d-none',!!verifiedUser)}
  function setControl(el,enabled,placeholder){if(!el)return;el.disabled=!enabled;el.classList.toggle('chat-auth-locked',!enabled);if(placeholder&&'placeholder'in el)el.placeholder=placeholder}
  function applyAccess(){const logged=!!verifiedUser;ensureGate($('#homeChatMessages'));ensureGate($('#chatMessages'));const display=verifiedUser?.display_name||verifiedUser?.username||'';[$('#homeNickname'),$('#nickname')].filter(Boolean).forEach(el=>{el.value=logged?display:'';el.readOnly=true;el.disabled=!logged});setControl($('#homeChatInput'),logged,logged?'Digite sua mensagem...':'Faça login para participar do chat...');setControl($('#chatInput'),logged,logged?'Digite sua mensagem...':'Faça login para participar do chat...');setControl($('#homeChatForm button[type="submit"]'),logged);setControl($('#chatForm button[type="submit"]'),logged);$('.home-chat-panel')?.classList.toggle('chat-auth-member',logged);$('.chat-panel')?.classList.toggle('chat-auth-member',logged)}
  async function verify(){if(checking)return verifiedUser;const current=token();if(!current){verifiedUser=null;applyAccess();return null}checking=true;try{const r=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${current}`}});if(!r.ok)throw new Error();verifiedUser=await r.json()}catch{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem('radio_user');verifiedUser=null}finally{checking=false;applyAccess()}return verifiedUser}

  document.addEventListener('click',event=>{
    const chatLink=event.target.closest('a[href="#chat"],.nav-chat');
    if(chatLink&&!token()){event.preventDefault();event.stopImmediatePropagation();openModal();return}
    if(chatLink&&token()&&!verifiedUser){event.preventDefault();event.stopImmediatePropagation();verify().then(user=>{if(user)location.hash='#chat';else openModal()});return}
    const protectedControl=event.target.closest('.reaction-picker-toggle,.composer-emoji-toggle,[data-compose-emoji],#homeSongRequestBtn,#fullSongRequestBtn');
    if(protectedControl&&!verifiedUser){event.preventDefault();event.stopImmediatePropagation();toast('Faça login ou crie uma conta para usar este recurso.');openModal()}
  },true);
  document.addEventListener('submit',event=>{if(!event.target.matches('#homeChatForm,#chatForm,#chatSongRequestForm')||verifiedUser)return;event.preventDefault();event.stopImmediatePropagation();toast('Faça login ou crie uma conta para participar do chat.');openModal()},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#chat'&&!token())openModal()});

  function loadExtra(src,id){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;document.body.appendChild(s)}
  installStyles();installModal();verify();
  setInterval(verify,120000);
  window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY)verify()});
  loadExtra('/static/js/media-library.js?v=20260824-2228','mediaLibraryScriptV2');
})();
