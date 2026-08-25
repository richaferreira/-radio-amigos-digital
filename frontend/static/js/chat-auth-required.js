(()=>{
  if(window.__RAD_CHAT_AUTH_REQUIRED__)return;
  window.__RAD_CHAT_AUTH_REQUIRED__=true;

  const $=s=>document.querySelector(s);
  const TOKEN_KEY='radio_token';
  let verifiedUser=null;
  let checking=false;

  const token=()=>localStorage.getItem(TOKEN_KEY)||'';
  const toast=message=>{
    const el=$('#toast');
    if(!el)return;
    el.textContent=message;
    el.style.display='block';
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>el.style.display='none',2800);
  };

  function installStyles(){
    if($('#chatAuthRequiredStyles'))return;
    const style=document.createElement('style');
    style.id='chatAuthRequiredStyles';
    style.textContent=`
      .rad-auth-modal{position:fixed;inset:0;z-index:120000;display:none;align-items:center;justify-content:center;padding:1rem}.rad-auth-modal.open{display:flex}.rad-auth-backdrop{position:absolute;inset:0;background:rgba(2,1,7,.9);backdrop-filter:blur(10px)}.rad-auth-card{position:relative;width:min(520px,100%);border-radius:26px;border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 100% 0,rgba(34,211,238,.12),transparent 30%),radial-gradient(circle at 0 0,rgba(255,45,141,.14),transparent 35%),#0d0915;box-shadow:0 35px 100px rgba(0,0,0,.75);padding:1.35rem}.rad-auth-close{position:absolute;right:15px;top:14px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff}.rad-auth-head{display:flex;align-items:center;gap:.8rem;padding-right:2.5rem}.rad-auth-head img{width:52px;height:52px}.rad-auth-head strong{display:block}.rad-auth-head span{display:block;color:#9f95a8;font-size:.76rem}.rad-auth-benefits{display:flex;gap:.4rem;flex-wrap:wrap;margin:1rem 0}.rad-auth-benefits span{font-size:.67rem;padding:.34rem .5rem;border-radius:999px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.07)}.rad-auth-tabs{display:grid;grid-template-columns:1fr 1fr;gap:.45rem;margin-bottom:1rem}.rad-auth-tabs button{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);color:#afa5b9;padding:.65rem;border-radius:13px;font-weight:850}.rad-auth-tabs button.active{color:#fff;border-color:rgba(255,45,141,.3);background:linear-gradient(120deg,rgba(255,45,141,.17),rgba(138,77,255,.18))}.rad-auth-pane{display:none}.rad-auth-pane.active{display:block}
      .chat-login-gate{display:flex;align-items:center;gap:.8rem;margin:.65rem 0;padding:.85rem 1rem;border-radius:16px;border:1px solid rgba(255,45,141,.18);background:linear-gradient(110deg,rgba(255,45,141,.075),rgba(138,77,255,.07));color:#dcd4e6}.chat-login-gate i{color:#ff7eb8;font-size:1.15rem}.chat-login-gate strong{display:block;font-size:.82rem}.chat-login-gate span{display:block;color:#9d94a8;font-size:.72rem}.chat-login-gate button{margin-left:auto}.chat-auth-locked{cursor:pointer!important;opacity:.82}
      .site-online-float{position:absolute;z-index:12;right:18px;top:88px;display:grid;grid-template-columns:auto auto;align-items:center;column-gap:.45rem;min-width:112px;padding:.58rem .75rem;border-radius:16px;border:1px solid rgba(74,222,128,.22);background:rgba(7,12,14,.78);backdrop-filter:blur(14px)}.site-online-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;box-shadow:0 0 14px #4ade80}.site-online-float strong{font-size:1.05rem}.site-online-float small{grid-column:2;color:#8ff5c6;font-size:.58rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.nav-online-chip{display:inline-flex;align-items:center;gap:.35rem;margin-left:.5rem;padding:.35rem .55rem;border-radius:999px;border:1px solid rgba(74,222,128,.18);background:rgba(74,222,128,.06);color:#a7f3d0;font-size:.65rem;font-weight:850}
      .hero-stage-v2 .hero-art-shell{display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;background:radial-gradient(circle at 50% 45%,rgba(82,36,135,.2),#05030b 70%)!important}.hero-stage-v2 .hero-art{width:82%!important;height:82%!important;max-width:82%!important;object-fit:contain!important;object-position:center!important;aspect-ratio:1/1!important;border-radius:24px!important;background:#05030b!important;filter:drop-shadow(0 24px 48px rgba(0,0,0,.52)) drop-shadow(0 0 28px rgba(138,77,255,.16))!important}.hero-center-play.rad-transparent-hotspot{opacity:0!important;background:transparent!important;border:0!important;box-shadow:none!important;width:118px!important;height:118px!important;cursor:pointer!important}
      @media(max-width:640px){.rad-auth-card{padding:1rem;border-radius:21px}.chat-login-gate{align-items:flex-start;flex-wrap:wrap}.chat-login-gate button{width:100%;margin-left:0}.site-online-float{right:10px;top:76px;transform:scale(.88);transform-origin:top right}.nav-online-chip{display:none}.hero-stage-v2 .hero-art{width:90%!important;height:90%!important;max-width:90%!important}}
    `;
    document.head.appendChild(style);
  }

  async function loadRealisticHero(){
    const hero=$('.hero-stage-v2 .hero-art');
    if(!hero)return;
    hero.alt='Robô DJ metálico realista da Rádio Amigos Digital';
    hero.style.cursor='pointer';
    if(hero.dataset.playBound!=='1'){
      hero.dataset.playBound='1';
      hero.addEventListener('click',()=>$('#heroPlay')?.click());
    }
    const visual=$('#heroVisualPlay');
    if(visual){visual.classList.add('rad-transparent-hotspot');visual.innerHTML='';}
    try{
      const response=await fetch('/static/img/hero-radio-realistic-384.b64?v=20260825-12',{cache:'no-store'});
      if(!response.ok)throw new Error('hero indisponível');
      const encoded=(await response.text()).trim();
      if(encoded.length<1000)throw new Error('hero inválido');
      hero.src=`data:image/jpeg;base64,${encoded}`;
    }catch(error){
      console.warn('Falha ao carregar hero realista',error);
      hero.src='/static/img/hero-radio-final.jpg?v=20260825-12';
    }
  }

  function installOnlineCounter(){
    const stage=$('.hero-stage-v2');
    if(stage&&!$('#siteOnlineFloat')){
      const box=document.createElement('div');
      box.id='siteOnlineFloat';
      box.className='site-online-float';
      box.innerHTML='<span class="site-online-dot"></span><strong id="siteOnlineCount">0</strong><small>online no site</small>';
      stage.appendChild(box);
    }
    const nav=$('.navbar-nav');
    if(nav&&!$('#navOnlineChip')){
      const chip=document.createElement('span');
      chip.id='navOnlineChip';
      chip.className='nav-online-chip';
      chip.innerHTML='<i class="bi bi-circle-fill"></i><span id="navOnlineCount">0</span> online';
      nav.appendChild(chip);
    }
    if(typeof socket!=='undefined'){
      socket.on('online_count',data=>{
        const count=Math.max(0,Number(data?.count||0));
        if($('#siteOnlineCount'))$('#siteOnlineCount').textContent=count;
        if($('#navOnlineCount'))$('#navOnlineCount').textContent=count;
      });
      socket.emit('get_online_count');
    }
  }

  function installModal(){
    if($('#radAuthModal'))return;
    const modal=document.createElement('div');
    modal.id='radAuthModal';
    modal.className='rad-auth-modal';
    modal.innerHTML=`<div class="rad-auth-backdrop" data-close-auth></div><div class="rad-auth-card"><button class="rad-auth-close" type="button" data-close-auth>×</button><div class="rad-auth-head"><img src="/static/img/logo-rad.svg" alt=""><div><strong>Entre na resenha da RAD</strong><span>Para conversar, reagir e participar do chat é necessário entrar ou criar uma conta.</span></div></div><div class="rad-auth-benefits"><span>💬 Chat ao vivo</span><span>🔥 Reações</span><span>🎵 Pedidos</span><span>🏅 Emblemas</span></div><div class="rad-auth-tabs"><button class="active" type="button" data-tab="login">Entrar</button><button type="button" data-tab="register">Criar conta</button></div><div class="rad-auth-pane active" data-pane="login"><form id="radModalLogin"><input class="form-control mb-2" name="username" placeholder="Usuário" autocomplete="username" required><input class="form-control mb-3" name="password" type="password" placeholder="Senha" autocomplete="current-password" required><button class="btn btn-rad w-100">Entrar no chat</button></form></div><div class="rad-auth-pane" data-pane="register"><form id="radModalRegister"><input class="form-control mb-2" name="display_name" maxlength="80" placeholder="Nome exibido"><input class="form-control mb-2" name="username" minlength="3" maxlength="40" placeholder="Usuário" required><input class="form-control mb-2" name="email" type="email" placeholder="E-mail opcional"><input class="form-control mb-3" name="password" type="password" minlength="8" placeholder="Senha (8+ caracteres)" required><button class="btn btn-rad w-100">Criar conta e entrar</button></form></div></div>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-close-auth]').forEach(el=>el.addEventListener('click',closeModal));
    modal.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{
      modal.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));
      modal.querySelectorAll('[data-pane]').forEach(x=>x.classList.toggle('active',x.dataset.pane===btn.dataset.tab));
      setTimeout(()=>modal.querySelector(`[data-pane="${btn.dataset.tab}"] input`)?.focus(),40);
    }));
    $('#radModalLogin').addEventListener('submit',event=>submitAuth(event,'login'));
    $('#radModalRegister').addEventListener('submit',event=>submitAuth(event,'register'));
  }

  function closeModal(){
    $('#radAuthModal')?.classList.remove('open');
    document.body.style.overflow='';
  }

  function openModal(tab='login'){
    installModal();
    const modal=$('#radAuthModal');
    modal.classList.add('open');
    document.body.style.overflow='hidden';
    modal.querySelector(`[data-tab="${tab}"]`)?.click();
  }
  window.RAD_OPEN_AUTH=openModal;

  async function submitAuth(event,type){
    event.preventDefault();
    const form=event.currentTarget;
    const button=form.querySelector('button');
    button.disabled=true;
    try{
      const response=await fetch(`/api/auth/${type}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'Não foi possível entrar');
      localStorage.setItem(TOKEN_KEY,data.access_token);
      localStorage.setItem('radio_user',JSON.stringify(data.user));
      localStorage.setItem('nickname',data.user.display_name||data.user.username);
      verifiedUser=data.user;
      closeModal();
      applyAccess();
      location.hash='#chat';
      toast(type==='login'?`Bem-vindo, ${data.user.display_name}!`:'Conta criada com sucesso!');
    }catch(error){toast(error.message)}finally{button.disabled=false}
  }

  function ensureGate(container){
    if(!container)return;
    const id=container.id==='homeChatMessages'?'homeChatLoginGate':'fullChatLoginGate';
    let gate=$(`#${id}`);
    if(!gate){
      gate=document.createElement('div');
      gate.id=id;
      gate.className='chat-login-gate';
      gate.innerHTML='<i class="bi bi-shield-lock-fill"></i><div><strong>Login obrigatório para participar</strong><span>Entre ou crie uma conta para conversar, reagir e pedir músicas.</span></div><button type="button" class="btn btn-sm btn-rad">Entrar / cadastrar</button>';
      gate.querySelector('button').addEventListener('click',()=>openModal());
      container.insertAdjacentElement('beforebegin',gate);
    }
    gate.classList.toggle('d-none',!!verifiedUser);
  }

  function applyAccess(){
    const logged=!!verifiedUser;
    ensureGate($('#homeChatMessages'));
    ensureGate($('#chatMessages'));
    const display=verifiedUser?.display_name||verifiedUser?.username||'';
    [$('#homeNickname'),$('#nickname')].filter(Boolean).forEach(el=>{
      el.disabled=false;
      el.readOnly=true;
      el.value=logged?display:'';
      el.classList.toggle('chat-auth-locked',!logged);
    });
    [$('#homeChatInput'),$('#chatInput')].filter(Boolean).forEach(el=>{
      el.disabled=false;
      el.readOnly=!logged;
      el.classList.toggle('chat-auth-locked',!logged);
      el.placeholder=logged?'Digite sua mensagem...':'Clique aqui para entrar ou criar sua conta...';
    });
    const homeSend=$('#homeChatForm button[type="submit"]');
    const fullSend=$('#chatForm button[type="submit"]');
    if(homeSend)homeSend.disabled=!logged;
    if(fullSend)fullSend.disabled=!logged;
  }

  async function verify(){
    if(checking)return verifiedUser;
    const jwt=token();
    if(!jwt){verifiedUser=null;applyAccess();return null;}
    checking=true;
    try{
      const response=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${jwt}`}});
      if(!response.ok)throw new Error('Sessão inválida');
      verifiedUser=await response.json();
    }catch{
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('radio_user');
      verifiedUser=null;
    }finally{
      checking=false;
      applyAccess();
    }
    return verifiedUser;
  }

  function chatTarget(target){
    return target.closest('a[href="#chat"],.nav-chat,.home-chat-panel,#homeChatMessages,#homeChatInput,#homeNickname,#chatInput,#nickname,#homeChatForm,#chatForm,.action-card[href="#chat"],.cta-banner a[href="#chat"]');
  }

  function interceptChat(event){
    if(verifiedUser)return;
    const target=chatTarget(event.target);
    if(!target||event.target.closest('#radAuthModal'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if(!token())openModal();
    else verify().then(user=>{if(!user)openModal();});
  }

  document.addEventListener('pointerdown',interceptChat,true);
  document.addEventListener('click',interceptChat,true);
  document.addEventListener('focusin',event=>{
    if(verifiedUser)return;
    if(event.target.matches('#homeChatInput,#homeNickname,#chatInput,#nickname')){
      event.target.blur();
      openModal();
    }
  },true);

  function loadReactionFix(){
    if(document.querySelector('script[data-reaction-auth-fix]'))return;
    const script=document.createElement('script');
    script.dataset.reactionAuthFix='1';
    script.src='/static/js/reaction-auth-fix.js?v=20260825-12';
    document.body.appendChild(script);
  }

  installStyles();
  installModal();
  loadRealisticHero();
  installOnlineCounter();
  loadReactionFix();
  verify();
  window.addEventListener('storage',event=>{if(event.key===TOKEN_KEY)verify();});
})();
