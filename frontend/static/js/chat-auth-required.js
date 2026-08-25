(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const TOKEN_KEY='radio_token';
  let verifiedUser=null;
  let checking=false;

  const token=()=>localStorage.getItem(TOKEN_KEY)||'';
  const toast=message=>{const t=$('#toast');if(!t)return;t.textContent=message;t.style.display='block';clearTimeout(toast._t);toast._t=setTimeout(()=>t.style.display='none',3000)};

  function installStyles(){
    if($('#chatAuthRequiredStyles'))return;
    const s=document.createElement('style');s.id='chatAuthRequiredStyles';s.textContent=`
      .chat-login-gate{display:flex;align-items:center;gap:.8rem;margin:.65rem 0;padding:.85rem 1rem;border-radius:16px;border:1px solid rgba(255,45,141,.18);background:linear-gradient(110deg,rgba(255,45,141,.075),rgba(138,77,255,.07),rgba(34,211,238,.045));color:#dcd4e6}.chat-login-gate i{font-size:1.15rem;color:#ff7eb8}.chat-login-gate strong{display:block;font-size:.82rem}.chat-login-gate span{display:block;color:#9d94a8;font-size:.72rem;margin-top:.18rem}.chat-login-gate button{margin-left:auto;white-space:nowrap}.chat-auth-locked{opacity:.72;cursor:pointer!important}.chat-auth-member{box-shadow:inset 0 0 0 1px rgba(34,211,238,.08)}
      .rad-auth-modal{position:fixed;inset:0;z-index:120000;display:none;align-items:center;justify-content:center;padding:1rem}.rad-auth-modal.open{display:flex}.rad-auth-backdrop{position:absolute;inset:0;background:rgba(2,1,7,.88);backdrop-filter:blur(10px)}.rad-auth-card{position:relative;width:min(520px,100%);border-radius:28px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 100% 0,rgba(34,211,238,.12),transparent 30%),radial-gradient(circle at 0 0,rgba(255,45,141,.15),transparent 34%),#0d0915;box-shadow:0 35px 100px rgba(0,0,0,.72),0 0 60px rgba(138,77,255,.16);padding:1.35rem}.rad-auth-close{position:absolute;right:15px;top:14px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:1.25rem}.rad-auth-head{display:flex;align-items:center;gap:.8rem;padding-right:2.6rem}.rad-auth-head img{width:54px;height:54px;border-radius:15px}.rad-auth-head strong{display:block;font-size:1.08rem}.rad-auth-head span{display:block;color:#9f95a8;font-size:.74rem;margin-top:.18rem}.rad-auth-benefits{display:flex;gap:.4rem;flex-wrap:wrap;margin:1rem 0}.rad-auth-benefits span{font-size:.65rem;padding:.34rem .5rem;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.rad-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-bottom:1rem}.rad-auth-tabs button{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);color:#afa5b9;padding:.65rem;border-radius:13px;font-weight:850}.rad-auth-tabs button.active{color:#fff;border-color:rgba(255,45,141,.3);background:linear-gradient(120deg,rgba(255,45,141,.17),rgba(138,77,255,.18))}.rad-auth-pane{display:none}.rad-auth-pane.active{display:block}
      .site-online-float{position:absolute;z-index:8;right:18px;top:88px;display:grid;grid-template-columns:auto auto;align-items:center;column-gap:.45rem;min-width:105px;padding:.58rem .75rem;border-radius:16px;border:1px solid rgba(74,222,128,.2);background:rgba(7,12,14,.76);backdrop-filter:blur(14px);box-shadow:0 14px 34px rgba(0,0,0,.25)}.site-online-float .site-online-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 14px #4ade80;animation:siteOnlinePulse 1.5s ease-in-out infinite}.site-online-float strong{font-size:1.05rem;color:#fff}.site-online-float small{grid-column:2;color:#8ff5c6;font-size:.58rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.nav-online-chip{display:inline-flex;align-items:center;gap:.35rem;margin-left:.5rem;padding:.35rem .55rem;border-radius:999px;border:1px solid rgba(74,222,128,.18);background:rgba(74,222,128,.06);color:#a7f3d0;font-size:.65rem;font-weight:850}.nav-online-chip i{font-size:.52rem;color:#4ade80}@keyframes siteOnlinePulse{50%{opacity:.45;transform:scale(.78)}}
      .hero-stage-v2 .hero-art{object-fit:cover!important;aspect-ratio:9/7!important;border-radius:28px!important;background:#05030b!important}.hero-center-play.rad-transparent-hotspot{opacity:0!important;background:transparent!important;border:0!important;box-shadow:none!important;width:130px!important;height:130px!important;cursor:pointer!important}
      @media(max-width:640px){.chat-login-gate{align-items:flex-start;flex-wrap:wrap}.chat-login-gate button{margin-left:0;width:100%}.rad-auth-card{border-radius:22px;padding:1rem}.site-online-float{right:12px;top:80px;transform:scale(.9);transform-origin:top right}.nav-online-chip{display:none}}
    `;document.head.appendChild(s);
  }

  function fixHero(){
    const hero=$('.hero-stage-v2 .hero-art');if(!hero)return;
    hero.src='/static/img/hero-radio.svg?v=20260825-2355';
    hero.alt='Robô DJ realista da Rádio Amigos Digital';
    hero.onerror=()=>{hero.onerror=null;hero.src='/static/img/logo-rad.svg?v=20260825-2355'};
    hero.style.cursor='pointer';
    if(hero.dataset.playBound!=='1'){hero.dataset.playBound='1';hero.addEventListener('click',()=>$('#heroPlay')?.click())}
    const visual=$('#heroVisualPlay');if(visual){visual.classList.add('rad-transparent-hotspot');visual.innerHTML=''}
  }

  function installOnlineCounter(){
    const stage=$('.hero-stage-v2');
    if(stage&&!$('#siteOnlineFloat')){const box=document.createElement('div');box.id='siteOnlineFloat';box.className='site-online-float';box.innerHTML='<span class="site-online-dot"></span><strong id="siteOnlineCount">0</strong><small>online no site</small>';stage.appendChild(box)}
    const nav=$('.navbar-nav');
    if(nav&&!$('#navOnlineChip')){const chip=document.createElement('span');chip.id='navOnlineChip';chip.className='nav-online-chip';chip.innerHTML='<i class="bi bi-circle-fill"></i><span id="navOnlineCount">0</span> online';nav.appendChild(chip)}
    if(typeof socket!=='undefined'){
      socket.on('online_count',data=>{const count=Math.max(0,Number(data?.count||0));if($('#siteOnlineCount'))$('#siteOnlineCount').textContent=count;if($('#navOnlineCount'))$('#navOnlineCount').textContent=count});
      socket.emit('get_online_count');
    }
  }

  function installModal(){
    if($('#radAuthModal'))return;
    const modal=document.createElement('div');modal.id='radAuthModal';modal.className='rad-auth-modal';
    modal.innerHTML=`<div class="rad-auth-backdrop" data-close-auth></div><div class="rad-auth-card"><button class="rad-auth-close" type="button" data-close-auth>×</button><div class="rad-auth-head"><img src="/static/img/logo-rad.svg?v=20260825-2355" alt=""><div><strong>Entre na resenha da RAD</strong><span>Para participar do chat é necessário entrar ou criar uma conta.</span></div></div><div class="rad-auth-benefits"><span>💬 Chat ao vivo</span><span>🔥 Reações</span><span>🎵 Pedidos</span><span>🏅 Emblemas</span></div><div class="rad-auth-tabs"><button class="active" type="button" data-tab="login">Entrar</button><button type="button" data-tab="register">Criar conta</button></div><div class="rad-auth-pane active" data-pane="login"><form id="radModalLogin"><input class="form-control mb-2" name="username" placeholder="Usuário" autocomplete="username" required><input class="form-control mb-3" name="password" type="password" placeholder="Senha" autocomplete="current-password" required><button class="btn btn-rad w-100"><i class="bi bi-box-arrow-in-right"></i> Entrar no chat</button></form></div><div class="rad-auth-pane" data-pane="register"><form id="radModalRegister"><input class="form-control mb-2" name="display_name" maxlength="80" placeholder="Nome exibido"><input class="form-control mb-2" name="username" minlength="3" maxlength="40" placeholder="Usuário" required><input class="form-control mb-2" name="email" type="email" placeholder="E-mail opcional"><input class="form-control mb-3" name="password" type="password" minlength="8" placeholder="Senha (8+ caracteres)" required><button class="btn btn-rad w-100"><i class="bi bi-person-plus-fill"></i> Criar conta e entrar</button></form></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-auth]').forEach(x=>x.addEventListener('click',closeModal));
    modal.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{modal.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));modal.querySelectorAll('[data-pane]').forEach(x=>x.classList.toggle('active',x.dataset.pane===btn.dataset.tab));setTimeout(()=>modal.querySelector(`[data-pane="${btn.dataset.tab}"] input`)?.focus(),40)}));
    $('#radModalLogin').addEventListener('submit',e=>submitAuth(e,'login'));
    $('#radModalRegister').addEventListener('submit',e=>submitAuth(e,'register'));
  }

  function closeModal(){$('#radAuthModal')?.classList.remove('open');document.body.style.overflow=''}
  function openModal(tab='login'){installModal();const modal=$('#radAuthModal');modal.classList.add('open');document.body.style.overflow='hidden';modal.querySelector(`[data-tab="${tab}"]`)?.click()}
  window.RAD_OPEN_AUTH=openModal;

  async function submitAuth(event,type){
    event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');button.disabled=true;
    try{
      const r=await fetch(`/api/auth/${type}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Não foi possível entrar');
      localStorage.setItem(TOKEN_KEY,data.access_token);localStorage.setItem('radio_user',JSON.stringify(data.user));localStorage.setItem('nickname',data.user.display_name||data.user.username);verifiedUser=data.user;closeModal();applyAccess();location.hash='#chat';toast(type==='login'?`Bem-vindo, ${data.user.display_name}!`:'Conta criada com sucesso!');
    }catch(error){toast(error.message)}finally{button.disabled=false}
  }

  function ensureGate(container){
    if(!container)return;const id=container.id==='homeChatMessages'?'homeChatLoginGate':'fullChatLoginGate';let gate=$(`#${id}`);
    if(!gate){gate=document.createElement('div');gate.id=id;gate.className='chat-login-gate';gate.innerHTML='<i class="bi bi-shield-lock-fill"></i><div><strong>Login obrigatório para participar</strong><span>Entre ou crie uma conta para conversar, reagir e pedir músicas.</span></div><button type="button" class="btn btn-sm btn-rad">Entrar / cadastrar</button>';gate.querySelector('button').addEventListener('click',()=>openModal());container.insertAdjacentElement('beforebegin',gate)}
    gate.classList.toggle('d-none',!!verifiedUser);
  }

  function applyAccess(){
    const logged=!!verifiedUser;ensureGate($('#homeChatMessages'));ensureGate($('#chatMessages'));const display=verifiedUser?.display_name||verifiedUser?.username||'';
    [$('#homeNickname'),$('#nickname')].filter(Boolean).forEach(el=>{el.disabled=false;el.readOnly=true;el.value=logged?display:'';el.classList.toggle('chat-auth-locked',!logged)});
    [$('#homeChatInput'),$('#chatInput')].filter(Boolean).forEach(el=>{el.disabled=false;el.readOnly=!logged;el.classList.toggle('chat-auth-locked',!logged);el.placeholder=logged?'Digite sua mensagem...':'Clique para entrar ou criar sua conta...'});
    const homeSend=$('#homeChatForm button[type="submit"]'),fullSend=$('#chatForm button[type="submit"]');if(homeSend)homeSend.disabled=!logged;if(fullSend)fullSend.disabled=!logged;
    $('.home-chat-panel')?.classList.toggle('chat-auth-member',logged);$('.chat-panel')?.classList.toggle('chat-auth-member',logged);
  }

  async function verify(){
    if(checking)return verifiedUser;const current=token();if(!current){verifiedUser=null;applyAccess();return null}checking=true;
    try{const r=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${current}`}});if(!r.ok)throw new Error();verifiedUser=await r.json()}
    catch{localStorage.removeItem(TOKEN_KEY);localStorage.removeItem('radio_user');verifiedUser=null}
    finally{checking=false;applyAccess()}
    return verifiedUser;
  }

  function isChatLink(target){return target.closest('a[href="#chat"],.nav-chat,.action-card[href="#chat"],.cta-banner a[href="#chat"],.text-link[href="#chat"]')}
  function isProtectedChatControl(target){return target.closest('#homeChatInput,#homeNickname,#chatInput,#nickname,#homeChatForm button[type="submit"],#chatForm button[type="submit"],.reaction-picker-toggle,.composer-emoji-toggle,[data-compose-emoji],#homeSongRequestBtn,#fullSongRequestBtn,.home-react-btn,.community-react-btn,.react-btn,[data-summary-emoji],.chat-login-gate button')}

  function interceptChat(event){
    const link=isChatLink(event.target),control=isProtectedChatControl(event.target);if(!link&&!control)return;
    if(verifiedUser){if(link&&event.type==='pointerdown'){event.preventDefault();location.hash='#chat'}return}
    event.preventDefault();event.stopImmediatePropagation();
    if(!token())openModal();else verify().then(user=>{if(user){if(link)location.hash='#chat'}else openModal()});
  }

  document.addEventListener('pointerdown',interceptChat,true);
  document.addEventListener('click',interceptChat,true);
  document.addEventListener('focusin',event=>{if(!verifiedUser&&event.target.matches('#homeChatInput,#homeNickname,#chatInput,#nickname')){event.target.blur();openModal()}},true);
  document.addEventListener('submit',event=>{if(!verifiedUser&&event.target.matches('#homeChatForm,#chatForm,#chatSongRequestForm')){event.preventDefault();event.stopImmediatePropagation();openModal()}},true);
  window.addEventListener('hashchange',()=>{if(location.hash==='#chat'&&!verifiedUser)verify().then(user=>{if(!user)openModal()})});
  window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY)verify()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

  function loadExtra(src,id){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;document.body.appendChild(s)}

  installStyles();fixHero();installOnlineCounter();installModal();verify();setTimeout(applyAccess,200);setTimeout(applyAccess,800);setInterval(verify,120000);loadExtra('/static/js/media-library.js?v=20260825-2355','mediaLibraryScriptV4');
})();
