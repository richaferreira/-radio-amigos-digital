(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const TOKEN_KEY='radio_token';
  let verifiedUser=null;
  let lastToken=null;
  let checking=false;

  function notify(message){
    const toast=$('#toast');
    if(toast){
      toast.textContent=message;
      toast.style.display='block';
      clearTimeout(notify._timer);
      notify._timer=setTimeout(()=>toast.style.display='none',3000);
    }
  }

  function token(){return localStorage.getItem(TOKEN_KEY)||'';}
  function goLogin(){location.hash='#chat';setTimeout(()=>$('#accountLoginForm input[name="username"]')?.focus(),120);}

  function installStyles(){
    if($('#chatAuthRequiredStyles'))return;
    const style=document.createElement('style');
    style.id='chatAuthRequiredStyles';
    style.textContent=`
      .chat-login-gate{display:flex;align-items:flex-start;gap:.8rem;margin:.65rem 0;padding:.85rem 1rem;border-radius:16px;border:1px solid rgba(255,45,141,.18);background:linear-gradient(110deg,rgba(255,45,141,.075),rgba(138,77,255,.07),rgba(34,211,238,.045));color:#dcd4e6}.chat-login-gate i{font-size:1.15rem;color:#ff7eb8;margin-top:.08rem}.chat-login-gate strong{display:block;font-size:.82rem}.chat-login-gate span{display:block;color:#9d94a8;font-size:.72rem;margin-top:.18rem}.chat-login-gate button{margin-left:auto;white-space:nowrap}
      .chat-auth-locked{opacity:.55;cursor:not-allowed!important}.chat-auth-locked::placeholder{color:#93899f!important}.chat-auth-member{box-shadow:inset 0 0 0 1px rgba(34,211,238,.08)}
      .chat-side-panel .auth-required-note{display:flex;gap:.55rem;align-items:flex-start;padding:.65rem .75rem;margin-bottom:.85rem;border-radius:13px;background:rgba(255,45,141,.065);border:1px solid rgba(255,45,141,.13);color:#cfc5d8;font-size:.72rem}.chat-side-panel .auth-required-note i{color:#ff76b4}
      @media(max-width:640px){.chat-login-gate{flex-wrap:wrap}.chat-login-gate button{margin-left:0;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureGate(container,where='beforebegin'){
    if(!container)return;
    const id=container.id==='homeChatMessages'?'homeChatLoginGate':'fullChatLoginGate';
    let gate=$(`#${id}`);
    if(!gate){
      gate=document.createElement('div');
      gate.id=id;
      gate.className='chat-login-gate';
      gate.innerHTML='<i class="bi bi-shield-lock-fill"></i><div><strong>Login obrigatório para participar</strong><span>Você pode acompanhar a conversa. Para enviar mensagens, reagir e pedir música, entre ou crie sua conta.</span></div><button type="button" class="btn btn-sm btn-rad">Entrar / cadastrar</button>';
      gate.querySelector('button').addEventListener('click',goLogin);
      container.insertAdjacentElement(where,gate);
    }
    gate.classList.toggle('d-none',!!verifiedUser);
  }

  function setControl(el,enabled,placeholder){
    if(!el)return;
    if(el.matches('input,textarea')){
      el.disabled=!enabled;
      el.classList.toggle('chat-auth-locked',!enabled);
      if(placeholder&&el.placeholder!==placeholder)el.placeholder=placeholder;
    }else{
      el.disabled=!enabled;
      el.classList.toggle('chat-auth-locked',!enabled);
    }
  }

  function applyAccess(){
    const logged=!!verifiedUser;
    ensureGate($('#homeChatMessages'));
    ensureGate($('#chatMessages'));

    const display=verifiedUser?.display_name||verifiedUser?.username||'';
    const homeNick=$('#homeNickname');
    const fullNick=$('#nickname');
    [homeNick,fullNick].filter(Boolean).forEach(el=>{
      if(el.value!==(logged?display:''))el.value=logged?display:'';
      el.readOnly=true;
      el.disabled=!logged;
      el.classList.toggle('chat-auth-locked',!logged);
    });

    setControl($('#homeChatInput'),logged,logged?'Digite sua mensagem...':'Faça login para participar do chat...');
    setControl($('#chatInput'),logged,logged?'Digite sua mensagem...':'Faça login para participar do chat...');
    setControl($('#homeChatForm button[type="submit"]'),logged);
    setControl($('#chatForm button[type="submit"]'),logged);

    $$('.composer-emoji-toggle,.chat-request-trigger').forEach(btn=>btn.classList.toggle('chat-auth-locked',!logged));
    $('.home-chat-panel')?.classList.toggle('chat-auth-member',logged);
    $('.chat-panel')?.classList.toggle('chat-auth-member',logged);

    const panel=$('#accountLoginForm')?.closest('.chat-side-panel');
    if(panel){
      let note=panel.querySelector('.auth-required-note');
      if(!note){
        note=document.createElement('div');
        note.className='auth-required-note';
        note.innerHTML='<i class="bi bi-shield-check"></i><span>Cadastro ou login é obrigatório para conversar, reagir e pedir música pelo chat.</span>';
        panel.prepend(note);
      }
      if(!logged){
        const title=panel.querySelector('h4');
        const desc=panel.querySelector('h4 + p');
        const titleText='Login obrigatório';
        const descText='Entre ou crie sua conta para participar da comunidade da Rádio Amigos Digital.';
        if(title&&title.textContent!==titleText)title.textContent=titleText;
        if(desc&&desc.textContent!==descText)desc.textContent=descText;
      }
    }
  }

  async function verify(force=false){
    const current=token();
    if(checking)return;

    if(!current){
      if(lastToken===''&&verifiedUser===null&&!force)return;
      lastToken='';
      verifiedUser=null;
      applyAccess();
      return;
    }

    if(!force&&current===lastToken&&verifiedUser)return;

    checking=true;
    lastToken=current;
    try{
      const response=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${current}`}});
      if(!response.ok)throw new Error('Sessão inválida');
      verifiedUser=await response.json();
    }catch{
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('radio_user');
      verifiedUser=null;
      lastToken='';
    }finally{
      checking=false;
      applyAccess();
    }
  }

  function messageIdFor(el){return Number(el.closest('.chat-item[data-id]')?.dataset.id||0);}
  function emojiFor(el){return el.dataset.emoji||el.dataset.summaryEmoji||'';}

  document.addEventListener('click',event=>{
    const react=event.target.closest('.home-react-btn,.community-react-btn,.react-btn,[data-summary-emoji]');
    if(react){
      event.preventDefault();
      event.stopImmediatePropagation();
      if(!verifiedUser){notify('Faça login para reagir às mensagens.');goLogin();return;}
      const messageId=messageIdFor(react);
      const emoji=emojiFor(react);
      if(messageId&&emoji&&typeof socket!=='undefined'){
        socket.emit('react_message',{message_id:messageId,emoji,token:token()});
      }
      return;
    }

    const protectedControl=event.target.closest('.reaction-picker-toggle,.composer-emoji-toggle,[data-compose-emoji],#homeSongRequestBtn,#fullSongRequestBtn');
    if(protectedControl&&!verifiedUser){
      event.preventDefault();
      event.stopImmediatePropagation();
      notify('Faça login ou crie uma conta para usar este recurso.');
      goLogin();
    }
  },true);

  document.addEventListener('submit',event=>{
    if(!event.target.matches('#homeChatForm,#chatForm,#chatSongRequestForm'))return;
    if(verifiedUser)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    notify('Faça login ou crie uma conta para participar do chat.');
    goLogin();
  },true);

  installStyles();
  verify(true);

  // Poll leve apenas para detectar login/logout feito nesta mesma aba.
  // Não observa o DOM e não reescreve a página continuamente.
  setInterval(()=>verify(false),1500);
  setInterval(()=>verify(true),120000);
  window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY)verify(true);});
})();
