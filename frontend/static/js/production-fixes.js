(()=>{
  const hero=document.querySelector('.hero-stage-v2 .hero-art');
  if(hero){
    hero.src='/static/img/hero-radio-final.jpg?v=20260825-10';
    Object.assign(hero.style,{width:'88%',height:'88%',maxWidth:'88%',objectFit:'contain',objectPosition:'center'});
  }
})();
