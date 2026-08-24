(()=>{
  const $=s=>document.querySelector(s);
  const messagesEl=$('#homeChatMessages');
  const form=$('#homeChatForm');
  const nicknameEl=$('#homeNickname');
  const inputEl=$('#homeChatInput');
  const toastEl=$('#toast');
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));

  function toast(message){
    if(!toastEl) return;
    toastEl.textContent=message;
    toastEl.style.display='block';
    clearTimeout(toast._t);
    toast._t=setTimeout(()=>toastEl.style.display='none',2600);
  }

  const visualPlay=$('#heroVisualPlay');
  if(visualPlay){
    visualPlay.addEventListener('click',()=>$('#heroPlay')?.click());
  }

  function syncNickname(value,locked=false){
    const nick=value||localStorage.getItem('nickname')||'';
    if(nicknameEl){nicknameEl.value=nick;nicknameEl.readOnly=locked;}
    const mainNick=$('#nickname');
    if(mainNick){mainNick.value=nick;mainNick.readOnly=locked;}
  }

  // Estado da conta no painel lateral do chat.
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

  function renderLoggedIn(user){
    if(!user) return renderLoggedOut();
    loginForm?.classList.add('d-none');
    registerDetails?.classList.add('d-none');
    if(authTitle) authTitle.textContent='Sua conta';
    if(authDescription) authDescription.textContent=`Você está conectado como ${user.display_name}.`;
    localStorage.setItem('nickname',user.display_name||user.username||'Ouvinte');
    syncNickname(user.display_name||user.username||'Ouvinte',true);

    let box=authPanel?.querySelector('#accountLoggedBox');
    if(!box && authPanel){
      box=document.createElement('div');
      box.id='accountLoggedBox';
      authDescription?.insertAdjacentElement('afterend',box);
    }
    if(box){
      box.innerHTML=`<div class="p-3 rounded-3 border border-secondary-subtle mb-3">
        <div class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-person-check-fill text-info"></i><strong>${esc(user.display_name||user.username)}</strong></div>
        <div class="small text-secondary mb-3">@${esc(user.username)} · ${esc(user.role||'listener')}</div>
        <button id="accountLogoutBtn" class="btn btn-sm btn-outline-danger w-100" type="button"><i class="bi bi-box-arrow-right"></i> Sair da conta</button>
      </div>`;
      box.querySelector('#accountLogoutBtn')?.addEventListener('click',()=>{
        localStorage.removeItem('radio_token');
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
      seenAuthToken='';
      renderLoggedOut();
    }
  }

  // Detecta login/cadastro feito pelo app.js na mesma aba e também revalida tokens expirados.
  syncAuthState(true);
  setInterval(()=>syncAuthState(false),800);
  setInterval(()=>syncAuthState(true),300000);
  window.addEventListener('storage',e=>{
    if(e.key==='radio_token'||e.key==='nickname') syncAuthState(true);
  });

  if(!messagesEl||!form||typeof socket==='undefined') return;

  function renderMessage(m){
    if(!m||m.deleted) return;
    if(messagesEl.querySelector(`.chat-item[data-id="${m.id}"]`)) return;
    const div=document.createElement('div');
    div.className=`chat-item role-${m.role}`;
    div.dataset.id=m.id;
    div.innerHTML=`<div class="d-flex align-items-center gap-2"><strong class="chat-name">${esc(m.nickname)}</strong><small class="text-secondary">${esc(m.role)}</small></div><div class="mt-1">${esc(m.message)}</div><div class="reaction-bar mt-2">${['👍','❤️','🔥','😂'].map(e=>`<button class="btn btn-sm btn-dark home-react-btn" data-emoji="${e}">${e} <span>${m.reactions?.[e]||''}</span></button>`).join('')}</div>`;
    div.querySelectorAll('.home-react-btn').forEach(btn=>btn.addEventListener('click',()=>socket.emit('react_message',{message_id:m.id,emoji:btn.dataset.emoji})));
    messagesEl.appendChild(div);
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }
  async function loadHistory(){
    try{
      const response=await fetch('/api/chat/history');
      if(!response.ok) throw new Error('Falha ao carregar chat');
      const data=await response.json();
      messagesEl.innerHTML='';
      (data||[]).forEach(renderMessage);
    }catch(error){
      console.warn('Chat da home indisponível',error);
    }
  }

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

  document.querySelectorAll('.home-emoji-btn').forEach(btn=>btn.addEventListener('click',()=>{
    if(!inputEl) return;
    inputEl.value+=btn.dataset.emoji||'';
    inputEl.focus();
  }));

  socket.on('chat_message',renderMessage);
  socket.on('chat_error',data=>toast(data?.error||'Não foi possível enviar sua mensagem.'));
  socket.on('message_deleted',data=>messagesEl.querySelector(`.chat-item[data-id="${data.id}"]`)?.remove());
  socket.on('reaction_updated',data=>{
    const item=messagesEl.querySelector(`.chat-item[data-id="${data.message_id}"]`);
    if(!item) return;
    item.querySelectorAll('.home-react-btn').forEach(btn=>{
      const span=btn.querySelector('span');
      if(span) span.textContent=data.reactions?.[btn.dataset.emoji]||'';
    });
  });

  syncNickname(localStorage.getItem('nickname')||'',!!localStorage.getItem('radio_token'));
  loadHistory();
})();
