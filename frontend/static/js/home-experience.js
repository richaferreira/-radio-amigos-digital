(()=>{
  const $=s=>document.querySelector(s);
  const toastEl=$('#toast');
  const messagesEl=$('#homeChatMessages');
  const form=$('#homeChatForm');
  const nicknameEl=$('#homeNickname');
  const inputEl=$('#homeChatInput');
  const REACTIONS=['👍','❤️','🔥','😂','👏','😍','🎉','💯','😎','🤯','🎧','🎵'];
  const messageCache=new Map();
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));

  function toast(message){
    if(!toastEl) return;
    toastEl.textContent=message;
    toastEl.style.display='block';
    clearTimeout(toast._t);
    toast._t=setTimeout(()=>toastEl.style.display='none',3000);
  }

  const visualPlay=$('#heroVisualPlay');
  visualPlay?.addEventListener('click',()=>$('#heroPlay')?.click());

  function syncNickname(value,locked=false){
    const nick=value||localStorage.getItem('nickname')||'';
    if(nicknameEl){nicknameEl.value=nick;nicknameEl.readOnly=locked;}
    const mainNick=$('#nickname');
    if(mainNick){mainNick.value=nick;mainNick.readOnly=locked;}
  }

  const loginForm=$('#accountLoginForm');
  const registerForm=$('#accountRegisterForm');
  const authPanel=loginForm?.closest('.chat-side-panel');
  const registerDetails=registerForm?.closest('details');
  const authTitle=authPanel?.querySelector('h4');
  const authDescription=authPanel?.querySelector('h4 + p');
  let seenAuthToken=null;

  function renderLoggedOut(){
    loginForm?.classList.remove('d-none');
    registerDetails?.classList.remove('d-none');
    authPanel?.querySelector('#accountLoggedBox')?.remove();
    if(authTitle) authTitle.textContent='Conta opcional';
    if(authDescription) authDescription.textContent='Converse só com apelido ou entre com sua conta para identificar seu perfil.';
    syncNickname(localStorage.getItem('nickname')||'',false);
  }

  function badgeHtml(badges=[]){
    return badges.slice(0,4).map(b=>`<span class="chat-user-badge badge-${esc(b.color||'purple')}" title="${esc(b.description||b.name)}"><span>${esc(b.icon||'🏅')}</span>${esc(b.name)}</span>`).join('');
  }

  function renderLoggedIn(user){
    if(!user) return renderLoggedOut();
    loginForm?.classList.add('d-none');
    registerDetails?.classList.add('d-none');
    if(authTitle) authTitle.textContent='Sua conta';
    if(authDescription) authDescription.textContent=`Você está conectado como ${user.display_name}.`;
    localStorage.setItem('nickname',user.display_name||user.username||'Ouvinte');
    localStorage.setItem('radio_user',JSON.stringify(user));
    syncNickname(user.display_name||user.username||'Ouvinte',true);

    let box=authPanel?.querySelector('#accountLoggedBox');
    if(!box && authPanel){
      box=document.createElement('div');
      box.id='accountLoggedBox';
      authDescription?.insertAdjacentElement('afterend',box);
    }
    if(box){
      box.innerHTML=`<div class="p-3 rounded-3 border border-secondary-subtle mb-3 account-community-card">
        <div class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-person-check-fill text-info"></i><strong>${esc(user.display_name||user.username)}</strong><span class="role-pill role-${esc(user.role||'listener')}">${esc(user.role||'listener')}</span></div>
        <div class="small text-secondary mb-2">@${esc(user.username)}</div>
        <div class="chat-badges mb-3">${badgeHtml(user.badges||[])||'<span class="small text-secondary">Sem emblemas ainda</span>'}</div>
        <button id="accountLogoutBtn" class="btn btn-sm btn-outline-danger w-100" type="button"><i class="bi bi-box-arrow-right"></i> Sair da conta</button>
      </div>`;
      box.querySelector('#accountLogoutBtn')?.addEventListener('click',()=>{
        localStorage.removeItem('radio_token');
        localStorage.removeItem('radio_user');
        localStorage.removeItem('nickname');
        seenAuthToken=null;
        renderLoggedOut();
        toast('Você saiu da sua conta.');
      });
    }
  }

  async function syncAuthState(force=false){
    const token=localStorage.getItem('radio_token')||'';
    if(!token){
      seenAuthToken='';
      renderLoggedOut();
      return;
    }
    if(!force && token===seenAuthToken) return;
    seenAuthToken=token;
    try{
      const response=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok) throw new Error('Sessão inválida');
      renderLoggedIn(await response.json());
    }catch(error){
      localStorage.removeItem('radio_token');
      localStorage.removeItem('radio_user');
      seenAuthToken='';
      renderLoggedOut();
    }
  }

  syncAuthState(true);
  setInterval(()=>syncAuthState(false),800);
  setInterval(()=>syncAuthState(true),180000);
  window.addEventListener('storage',e=>{
    if(e.key==='radio_token'||e.key==='nickname') syncAuthState(true);
  });

  function styleClasses(style={}){
    return [
      `chat-font-${style.font_style||'default'}`,
      `chat-color-${style.text_color||'default'}`,
      `chat-effect-${style.effect||'none'}`
    ].join(' ');
  }

  function roleLabel(role){
    return ({admin:'ADM',moderator:'MOD',dj:'DJ',listener:'OUVINTE',system:'RAD'})[role]||String(role||'ouvinte').toUpperCase();
  }

  function reactionHtml(m,buttonClass){
    return REACTIONS.map(e=>`<button class="btn btn-sm btn-dark ${buttonClass}" data-emoji="${e}" title="Reagir com ${e}">${e} <span>${m.reactions?.[e]||''}</span></button>`).join('');
  }

  function messageHtml(m,buttonClass){
    const style=styleClasses(m.chat_style||{});
    return `<div class="chat-profile-row">
      <strong class="chat-name">${esc(m.nickname)}</strong>
      <span class="role-pill role-${esc(m.role)}">${roleLabel(m.role)}</span>
      <span class="chat-badges">${badgeHtml(m.badges||[])}</span>
    </div>
    <div class="chat-message-copy mt-1 ${style}">${esc(m.message)}</div>
    <div class="reaction-bar community-reactions mt-2">${reactionHtml(m,buttonClass)}</div>`;
  }

  function bindReactions(root,selector,messageId){
    root.querySelectorAll(selector).forEach(btn=>{
      if(btn.dataset.bound==='1') return;
      btn.dataset.bound='1';
      btn.addEventListener('click',()=>socket.emit('react_message',{message_id:messageId,emoji:btn.dataset.emoji}));
    });
  }

  function renderMessage(m){
    if(!messagesEl||!m||m.deleted) return;
    messageCache.set(Number(m.id),m);
    let div=messagesEl.querySelector(`.chat-item[data-id="${m.id}"]`);
    if(!div){
      div=document.createElement('div');
      div.dataset.id=m.id;
      messagesEl.appendChild(div);
    }
    div.className=`chat-item role-${m.role}`;
    div.innerHTML=messageHtml(m,'home-react-btn');
    bindReactions(div,'.home-react-btn',m.id);
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }

  function decorateExistingItem(item,m){
    if(!item||!m) return;
    messageCache.set(Number(m.id),m);
    item.className=`chat-item role-${m.role}`;
    item.innerHTML=messageHtml(m,'community-react-btn');
    bindReactions(item,'.community-react-btn',m.id);
  }

  async function loadHistory(){
    try{
      const response=await fetch('/api/chat/history');
      if(!response.ok) throw new Error('Falha ao carregar chat');
      const data=await response.json();
      (data||[]).forEach(m=>messageCache.set(Number(m.id),m));
      if(messagesEl){
        messagesEl.innerHTML='';
        (data||[]).forEach(renderMessage);
      }
      const main=$('#chatMessages');
      main?.querySelectorAll('.chat-item[data-id]').forEach(item=>decorateExistingItem(item,messageCache.get(Number(item.dataset.id))));
    }catch(error){
      console.warn('Chat indisponível',error);
    }
  }

  function observeChat(container){
    if(!container) return;
    const observer=new MutationObserver(mutations=>{
      mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{
        if(!(node instanceof HTMLElement)||!node.matches?.('.chat-item[data-id]')) return;
        const data=messageCache.get(Number(node.dataset.id));
        if(data) setTimeout(()=>decorateExistingItem(node,data),0);
      }));
    });
    observer.observe(container,{childList:true});
  }
  observeChat($('#chatMessages'));

  if(form&&typeof socket!=='undefined'){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const nickname=(nicknameEl?.value.trim())||localStorage.getItem('nickname')||'Ouvinte';
      const message=inputEl?.value.trim();
      if(!message) return;
      localStorage.setItem('nickname',nickname);
      syncNickname(nickname,!!localStorage.getItem('radio_token'));
      socket.emit('chat_message',{nickname,message,token:localStorage.getItem('radio_token')});
      inputEl.value='';
    });
  }

  function enrichEmojiRows(){
    const homeRow=document.querySelector('.home-emoji-row');
    if(homeRow){
      homeRow.innerHTML=REACTIONS.map(e=>`<button class="home-emoji-btn" type="button" data-emoji="${e}">${e}</button>`).join('');
      homeRow.querySelectorAll('.home-emoji-btn').forEach(btn=>btn.addEventListener('click',()=>{
        if(!inputEl) return;
        inputEl.value+=btn.dataset.emoji||'';
        inputEl.focus();
      }));
    }
    const mainInput=$('#chatInput');
    const mainRow=$('.emoji-btn')?.parentElement;
    if(mainRow&&mainInput){
      mainRow.classList.add('chat-emoji-tray');
      mainRow.innerHTML=REACTIONS.map(e=>`<button class="btn btn-sm btn-dark community-emoji-btn" type="button" data-emoji="${e}">${e}</button>`).join('');
      mainRow.querySelectorAll('.community-emoji-btn').forEach(btn=>btn.addEventListener('click',()=>{
        mainInput.value+=btn.dataset.emoji||'';
        mainInput.focus();
      }));
    }
  }

  function installSongRequest(){
    if($('#chatSongRequestModal')) return;
    const modal=document.createElement('div');
    modal.id='chatSongRequestModal';
    modal.className='chat-request-modal';
    modal.innerHTML=`<div class="chat-request-backdrop" data-close-request></div><div class="chat-request-card">
      <button class="chat-request-close" type="button" data-close-request aria-label="Fechar">×</button>
      <span class="section-kicker">PEDIDO PELO CHAT</span>
      <h3>🎵 Peça sua música</h3>
      <p>Ao enviar, o pedido aparece no chat e o painel notifica automaticamente <strong>ADM e MOD</strong>.</p>
      <form id="chatSongRequestForm">
        <input class="form-control mb-2" name="artist" maxlength="120" placeholder="Artista" required>
        <input class="form-control mb-2" name="song" maxlength="120" placeholder="Nome da música" required>
        <textarea class="form-control mb-3" name="note" maxlength="250" rows="3" placeholder="Recado opcional"></textarea>
        <button class="btn btn-rad w-100" type="submit"><i class="bi bi-music-note-beamed"></i> Enviar e chamar a equipe</button>
      </form>
    </div>`;
    document.body.appendChild(modal);
    const close=()=>modal.classList.remove('open');
    modal.querySelectorAll('[data-close-request]').forEach(x=>x.addEventListener('click',close));
    modal.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.target));
      data.requester=localStorage.getItem('nickname')||'Ouvinte';
      const token=localStorage.getItem('radio_token')||'';
      try{
        const response=await fetch('/api/chat/song-request',{
          method:'POST',
          headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
          body:JSON.stringify(data)
        });
        const body=await response.json().catch(()=>({}));
        if(!response.ok) throw new Error(body.error||'Não foi possível enviar o pedido');
        e.target.reset();
        close();
        toast('Pedido enviado! ADM e MOD foram notificados. 🎵');
      }catch(error){toast(error.message)}
    });

    const open=()=>modal.classList.add('open');
    const homeHead=$('.home-chat-head');
    if(homeHead&&!$('#homeSongRequestBtn')){
      const btn=document.createElement('button');
      btn.id='homeSongRequestBtn';
      btn.className='btn btn-sm btn-rad chat-request-trigger';
      btn.type='button';
      btn.innerHTML='<i class="bi bi-music-note-beamed"></i> Pedir música';
      btn.addEventListener('click',open);
      homeHead.appendChild(btn);
    }
    const fullTop=$('.chat-top-v2');
    if(fullTop&&!$('#fullSongRequestBtn')){
      const btn=document.createElement('button');
      btn.id='fullSongRequestBtn';
      btn.className='btn btn-sm btn-rad chat-request-trigger ms-auto';
      btn.type='button';
      btn.innerHTML='<i class="bi bi-music-note-beamed"></i> Pedir música';
      btn.addEventListener('click',open);
      fullTop.appendChild(btn);
    }
  }

  if(typeof socket!=='undefined'){
    socket.on('chat_message',m=>{
      messageCache.set(Number(m.id),m);
      renderMessage(m);
      const main=$('#chatMessages')?.querySelector(`.chat-item[data-id="${m.id}"]`);
      if(main) setTimeout(()=>decorateExistingItem(main,m),0);
    });
    socket.on('chat_error',data=>toast(data?.error||'Não foi possível enviar sua mensagem.'));
    socket.on('message_deleted',data=>{
      messagesEl?.querySelector(`.chat-item[data-id="${data.id}"]`)?.remove();
      $('#chatMessages')?.querySelector(`.chat-item[data-id="${data.id}"]`)?.remove();
    });
    socket.on('reaction_updated',data=>{
      const cached=messageCache.get(Number(data.message_id));
      if(cached) cached.reactions=data.reactions||{};
      [messagesEl,$('#chatMessages')].filter(Boolean).forEach(container=>{
        const item=container.querySelector(`.chat-item[data-id="${data.message_id}"]`);
        if(!item) return;
        item.querySelectorAll('[data-emoji]').forEach(btn=>{
          const span=btn.querySelector('span');
          if(span) span.textContent=data.reactions?.[btn.dataset.emoji]||'';
        });
      });
    });
  }

  syncNickname(localStorage.getItem('nickname')||'',!!localStorage.getItem('radio_token'));
  enrichEmojiRows();
  installSongRequest();
  loadHistory();
})();
