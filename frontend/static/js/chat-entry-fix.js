(()=>{
  const $=s=>document.querySelector(s);
  const TOKEN_KEY='radio_token';

  function token(){return localStorage.getItem(TOKEN_KEY)||''}
  function modalOpen(){return document.querySelector('#radAuthModal')?.classList.contains('open')}
  function openAuth(){
    if(typeof window.RAD_OPEN_AUTH==='function'){
      window.RAD_OPEN_AUTH('login');
      return;
    }
    location.hash='#chat';
  }

  function prepareInputs(){
    const logged=!!token();
    ['#homeChatInput','#chatInput','#homeNickname','#nickname'].forEach(sel=>{
      const el=$(sel);
      if(!el)return;
      if(!logged){
        el.disabled=false;
        el.readOnly=true;
        el.setAttribute('aria-disabled','true');
        el.classList.add('chat-auth-locked');
        if(sel.includes('ChatInput')) el.placeholder='Clique aqui para entrar ou criar sua conta...';
      }else{
        el.removeAttribute('aria-disabled');
        if(sel.includes('ChatInput')) el.readOnly=false;
      }
    });
  }

  function intercept(event){
    if(token())return;
    const target=event.target.closest('#homeChatInput,#chatInput,#homeNickname,#nickname,#homeChatForm,#chatForm,a[href="#chat"],.nav-chat,.home-chat-panel');
    if(!target || target.closest('#radAuthModal'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openAuth();
  }

  document.addEventListener('pointerdown',intercept,true);
  document.addEventListener('click',intercept,true);
  document.addEventListener('focusin',event=>{
    if(token())return;
    if(event.target.matches('#homeChatInput,#chatInput,#homeNickname,#nickname')){
      event.target.blur();
      openAuth();
    }
  },true);

  window.addEventListener('storage',e=>{if(e.key===TOKEN_KEY)prepareInputs()});
  setTimeout(prepareInputs,0);
  setTimeout(prepareInputs,300);
  setTimeout(prepareInputs,1200);
})();
