(()=>{
  if(window.__RAD_HERO_PREMIUM_V3__)return;
  window.__RAD_HERO_PREMIUM_V3__=true;

  const ensureCss=()=>{
    if(document.querySelector('link[data-rad-hero-premium]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/static/css/hero-premium.css?v=20260825-1';
    link.dataset.radHeroPremium='1';
    document.head.appendChild(link);
  };

  let onlineCount=0;
  const syncOnline=()=>{
    const listener=document.getElementById('listenerCount');
    if(listener&&listener.textContent!==String(onlineCount))listener.textContent=String(onlineCount);
    const small=document.querySelector('.live-float-v2 small');
    if(small)small.textContent='ouvintes online';
    document.getElementById('siteOnlineFloat')?.remove();
    document.getElementById('navOnlineChip')?.remove();
  };

  const restorePlay=()=>{
    const play=document.getElementById('heroVisualPlay');
    if(!play)return;
    play.classList.remove('rad-transparent-hotspot');
    if(!play.querySelector('i'))play.innerHTML='<i class="bi bi-play-fill"></i>';
  };

  const prepareHero=()=>{
    ensureCss();
    syncOnline();
    restorePlay();
    const art=document.querySelector('.hero-stage-v2 .hero-art');
    if(art){
      art.alt='Robô DJ futurista da Rádio Amigos Digital';
      art.decoding='async';
    }
  };

  prepareHero();
  if(typeof socket!=='undefined'){
    socket.on('online_count',data=>{
      onlineCount=Math.max(0,Number(data?.count||0));
      syncOnline();
    });
    socket.emit('get_online_count');
  }

  setInterval(syncOnline,1200);
  window.addEventListener('load',prepareHero,{once:true});
})();