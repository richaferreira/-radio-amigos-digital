(()=>{
  if(window.__RAD_REACTION_AUTH_FIX__)return;
  window.__RAD_REACTION_AUTH_FIX__=true;

  const TOKEN_KEY='radio_token';
  const reactionSelector='.home-react-btn,.community-react-btn,.react-btn,[data-summary-emoji]';

  function token(){return localStorage.getItem(TOKEN_KEY)||'';}
  function toast(message){
    const el=document.querySelector('#toast');
    if(!el)return;
    el.textContent=message;
    el.style.display='block';
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>el.style.display='none',2800);
  }
  function openLogin(){
    if(typeof window.RAD_OPEN_AUTH==='function')window.RAD_OPEN_AUTH('login');
    else location.hash='#chat';
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest(reactionSelector);
    if(!button)return;

    const item=button.closest('.chat-item[data-id]');
    const messageId=Number(button.dataset.id||item?.dataset.id||0);
    const emoji=button.dataset.emoji||button.dataset.summaryEmoji||'';
    if(!messageId||!emoji)return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const jwt=token();
    if(!jwt){
      toast('Entre na sua conta para reagir.');
      openLogin();
      return;
    }

    if(typeof socket==='undefined'){
      toast('Chat temporariamente indisponível.');
      return;
    }

    socket.emit('react_message',{message_id:messageId,emoji,token:jwt});
  },true);
})();