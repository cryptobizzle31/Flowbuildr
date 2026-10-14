(function(){
  var cc=document.getElementById('cookie-consent'),saved=null;
  try{saved=localStorage.getItem('fb_consent');}catch(e){}
  if(saved!=='granted'&&saved!=='denied')cc.hidden=false;
  cc.addEventListener('click',function(e){
    var b=e.target.closest('[data-consent]');if(!b)return;
    var v=b.getAttribute('data-consent');
    try{localStorage.setItem('fb_consent',v);}catch(err){}
    if(v==='granted')gtag('consent','update',{analytics_storage:'granted'});
    cc.hidden=true;
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest('[data-cookie-reset]'))return;
    try{localStorage.removeItem('fb_consent');}catch(err){}
    gtag('consent','update',{analytics_storage:'denied'});
    cc.hidden=false;cc.querySelector('.cc-no').focus();
  });
})();
