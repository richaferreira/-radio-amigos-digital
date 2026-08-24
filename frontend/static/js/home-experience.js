(()=>{
  const $=s=>document.querySelector(s);
  const messagesEl=$('#homeChatMessages');
  const form=$('#homeChatForm');
  const nicknameEl=$('#homeNickname');
  const inputEl=$('#homeChatInput');
  const toastEl=$('#toast');

  const visualPlay=$('#heroVisualPlay');
  if(visualPlay){
    visualPlay.addEventListener('click',()=>$('#heroPlay')?.click());
  }

  if(!messagesEl||!form||typeof socket==='undefined') return;

  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':'&quot;'}[c]));
  function toast(message){
    if(!toastEl) return;
    toastEl.textContent=message;
    toastEl.style.display='block';
    clearTimeout(toast._t);
    toast._t=setTimeout(()=>toastEl.style.display='none',2600);
  }
  function syncNickname(value){
    const nick=value||localStorage.getItem('nickname')||'';
    if(nicknameEl) nicknameEl.value=nick;
    const mainNick=$('#nickname');
    if(mainNick && !mainNick.value) mainNick.value=nick;
  }
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
    syncNickname(nickname);
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

  syncNickname();
  loadHistory();
})();
