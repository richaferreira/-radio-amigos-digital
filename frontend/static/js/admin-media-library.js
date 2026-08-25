(()=>{
  const $=s=>document.querySelector(s);
  const fmtBytes=n=>{n=Number(n||0);if(n<1024)return `${n} B`;const u=['KB','MB','GB'];let i=-1;do{n/=1024;i++;}while(n>=1024&&i<u.length-1);return `${n.toFixed(n>=100?0:n>=10?1:2)} ${u[i]}`};
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  let booted=false;

  function styles(){
    if($('#downloadMediaAdminStyles'))return;
    const s=document.createElement('style');s.id='downloadMediaAdminStyles';s.textContent=`
      .media-admin-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap}.media-admin-note{border:1px solid rgba(251,191,36,.2);background:rgba(251,191,36,.06);border-radius:14px;padding:.75rem .9rem;color:#d9cba7;font-size:.78rem}.media-upload-card{border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:1rem;background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))}.media-admin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.9rem}.media-admin-item{display:grid;grid-template-columns:72px 1fr;gap:.8rem;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:.8rem;background:rgba(255,255,255,.025)}.media-admin-cover{width:72px;height:72px;border-radius:14px;object-fit:cover;background:#0a0712}.media-admin-meta small{display:block;color:#9f96aa}.media-admin-actions{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.55rem}.upload-progress{height:10px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07)}.upload-progress>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff2d8d,#8a4dff,#22d3ee);transition:.15s}.upload-status{font-size:.75rem;color:#a9a0b2;margin-top:.35rem}.media-kind{display:inline-flex;padding:.2rem .45rem;border-radius:999px;font-size:.58rem;font-weight:900;background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.17);color:#83edff}.media-kind.album{background:rgba(255,45,141,.08);border-color:rgba(255,45,141,.18);color:#ff97c4}@media(max-width:640px){.media-admin-item{grid-template-columns:56px 1fr}.media-admin-cover{width:56px;height:56px}}
    `;document.head.appendChild(s);
  }

  async function japi(url,opts={}){
    const r=await fetch(url,{headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(opts.headers||{})},...opts});
    const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Erro');return d;
  }

  function row(item){
    const sub=[item.artist,item.album].filter(Boolean).join(' · ');
    return `<article class="media-admin-item"><img class="media-admin-cover" src="${esc(item.cover_url)}" alt=""><div class="media-admin-meta"><div class="d-flex align-items-center gap-2 flex-wrap"><strong>${esc(item.title)}</strong><span class="media-kind ${item.kind==='album'?'album':''}">${item.kind==='album'?'CD / ÁLBUM':'MÚSICA'}</span>${item.active?'':'<span class="badge text-bg-secondary">oculto</span>'}</div><small>${esc(sub||item.original_filename)}</small><small>${fmtBytes(item.file_size)} · ${Number(item.download_count||0)} downloads</small><div class="media-admin-actions"><a class="btn btn-sm btn-outline-light" href="${esc(item.download_url)}" target="_blank"><i class="bi bi-download"></i> Testar</a><button class="btn btn-sm btn-outline-info" onclick="mediaTogglePublic(${item.id},${!item.active})">${item.active?'Ocultar':'Publicar'}</button><button class="btn btn-sm btn-outline-danger" onclick="mediaDeleteDownload(${item.id})"><i class="bi bi-trash"></i> Excluir</button></div></div></article>`;
  }

  async function render(){
    const pane=$('#mediaPane');if(!pane)return;
    try{
      const items=await japi('/api/media/admin');
      pane.innerHTML=`<div class="media-admin-head"><div><h3>Biblioteca de Mídia & Downloads</h3><p class="text-secondary mb-0">Publique músicas individuais ou CDs/álbuns compactados para os visitantes baixarem pelo site.</p></div><span class="badge text-bg-dark">${items.length} item(ns)</span></div><div class="media-admin-note my-3"><i class="bi bi-shield-check"></i> Publique somente músicas, álbuns e arquivos que você possui ou tem autorização para distribuir.</div><form id="downloadMediaForm" class="media-upload-card mb-4"><div class="row g-2"><div class="col-md-4"><label class="form-label small">Título</label><input class="form-control" name="title" placeholder="Ex.: As melhores da RAD" required></div><div class="col-md-4"><label class="form-label small">Artista</label><input class="form-control" name="artist" placeholder="Artista ou DJ"></div><div class="col-md-4"><label class="form-label small">Álbum / CD</label><input class="form-control" name="album" placeholder="Nome do álbum"></div><div class="col-12"><label class="form-label small">Descrição</label><textarea class="form-control" name="description" rows="2" placeholder="Informações que aparecerão para o usuário"></textarea></div><div class="col-md-7"><label class="form-label small">Arquivo</label><input class="form-control" type="file" name="file" accept=".mp3,.ogg,.wav,.flac,.m4a,.aac,.zip" required><div class="form-text">MP3/OGG/WAV/FLAC/M4A/AAC ou ZIP para CD/álbum. Até 1 GB.</div></div><div class="col-md-5"><label class="form-label small">Capa</label><input class="form-control" type="file" name="cover" accept="image/png,image/jpeg,image/webp"><div class="form-text">PNG/JPG/WEBP, até 5 MB.</div></div><div class="col-12"><div class="upload-progress mt-2"><i id="mediaUploadBar"></i></div><div class="upload-status" id="mediaUploadStatus">Pronto para enviar.</div></div><div class="col-12"><button id="mediaUploadBtn" class="btn btn-primary"><i class="bi bi-cloud-arrow-up-fill"></i> Publicar na Mídia</button></div></div></form><div class="media-admin-grid">${items.length?items.map(row).join(''):'<div class="text-secondary">Nenhum arquivo publicado ainda.</div>'}</div>`;
      $('#downloadMediaForm').onsubmit=upload;
    }catch(e){pane.innerHTML=`<p class="text-warning">${esc(e.message||'Não foi possível carregar a biblioteca.')}</p>`}
  }

  async function upload(e){
    e.preventDefault();
    const form=e.currentTarget,fd=new FormData(form),file=fd.get('file'),cover=fd.get('cover');
    if(!(file instanceof File)||!file.size)return toast('Escolha o arquivo principal.');
    if(cover instanceof File&&cover.size>5*1024*1024)return toast('A capa deve ter no máximo 5 MB.');
    const bar=$('#mediaUploadBar'),status=$('#mediaUploadStatus'),btn=$('#mediaUploadBtn');btn.disabled=true;
    try{
      const init=await japi('/api/media/admin/init',{method:'POST',body:JSON.stringify({filename:file.name,size:file.size,title:fd.get('title'),artist:fd.get('artist'),album:fd.get('album'),description:fd.get('description')})});
      const chunkSize=Number(init.chunk_size||5*1024*1024),total=Math.ceil(file.size/chunkSize);
      for(let i=0;i<total;i++){
        const chunk=file.slice(i*chunkSize,Math.min(file.size,(i+1)*chunkSize));
        status.textContent=`Enviando parte ${i+1} de ${total}...`;
        const r=await fetch(`/api/media/admin/chunk/${init.upload_id}?index=${i}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/octet-stream'},body:chunk});
        const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'Falha no upload');
        bar.style.width=`${Math.round(((i+1)/total)*92)}%`;
      }
      status.textContent='Finalizando arquivo...';
      const item=await japi(`/api/media/admin/complete/${init.upload_id}`,{method:'POST',body:'{}'});
      if(cover instanceof File&&cover.size){
        status.textContent='Enviando capa...';const cfd=new FormData();cfd.append('cover',cover);
        const r=await fetch(`/api/media/admin/${item.id}/cover`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:cfd});
        const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error||'Arquivo enviado, mas a capa falhou.');
      }
      bar.style.width='100%';status.textContent='Publicado com sucesso.';toast('Mídia publicada com sucesso 🎵');setTimeout(render,500);
    }catch(err){status.textContent=err.message;toast(err.message)}finally{btn.disabled=false}
  }

  window.mediaTogglePublic=async(id,active)=>{try{await japi(`/api/media/admin/${id}`,{method:'PATCH',body:JSON.stringify({active})});toast(active?'Publicado':'Ocultado');render()}catch(e){toast(e.message)}};
  window.mediaDeleteDownload=async id=>{if(!confirm('Excluir este arquivo e a capa do servidor?'))return;try{await japi(`/api/media/admin/${id}`,{method:'DELETE'});toast('Arquivo excluído');render()}catch(e){toast(e.message)}};

  function boot(){
    if(booted)return;const pane=$('#mediaPane'),tab=$('[data-target="mediaPane"]');if(!pane||!tab)return;
    booted=true;styles();tab.innerHTML='<i class="bi bi-collection-play-fill"></i> Mídia / Downloads';tab.addEventListener('click',()=>setTimeout(render,0));setTimeout(render,200);
  }
  const timer=setInterval(()=>{boot();if(booted)clearInterval(timer)},350);setTimeout(()=>clearInterval(timer),15000);
})();