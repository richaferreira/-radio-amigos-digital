(()=>{
  const $=s=>document.querySelector(s);
  const toastEl=$('#toast');
  const messagesEl=$('#homeChatMessages');
  const form=$('#homeChatForm');
  const nicknameEl=$('#homeNickname');
  const inputEl=$('#homeChatInput');
  const REACTIONS=['👍','❤️','🔥','😂','👏','😍','🎉','💯','😎','🤯','🎧','🎵'];
  const messageCache=new Map();
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function toast(message){
    if(!toastEl)return;
    toastEl.textContent=message;
    toastEl.style.display='block';
    clearTimeout(toast._t);
    toast._t=setTimeout(()=>toastEl.style.display='none',3000);
  }

  function installPolishStyles(){
    if($('#chatPolishStyles'))return;
    const style=document.createElement('style');
    style.id='chatPolishStyles';
    style.textContent=`
      .chat-name.chat-font-bold{font-weight:950!important}.chat-name.chat-font-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.chat-name.chat-font-serif{font-family:Georgia,'Times New Roman',serif}.chat-name.chat-font-rounded{font-family:'Trebuchet MS',system-ui,sans-serif;font-weight:900;letter-spacing:.02em}.chat-name.chat-font-italic{font-style:italic}.chat-name.chat-color-pink{color:#ff8ec1}.chat-name.chat-color-cyan{color:#7deaff}.chat-name.chat-color-purple{color:#c4a4ff}.chat-name.chat-color-gold{color:#ffe081}.chat-name.chat-color-green{color:#8ff5c6}.chat-name.chat-color-white{color:#fff}.chat-name.chat-effect-glow{text-shadow:0 0 11px currentColor}.chat-name.chat-effect-neon{text-shadow:0 0 5px currentColor,0 0 15px currentColor,0 0 25px currentColor}.chat-name.chat-effect-shadow{text-shadow:2px 2px 0 rgba(0,0,0,.85)}.chat-name.chat-effect-pulse{animation:communityNamePulse 1.8s ease-in-out infinite}@keyframes communityNamePulse{50%{opacity:.72;filter:brightness(1.45)}}
      .chat-message-copy{color:inherit!important;text-shadow:none!important;animation:none!important;font-family:inherit!important;font-style:normal!important;font-weight:400!important;filter:none!important}
      .reaction-compact{position:relative;margin-top:.55rem}.reaction-summary{display:flex;align-items:center;gap:.35rem;flex-wrap:wrap}.reaction-summary-count,.reaction-picker-toggle{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);color:#fff;border-radius:999px;min-height:30px;padding:.22rem .52rem;font-size:.7rem;transition:.18s}.reaction-summary-count:hover,.reaction-picker-toggle:hover{background:rgba(255,255,255,.1);transform:translateY(-1px)}.reaction-picker-toggle{display:inline-flex;align-items:center;gap:.3rem;color:#cfc6d8}.reaction-picker{display:none;position:relative;margin-top:.5rem;padding:.55rem;border-radius:15px;border:1px solid rgba(255,255,255,.1);background:rgba(10,8,16,.94);box-shadow:0 14px 35px rgba(0,0,0,.32);gap:.35rem;flex-wrap:wrap;max-width:390px}.reaction-compact.open .reaction-picker{display:flex}.reaction-picker .btn{width:38px;height:34px;padding:0;border-radius:10px;display:grid;place-items:center;font-size:.85rem}.reaction-picker .btn span{display:none}
      .home-emoji-row,.chat-emoji-tray{overflow:visible!important;position:relative!important;display:block!important}.composer-emoji-box{position:relative;display:inline-block}.composer-emoji-toggle{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:#eee5f4;border-radius:12px;padding:.42rem .68rem;font-size:.76rem;font-weight:800}.composer-emoji-toggle:hover{background:rgba(255,255,255,.09)}.composer-emoji-panel{display:none;position:absolute;left:0;bottom:calc(100% + 8px);z-index:45;grid-template-columns:repeat(6,38px);gap:.35rem;padding:.6rem;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(9,7,14,.97);box-shadow:0 18px 45px rgba(0,0,0,.42)}.composer-emoji-box.open .composer-emoji-panel{display:grid}.composer-emoji-panel button{width:38px;height:36px;border:0;border-radius:10px;background:rgba(255,255,255,.055);color:#fff;font-size:1rem}.composer-emoji-panel button:hover{background:rgba(138,77,255,.2);transform:translateY(-1px)}
      .hero-stage-v2 .hero-art{filter:drop-shadow(0 30px 60px rgba(0,0,0,.52)) drop-shadow(0 0 26px rgba(138,77,255,.14))}.hero-stage-v2:hover .hero-art{filter:drop-shadow(0 34px 66px rgba(0,0,0,.56)) drop-shadow(0 0 38px rgba(34,211,238,.17))}
      @media(max-width:600px){.reaction-picker{max-width:290px}.composer-emoji-panel{grid-template-columns:repeat(4,38px)}}
    `;
    document.head.appendChild(style);
  }

  installPolishStyles();

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
    if(authTitle)authTitle.textContent='Conta opcional';
    if(authDescription)authDescription.textContent='Converse só com apelido ou entre com sua conta para identificar seu perfil.';
    syncNickname(localStorage.getItem('nickname')||'',false);
  }

  function badgeHtml(badges=[]){
    return badges.slice(0,4).map(b=>`<span class="chat-user-badge badge-${esc(b.color||'purple')}" title="${esc(b.description||b.name)}"><span>${esc(b.icon||'🏅')}</span>${esc(b.name)}</span>`).join('');
  }

  function renderLoggedIn(user){
    if(!user)return renderLoggedOut();
    loginForm?.classList.add('d-none');
    registerDetails?.classList.add('d-none');
    if(authTitle)authTitle.textContent='Sua conta';
    if(authDescription)authDescription.textContent=`Você está conectado como ${user.display_name}.`;
    localStorage.setItem('nickname',user.display_name||user.username||'Ouvinte');
    localStorage.setItem('radio_user',JSON.stringify(user));
    syncNickname(user.display_name||user.username||'Ouvinte',true);

    let box=authPanel?.querySelector('#accountLoggedBox');
    if(!box&&authPanel){box=document.createElement('div');box.id='accountLoggedBox';authDescription?.insertAdjacentElement('afterend',box);}
    if(box){
      box.innerHTML=`<div class="p-3 rounded-3 border border-secondary-subtle mb-3 account-community-card"><div class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-person-check-fill text-info"></i><strong>${esc(user.display_name||user.username)}</strong><span class="role-pill role-${esc(user.role||'listener')}">${esc(user.role||'listener')}</span></div><div class="small text-secondary mb-2">@${esc(user.username)}</div><div class="chat-badges mb-3">${badgeHtml(user.badges||[])||'<span class="small text-secondary">Sem emblemas ainda</span>'}</div><button id="accountLogoutBtn" class="btn btn-sm btn-outline-danger w-100" type="button"><i class="bi bi-box-arrow-right"></i> Sair da conta</button></div>`;
      box.querySelector('#accountLogoutBtn')?.addEventListener('click',()=>{localStorage.removeItem('radio_token');localStorage.removeItem('radio_user');localStorage.removeItem('nickname');seenAuthToken=null;renderLoggedOut();toast('Você saiu da sua conta.');});
    }
  }

  async function syncAuthState(force=false){
    const token=localStorage.getItem('radio_token')||'';
    if(!token){seenAuthToken='';renderLoggedOut();return;}
    if(!force&&token===seenAuthToken)return;
    seenAuthToken=token;
    try{
      const response=await fetch('/api/auth/me',{headers:{Authorization:`Bearer ${token}`}});
      if(!response.ok)throw new Error('Sessão inválida');
      renderLoggedIn(await response.json());
    }catch(error){localStorage.removeItem('radio_token');localStorage.removeItem('radio_user');seenAuthToken='';renderLoggedOut();}
  }

  syncAuthState(true);
  setInterval(()=>syncAuthState(false),800);
  setInterval(()=>syncAuthState(true),180000);
  window.addEventListener('storage',e=>{if(e.key==='radio_token'||e.key==='nickname')syncAuthState(true);});

  function styleClasses(style={}){
    return [`chat-font-${style.font_style||'default'}`,`chat-color-${style.text_color||'default'}`,`chat-effect-${style.effect||'none'}`].join(' ');
  }

  function roleLabel(role){
    return ({admin:'ADM',moderator:'MOD',dj:'DJ',listener:'OUVINTE',system:'RAD'})[role]||String(role||'ouvinte').toUpperCase();
  }

  function reactionPickerHtml(m,buttonClass){
    const active=REACTIONS.filter(e=>Number(m.reactions?.[e]||0)>0);
    const counts=active.map(e=>`<button class="reaction-summary-count" type="button" data-summary-emoji="${e}" title="Reagir novamente">${e} <span>${Number(m.reactions?.[e]||0)}</span></button>`).join('');
    const picker=REACTIONS.map(e=>`<button class="btn btn-sm btn-dark ${buttonClass}" type="button" data-emoji="${e}" title="Reagir com ${e}">${e}<span>${Number(m.reactions?.[e]||0)||''}</span></button>`).join('');
    return `<div class="reaction-compact"><div class="reaction-summary">${counts}<button class="reaction-picker-toggle" type="button" aria-expanded="false">😊 <span>${active.length?'Mais':'Reagir'}</span> <b>+</b></button></div><div class="reaction-picker">${picker}</div></div>`;
  }

  function messageHtml(m,buttonClass){
    const style=styleClasses(m.chat_style||{});
    return `<div class="chat-profile-row"><strong class="chat-name ${style}">${esc(m.nickname)}</strong><span class="role-pill role-${esc(m.role)}">${roleLabel(m.role)}</span><span class="chat-badges">${badgeHtml(m.badges||[])}</span></div><div class="chat-message-copy mt-1">${esc(m.message)}</div>${reactionPickerHtml(m,buttonClass)}`;
  }

  function closeOtherReactionPickers(current){
    document.querySelectorAll('.reaction-compact.open').forEach(x=>{if(x!==current){x.classList.remove('open');x.querySelector('.reaction-picker-toggle')?.setAttribute('aria-expanded','false');}});
  }

  function bindReactions(root,selector,messageId){
    root.querySelectorAll(selector).forEach(btn=>{
      if(btn.dataset.bound==='1')return;
      btn.dataset.bound='1';
      btn.addEventListener('click',()=>socket.emit('react_message',{message_id:messageId,emoji:btn.dataset.emoji}));
    });
    root.querySelectorAll('[data-summary-emoji]').forEach(btn=>{
      if(btn.dataset.bound==='1')return;
      btn.dataset.bound='1';
      btn.addEventListener('click',()=>socket.emit('react_message',{message_id:messageId,emoji:btn.dataset.summaryEmoji}));
    });
    const toggle=root.querySelector('.reaction-picker-toggle');
    if(toggle&&toggle.dataset.bound!=='1'){
      toggle.dataset.bound='1';
      toggle.addEventListener('click',()=>{
        const box=toggle.closest('.reaction-compact');
        const willOpen=!box.classList.contains('open');
        closeOtherReactionPickers(box);
        box.classList.toggle('open',willOpen);
        toggle.setAttribute('aria-expanded',String(willOpen));
      });
    }
  }

  function renderMessage(m){
    if(!messagesEl||!m||m.deleted)return;
    messageCache.set(Number(m.id),m);
    let div=messagesEl.querySelector(`.chat-item[data-id="${m.id}"]`);
    if(!div){div=document.createElement('div');div.dataset.id=m.id;messagesEl.appendChild(div);}
    div.className=`chat-item role-${m.role}`;
    div.innerHTML=messageHtml(m,'home-react-btn');
    bindReactions(div,'.home-react-btn',m.id);
    messagesEl.scrollTop=messagesEl.scrollHeight;
  }

  function decorateExistingItem(item,m){
    if(!item||!m)return;
    messageCache.set(Number(m.id),m);
    item.className=`chat-item role-${m.role}`;
    item.innerHTML=messageHtml(m,'community-react-btn');
    bindReactions(item,'.community-react-btn',m.id);
  }

  function refreshMessageEverywhere(id){
    const m=messageCache.get(Number(id));
    if(!m)return;
    const home=messagesEl?.querySelector(`.chat-item[data-id="${id}"]`);
    const full=$('#chatMessages')?.querySelector(`.chat-item[data-id="${id}"]`);
    if(home)renderMessage(m);
    if(full)decorateExistingItem(full,m);
  }

  async function loadHistory(){
    try{
      const response=await fetch('/api/chat/history');
      if(!response.ok)throw new Error('Falha ao carregar chat');
      const data=await response.json();
      (data||[]).forEach(m=>messageCache.set(Number(m.id),m));
      if(messagesEl){messagesEl.innerHTML='';(data||[]).forEach(renderMessage);}
      const main=$('#chatMessages');
      main?.querySelectorAll('.chat-item[data-id]').forEach(item=>decorateExistingItem(item,messageCache.get(Number(item.dataset.id))));
    }catch(error){console.warn('Chat indisponível',error);}
  }

  function observeChat(container){
    if(!container)return;
    const observer=new MutationObserver(mutations=>{mutations.forEach(mutation=>mutation.addedNodes.forEach(node=>{if(!(node instanceof HTMLElement)||!node.matches?.('.chat-item[data-id]'))return;const data=messageCache.get(Number(node.dataset.id));if(data)setTimeout(()=>decorateExistingItem(node,data),0);}));});
    observer.observe(container,{childList:true});
  }
  observeChat($('#chatMessages'));

  if(form&&typeof socket!=='undefined'){
    form.addEventListener('submit',e=>{e.preventDefault();const nickname=(nicknameEl?.value.trim())||localStorage.getItem('nickname')||'Ouvinte';const message=inputEl?.value.trim();if(!message)return;localStorage.setItem('nickname',nickname);syncNickname(nickname,!!localStorage.getItem('radio_token'));socket.emit('chat_message',{nickname,message,token:localStorage.getItem('radio_token')});inputEl.value='';});
  }

  function setupComposerPicker(row,input,label='Emojis'){
    if(!row||!input||row.dataset.compactEmoji==='1')return;
    row.dataset.compactEmoji='1';
    row.innerHTML=`<div class="composer-emoji-box"><button class="composer-emoji-toggle" type="button">😊 ${label} <span>+</span></button><div class="composer-emoji-panel">${REACTIONS.map(e=>`<button type="button" data-compose-emoji="${e}" title="Adicionar ${e}">${e}</button>`).join('')}</div></div>`;
    const box=row.querySelector('.composer-emoji-box');
    const toggle=row.querySelector('.composer-emoji-toggle');
    toggle.addEventListener('click',()=>box.classList.toggle('open'));
    row.querySelectorAll('[data-compose-emoji]').forEach(btn=>btn.addEventListener('click',()=>{input.value+=btn.dataset.composeEmoji||'';input.focus();}));
  }

  function compactEmojiRows(){
    setupComposerPicker(document.querySelector('.home-emoji-row'),inputEl,'Emojis');
    const mainInput=$('#chatInput');
    const mainRow=$('.emoji-btn')?.parentElement||$('.chat-emoji-tray');
    if(mainRow&&mainInput){mainRow.classList.add('chat-emoji-tray');setupComposerPicker(mainRow,mainInput,'Emojis');}
  }

  function installSongRequest(){
    if($('#chatSongRequestModal'))return;
    const modal=document.createElement('div');
    modal.id='chatSongRequestModal';
    modal.className='chat-request-modal';
    modal.innerHTML=`<div class="chat-request-backdrop" data-close-request></div><div class="chat-request-card"><button class="chat-request-close" type="button" data-close-request aria-label="Fechar">×</button><span class="section-kicker">PEDIDO PELO CHAT</span><h3>🎵 Peça sua música</h3><p>Ao enviar, o pedido aparece no chat e o painel notifica automaticamente <strong>ADM e MOD</strong>.</p><form id="chatSongRequestForm"><input class="form-control mb-2" name="artist" maxlength="120" placeholder="Artista" required><input class="form-control mb-2" name="song" maxlength="120" placeholder="Nome da música" required><textarea class="form-control mb-3" name="note" maxlength="250" rows="3" placeholder="Recado opcional"></textarea><button class="btn btn-rad w-100" type="submit"><i class="bi bi-music-note-beamed"></i> Enviar e chamar a equipe</button></form></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.classList.remove('open');
    modal.querySelectorAll('[data-close-request]').forEach(x=>x.addEventListener('click',close));
    modal.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();
      const data=Object.fromEntries(new FormData(e.target));
      data.requester=localStorage.getItem('nickname')||'Ouvinte';
      const token=localStorage.getItem('radio_token')||'';
      try{
        const response=await fetch('/api/chat/song-request',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
        const body=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(body.error||'Não foi possível enviar o pedido');
        e.target.reset();close();toast('Pedido enviado! ADM e MOD foram notificados. 🎵');
      }catch(error){toast(error.message);}
    });
    const open=()=>modal.classList.add('open');
    const homeHead=$('.home-chat-head');
    if(homeHead&&!$('#homeSongRequestBtn')){const btn=document.createElement('button');btn.id='homeSongRequestBtn';btn.className='btn btn-sm btn-rad chat-request-trigger';btn.type='button';btn.innerHTML='<i class="bi bi-music-note-beamed"></i> Pedir música';btn.addEventListener('click',open);homeHead.appendChild(btn);}
    const fullTop=$('.chat-top-v2');
    if(fullTop&&!$('#fullSongRequestBtn')){const btn=document.createElement('button');btn.id='fullSongRequestBtn';btn.className='btn btn-sm btn-rad chat-request-trigger ms-auto';btn.type='button';btn.innerHTML='<i class="bi bi-music-note-beamed"></i> Pedir música';btn.addEventListener('click',open);fullTop.appendChild(btn);}
  }

  document.addEventListener('click',e=>{
    if(!e.target.closest('.reaction-compact'))closeOtherReactionPickers(null);
    if(!e.target.closest('.composer-emoji-box'))document.querySelectorAll('.composer-emoji-box.open').forEach(x=>x.classList.remove('open'));
  });

  if(typeof socket!=='undefined'){
    socket.on('chat_message',m=>{messageCache.set(Number(m.id),m);renderMessage(m);const main=$('#chatMessages')?.querySelector(`.chat-item[data-id="${m.id}"]`);if(main)setTimeout(()=>decorateExistingItem(main,m),0);});
    socket.on('chat_error',data=>toast(data?.error||'Não foi possível enviar sua mensagem.'));
    socket.on('message_deleted',data=>{messagesEl?.querySelector(`.chat-item[data-id="${data.id}"]`)?.remove();$('#chatMessages')?.querySelector(`.chat-item[data-id="${data.id}"]`)?.remove();});
    socket.on('reaction_updated',data=>{const cached=messageCache.get(Number(data.message_id));if(cached){cached.reactions=data.reactions||{};refreshMessageEverywhere(data.message_id);}});
  }

  syncNickname(localStorage.getItem('nickname')||'',!!localStorage.getItem('radio_token'));
  compactEmojiRows();
  setTimeout(compactEmojiRows,250);
  installSongRequest();
  loadHistory();
})();
