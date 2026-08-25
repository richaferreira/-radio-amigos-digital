(()=>{
  const $=s=>document.querySelector(s);
  const $$=s=>[...document.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtBytes=n=>{n=Number(n||0);if(n<1024)return `${n} B`;const u=['KB','MB','GB'];let i=-1;do{n/=1024;i++;}while(n>=1024&&i<u.length-1);return `${n.toFixed(n>=100?0:n>=10?1:2)} ${u[i]}`};
  let media=[];

  function styles(){
    if($('#siteMediaStyles'))return;
    const s=document.createElement('style');s.id='siteMediaStyles';s.textContent=`
      .media-hero-tools{display:flex;gap:.65rem;flex-wrap:wrap;margin-top:1rem}.media-search{max-width:520px}.media-filter{display:flex;gap:.45rem;flex-wrap:wrap}.media-filter button{border-radius:999px}.media-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1rem}.media-card{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:22px;background:linear-gradient(145deg,rgba(25,19,36,.96),rgba(8,7,14,.97));box-shadow:0 20px 55px rgba(0,0,0,.2);transition:.22s}.media-card:hover{transform:translateY(-4px);border-color:rgba(138,77,255,.28);box-shadow:0 24px 65px rgba(0,0,0,.3),0 0 35px rgba(138,77,255,.08)}.media-cover{position:relative;aspect-ratio:1/1;overflow:hidden;background:#090610}.media-cover img{width:100%;height:100%;object-fit:cover}.media-cover::after{content:"";position:absolute;inset:auto 0 0;height:42%;background:linear-gradient(transparent,rgba(5,3,10,.9));pointer-events:none}.media-type{position:absolute;left:.75rem;top:.75rem;z-index:2;border:1px solid rgba(255,255,255,.12);background:rgba(7,5,12,.76);backdrop-filter:blur(10px);border-radius:999px;padding:.35rem .55rem;font-size:.58rem;font-weight:950;letter-spacing:.06em}.media-body{padding:1rem}.media-body h3{font-size:1.08rem;font-weight:950;margin:0 0 .2rem}.media-sub{color:#aaa0b4;font-size:.78rem;min-height:1.25rem}.media-desc{color:#8e859a;font-size:.76rem;line-height:1.5;margin:.65rem 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.media-stats{display:flex;justify-content:space-between;gap:.7rem;color:#7f7589;font-size:.68rem;margin-bottom:.75rem}.media-actions{display:flex;gap:.5rem}.media-actions .btn{flex:1}.media-audio{width:100%;height:34px;margin:.5rem 0 .8rem;filter:invert(.92) hue-rotate(180deg);opacity:.82}.media-empty{grid-column:1/-1;text-align:center;padding:3rem 1rem;border:1px dashed rgba(255,255,255,.1);border-radius:22px;color:#948a9e}.media-preview-home{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}.media-preview-item{display:flex;align-items:center;gap:.8rem;padding:.8rem;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);text-decoration:none;color:#fff}.media-preview-item img{width:68px;height:68px;border-radius:14px;object-fit:cover}.media-preview-item strong{display:block}.media-preview-item span{display:block;color:#908698;font-size:.72rem;margin-top:.2rem}@media(max-width:900px){.media-preview-home{grid-template-columns:1fr}}@media(max-width:560px){.media-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function card(x){
    const sub=[x.artist,x.album].filter(Boolean).join(' · ')||x.original_filename;
    return `<article class="media-card" data-kind="${esc(x.kind)}"><div class="media-cover"><img src="${esc(x.cover_url)}" alt="Capa de ${esc(x.title)}"><span class="media-type">${x.kind==='album'?'💿 CD / ÁLBUM':'🎵 MÚSICA'}</span></div><div class="media-body"><h3>${esc(x.title)}</h3><div class="media-sub">${esc(sub)}</div>${x.description?`<p class="media-desc">${esc(x.description)}</p>`:''}${x.preview_url?`<audio class="media-audio" controls preload="none" src="${esc(x.preview_url)}"></audio>`:''}<div class="media-stats"><span><i class="bi bi-hdd"></i> ${fmtBytes(x.file_size)}</span><span><i class="bi bi-download"></i> ${Number(x.download_count||0)} downloads</span></div><div class="media-actions"><a class="btn btn-rad" href="${esc(x.download_url)}"><i class="bi bi-download"></i> Baixar</a></div></div></article>`;
  }

  function renderList(kind='all',query=''){
    const grid=$('#publicMediaGrid');if(!grid)return;
    query=(query||'').trim().toLowerCase();
    const rows=media.filter(x=>(kind==='all'||x.kind===kind)&&(!query||`${x.title} ${x.artist||''} ${x.album||''}`.toLowerCase().includes(query)));
    grid.innerHTML=rows.length?rows.map(card).join(''):'<div class="media-empty"><i class="bi bi-music-note-list fs-2"></i><br><strong>Nenhuma mídia encontrada.</strong><br><span>Novas músicas e CDs aparecerão aqui quando forem publicados.</span></div>';
  }

  function buildSection(){
    const section=$('#media')||$('#memes');if(!section)return;
    section.id='media';
    section.innerHTML=`<div class="page-hero"><span class="section-kicker">MÍDIA DA RAD</span><h2>Músicas & <span>Downloads</span></h2><p>Baixe músicas, CDs e materiais publicados oficialmente pela Rádio Amigos Digital.</p><div class="media-hero-tools"><input id="mediaSearch" class="form-control media-search" placeholder="Buscar por música, artista ou álbum..."><div class="media-filter"><button class="btn btn-sm btn-rad active" data-media-filter="all">Tudo</button><button class="btn btn-sm btn-glass" data-media-filter="music">Músicas</button><button class="btn btn-sm btn-glass" data-media-filter="album">CDs / Álbuns</button></div></div></div><div id="publicMediaGrid" class="media-grid"></div><div class="panel p-3 mt-4 text-secondary small"><i class="bi bi-info-circle"></i> Os arquivos disponíveis nesta seção são publicados pela administração da Rádio Amigos Digital.</div>`;
    let filter='all';
    $$('.media-filter [data-media-filter]').forEach(btn=>btn.onclick=()=>{$$('.media-filter [data-media-filter]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');filter=btn.dataset.mediaFilter;renderList(filter,$('#mediaSearch')?.value)});
    $('#mediaSearch').oninput=e=>renderList(filter,e.target.value);
  }

  function renameNavigation(){
    $$('a[href="#memes"],a[href="#media"]').forEach(a=>{a.href='#media';if(a.closest('.navbar-nav'))a.innerHTML='<i class="bi bi-collection-play"></i> Mídia';else a.innerHTML='Ver biblioteca completa <i class="bi bi-arrow-right"></i>'});
    $$('.marquee-track span').forEach(s=>{if(s.textContent.includes('MEMES'))s.textContent='💿 MÍDIA & DOWNLOADS'});
  }

  function homePreview(){
    const heads=$$('.section-head');
    const head=heads.find(h=>h.querySelector('h2')?.textContent.includes('Memes da'));
    if(!head)return;
    const old=head.nextElementSibling;
    head.querySelector('.section-kicker').textContent='MÍDIA DA RAD';
    head.querySelector('h2').innerHTML='Baixe <span>músicas & CDs</span>';
    const link=head.querySelector('a');if(link){link.href='#media';link.innerHTML='Abrir biblioteca <i class="bi bi-arrow-right"></i>'}
    if(old?.classList.contains('meme-grid')){
      old.className='media-preview-home';
      old.innerHTML=media.slice(0,3).map(x=>`<a href="#media" class="media-preview-item"><img src="${esc(x.cover_url)}" alt=""><div><strong>${esc(x.title)}</strong><span>${esc([x.artist,x.album].filter(Boolean).join(' · ')||'Disponível para download')}</span></div><i class="bi bi-download ms-auto"></i></a>`).join('')||'<div class="text-secondary">A biblioteca será exibida aqui quando o ADM publicar as primeiras músicas ou CDs.</div>';
    }
  }

  async function load(){
    styles();buildSection();renameNavigation();
    try{const r=await fetch('/api/media/');if(!r.ok)throw new Error();media=await r.json()}catch{media=[]}
    renderList();homePreview();
    if(location.hash==='#memes')location.replace('#media');
  }

  load();window.addEventListener('hashchange',()=>{if(location.hash==='#media')renderList()});
})();