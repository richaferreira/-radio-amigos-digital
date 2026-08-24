(()=>{
  const pane=document.querySelector('#playerPane');
  if(!pane) return;

  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const authHeaders=()=>{
    const token=localStorage.getItem('radio_token')||'';
    return token?{Authorization:`Bearer ${token}`}:{ };
  };

  async function api(url,opts={}){
    const r=await fetch(url,{...opts,headers:{'Content-Type':'application/json',...authHeaders(),...(opts.headers||{})}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||'Erro na operação');
    return data;
  }

  function statusCard(s){
    if(!s) return '';
    const configured=!!s.configured;
    const hasMetadata=!!s.now_playing;
    return `<div class="mt-4 p-3 rounded-3 border border-secondary-subtle bg-dark-subtle">
      <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between">
        <div>
          <strong>${configured?'Player configurado':'Player ainda não configurado'}</strong>
          <div class="small text-secondary">${configured?'O site já recebeu uma URL de transmissão.':'Informe a URL do áudio para habilitar o player.'}</div>
        </div>
        <span class="badge ${configured?'text-bg-success':'text-bg-secondary'}">${configured?'ATIVO':'INATIVO'}</span>
      </div>
      ${configured?`<hr><div class="small"><strong>Ouvintes:</strong> ${esc(s.listeners||0)} &nbsp; <strong>Modo:</strong> ${s.live?'AO VIVO':'AUTO'} &nbsp; <strong>Metadados:</strong> ${hasMetadata?'OK':'não disponíveis'}</div>${hasMetadata?`<div class="small mt-2"><strong>Tocando:</strong> ${esc(s.now_playing.artist||'')} - ${esc(s.now_playing.title||'')}</div>`:''}`:''}
    </div>`;
  }

  async function testStream(){
    const box=pane.querySelector('#playerTestResult');
    if(box) box.innerHTML='<div class="text-secondary">Testando transmissão...</div>';
    try{
      const s=await api('/api/stream/status');
      if(box) box.innerHTML=statusCard(s);
    }catch(e){
      if(box) box.innerHTML=`<div class="alert alert-danger mt-3 mb-0">${esc(e.message)}</div>`;
    }
  }

  async function render(){
    if(!localStorage.getItem('radio_token')) return;
    pane.innerHTML='<div class="text-secondary">Carregando configurações do player...</div>';
    try{
      const d=await api('/api/admin/settings');
      pane.innerHTML=`
        <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-4">
          <div>
            <h3 class="mb-1">Player / Streaming</h3>
            <p class="text-secondary mb-0">Edite os links do áudio e da API de status sem precisar acessar o servidor ou alterar o .env.</p>
          </div>
          <button type="button" id="playerTestBtn" class="btn btn-outline-light">Testar transmissão</button>
        </div>
        <form id="playerSettingsForm">
          <label class="form-label">URL do áudio / stream</label>
          <input class="form-control mb-2" type="url" name="stream_url" value="${esc(d.stream_url||'')}" placeholder="https://stream.exemplo.com/listen/radio/radio.mp3">
          <div class="form-text text-secondary mb-3">É o endereço que o navegador usa para reproduzir a rádio. Em site HTTPS, prefira stream HTTPS.</div>

          <label class="form-label">URL da API de status / Now Playing</label>
          <input class="form-control mb-2" type="url" name="stream_status_url" value="${esc(d.stream_status_url||'')}" placeholder="https://stream.exemplo.com/api/nowplaying/radio">
          <div class="form-text text-secondary mb-3">Opcional. No AzuraCast, permite mostrar música, artista, capa, ouvintes e indicador ao vivo.</div>

          <label class="form-label">Provedor</label>
          <select class="form-select mb-3" name="stream_provider">
            <option value="azuracast" ${(d.stream_provider||'azuracast')==='azuracast'?'selected':''}>AzuraCast</option>
            <option value="direct" ${d.stream_provider==='direct'?'selected':''}>Stream direto / Icecast sem API</option>
          </select>

          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-primary" type="submit">Salvar player</button>
            <button class="btn btn-outline-danger" id="disablePlayerBtn" type="button">Desativar player</button>
          </div>
        </form>
        <div id="playerTestResult"></div>`;

      pane.querySelector('#playerSettingsForm').addEventListener('submit',async e=>{
        e.preventDefault();
        const data=Object.fromEntries(new FormData(e.target));
        try{
          await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(data)});
          if(typeof toast==='function') toast('Player atualizado com sucesso');
          await testStream();
        }catch(err){
          if(typeof toast==='function') toast(err.message);
        }
      });

      pane.querySelector('#playerTestBtn').addEventListener('click',testStream);
      pane.querySelector('#disablePlayerBtn').addEventListener('click',async()=>{
        if(!confirm('Desativar o áudio do player no site?')) return;
        try{
          await api('/api/admin/settings',{method:'PUT',body:JSON.stringify({stream_url:'',stream_status_url:''})});
          const form=pane.querySelector('#playerSettingsForm');
          form.elements.stream_url.value='';
          form.elements.stream_status_url.value='';
          if(typeof toast==='function') toast('Player desativado');
          await testStream();
        }catch(err){
          if(typeof toast==='function') toast(err.message);
        }
      });

      await testStream();
    }catch(e){
      pane.innerHTML=`<div class="alert alert-warning">Não foi possível abrir as configurações do player: ${esc(e.message)}</div>`;
    }
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-target="playerPane"]');
    if(btn) setTimeout(render,0);
  });

  const adminApp=document.querySelector('#adminApp');
  if(adminApp){
    new MutationObserver(()=>{
      if(!adminApp.classList.contains('d-none')) render();
    }).observe(adminApp,{attributes:true,attributeFilter:['class']});
  }

  if(localStorage.getItem('radio_token')) setTimeout(render,100);
})();
