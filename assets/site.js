(function(){
  var MODULES=[
    {name:'Paperwork drafted for you',icon:'file-doc',
     blurb:'Quotes, proposals, reports and letters, drafted in your own template from a voice note, a form or an email. You check it and send it.',
     ex:[['Trades','A quote priced from your price list, from a voice note on site'],['Clinics','Treatment plans and aftercare notes in your clinic\'s format'],['Offices','Proposals that start from your last good one']],
     fit:'The same kind of document gets written from scratch every week.',
     long:'We set it up on a few of your past documents and your prices, so every draft reads like one you wrote. Nothing goes out until you\'ve checked it.',
     ticks:['Your own templates, logo and wording','Figures from your price list or records, never made up','Word and PDF, ready to send','Works from your phone']},
    {name:'Follow-ups that happen on time',icon:'paper-plane-tilt',
     blurb:'Chasing, reminders and check-ins sent in your voice at the right moment, and stopped as soon as someone replies.',
     ex:[['Trades','A nudge on quotes not yet accepted'],['Salons','A rebooking message when a client is due back'],['Accountants','Reminders to clients who still owe paperwork']],
     fit:'Money or work slips away because nobody had time to chase it.',
     long:'We start with the follow-ups you already mean to send, write them in your voice and time them to your week. Every message has an opt-out, and replies come straight to you.',
     ticks:['Written in your voice, approved by you','Stops the moment someone replies','An opt-out in every message','Only people you\'re allowed to contact']},
    {name:'Enquiries answered and sorted',icon:'chat-circle-dots',
     blurb:'Common questions answered from your own information, and new enquiries sorted so the ones worth calling back reach you first.',
     ex:[['Salons','Booking requests turned into appointments'],['Trades','Enquiries sorted by job type and area'],['Shops','Delivery and returns questions answered at any hour']],
     fit:'You answer the same questions by hand, one message at a time.',
     long:'We load your services, policies and the answers you give every week, then connect it to where enquiries arrive. Anything it can\'t answer comes to you.',
     ticks:['Answers from your own information only','Anything unusual handed to you','Your website, email or messages','A weekly summary of what came in']},
    {name:'Your own AI workspace',icon:'users-three',
     blurb:'Claude set up for you and your team, with your documents, templates and tone loaded in and your weekly jobs ready to run. Then we train you on it.',
     ex:[['Offices','Meeting notes turned into actions and emails'],['Lettings','Listings and tenant letters in your style'],['Any team','Answers found in your own documents']],
     fit:'You use ChatGPT or Claude already, but only for the odd email.',
     long:'Anyone can sign up for Claude. The work is choosing the jobs worth setting up, loading your templates and tone, and connecting the tools you already use. We do that part, then train you and your team.',
     ticks:['We pick the jobs worth setting up','Your templates, documents and tone loaded in','Connected to the tools you already use','A training session for you and your team']},
    {name:'A website that brings in work',icon:'globe',
     blurb:'A fast, clear site that shows what you do, with an enquiry form that reaches your phone.',
     ex:[['Trades','Your work and the areas you cover'],['Clinics','Your treatments and online booking'],['Shops','Your products, opening hours and how to find you']],
     fit:'Work comes from word of mouth and a Facebook page.',
     long:'Written in plain English, quick to load on a phone, and set up so enquiries reach you straight away. Small updates are covered by the monthly fee.',
     ticks:['Your photos, services and details','Enquiries straight to your phone','Quick to load on a phone signal','Updates in the monthly fee']}
  ];
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function icon(n,c){return '<svg class="i'+(c?' '+c:'')+'" aria-hidden="true"><use href="#i-'+n+'"/></svg>';}
  var uid=0;
  function modRow(m,full){
    var id='md-'+(++uid);
    var html='<div class="mod"><div class="mod-row">'+
      '<div class="sys-name"><span class="sys-ico">'+icon(m.icon)+'</span><div><h3 class="h3">'+esc(m.name)+'</h3><p>'+esc(m.blurb)+'</p></div></div>'+
      '<div><span class="ex-label">For example</span><dl class="spec ex-list">'+m.ex.map(function(e){return '<div><dt>'+esc(e[0])+'</dt><dd>'+esc(e[1])+'</dd></div>';}).join('')+'</dl></div>'+
      '<div class="fitline"><span>Worth a look if</span><p>'+esc(m.fit)+'</p></div></div>';
    if(full){
      html+='<button class="disclose" type="button" aria-expanded="false" aria-controls="'+id+'">What\'s inside'+icon('caret-down')+'</button>'+
        '<div class="reveal" id="'+id+'"><div><div class="sys-detail"><p>'+esc(m.long)+'</p><ul class="ticks">'+
        m.ticks.map(function(t){return '<li>'+icon('check')+'<span>'+esc(t)+'</span></li>';}).join('')+'</ul></div></div></div>';
    }
    return html+'</div>';
  }
  var homeMods=document.getElementById('home-mods'),svcMods=document.getElementById('svc-mods');
  if(homeMods)homeMods.innerHTML=MODULES.map(function(m){return modRow(m,false);}).join('');
  if(svcMods)svcMods.innerHTML=MODULES.map(function(m){return modRow(m,true);}).join('');

  /* Disclosures: build rows and FAQ share one pattern */
  document.addEventListener('click',function(e){
    var b=e.target.closest('.disclose, .qa>h3>button');if(!b)return;
    var panelEl=b.classList.contains('disclose')?document.getElementById(b.getAttribute('aria-controls')):b.closest('.qa').querySelector('.reveal');
    var open=b.getAttribute('aria-expanded')!=='true';
    b.setAttribute('aria-expanded',open);panelEl.classList.toggle('open',open);
  });

  var REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Hero: an example job plays through, one business at a time ---------- */
  var feed=document.getElementById('feed');
  if(feed){
  var listEl=feed.querySelector('.log-list'),clockEl=document.getElementById('feed-clock'),
      bizEl=document.getElementById('feed-biz'),findEl=document.getElementById('feed-finding'),footEl=document.getElementById('feed-foot');
  function hli(t,time,who,body,built){return '<li data-t="'+t+'"'+(built?' data-built':'')+'><span class="log-time">'+time+'</span><div class="log-body"><span class="log-who">'+who+'</span>'+body+'</div></li>';}
  function said(s){return '<p class="log-what">&ldquo;'+s+'&rdquo;</p>';}
  function note(s){return '<p class="log-what">'+s+'</p>';}
  function made(ic,s){return '<p class="log-out">'+icon(ic)+s+'</p>';}
  function doc(name,sub){return '<span class="doc">'+icon('file-doc')+'<b>'+name+'</b><span>'+sub+'</span></span>';}
  var HERO=[
    {biz:bizEl.textContent,finding:findEl.innerHTML,foot:footEl.innerHTML,html:listEl.innerHTML},
    {biz:'Example: skin clinic',
     finding:'Rebooking clients took Sunday evenings. So the follow-ups came first.',
     foot:'12 clients asked back, 8 minutes after the first message',
     html:hli(542,'09:02','Booking system',note('12 clients are due back for a top-up this month.'))+
          hli(543,'09:03','Follow-ups',made('note-pencil','12 messages drafted in your clinic&rsquo;s voice')+doc('Rebooking messages','Checked against opt-outs'),true)+
          hli(549,'09:09','You',said('Looks good. Send them.'))+
          hli(550,'09:10','Follow-ups',made('paper-plane-tilt','Sent. Replies come straight to you.'),true)},
    {biz:'Example: bookkeeper',
     finding:'Chasing clients for paperwork took a day every quarter. So the reminders came first.',
     foot:'A day of chasing, done in six minutes',
     html:hli(510,'08:30','Client list',note('9 clients still owe their receipts for the quarter.'))+
          hli(511,'08:31','Reminders',made('note-pencil','9 reminders drafted, each listing what is missing'),true)+
          hli(515,'08:35','You',said('Send them, and nudge again on Friday.'))+
          hli(516,'08:36','Reminders',made('paper-plane-tilt','Sent. Friday&rsquo;s nudge is set for anyone who hasn&rsquo;t replied.'),true)}
  ];
  var cur=0,items,START,END;
  function load(ex){bizEl.textContent=ex.biz;findEl.innerHTML=ex.finding;footEl.innerHTML=ex.foot;listEl.innerHTML=ex.html;
    items=[].slice.call(listEl.querySelectorAll('li'));START=+items[0].dataset.t-4;END=+items[items.length-1].dataset.t;}
  load(HERO[0]);
  function fmt(m){m=((m%1440)+1440)%1440;var h=Math.floor(m/60),mm=m%60;return (h<10?'0':'')+h+':'+(mm<10?'0':'')+mm;}
  var F={i:0,clock:END,timer:null,raf:0,visible:true,waiting:false};
  function tickClock(to,dur){cancelAnimationFrame(F.raf);var from=F.clock,t0=performance.now();
    (function f(now){var p=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-p,3);F.clock=Math.round(from+(to-from)*e);clockEl.textContent=fmt(F.clock);if(p<1)F.raf=requestAnimationFrame(f);})(t0);}
  function resetFeed(){items.forEach(function(li){li.classList.add('is-pending');li.classList.remove('is-flash');});F.clock=START;clockEl.textContent=fmt(START);F.i=0;}
  function later(fn,ms){clearTimeout(F.timer);F.timer=setTimeout(function(){if(F.visible)fn();else F.waiting=fn;},ms);}
  function endHold(ms){later(function(){items.forEach(function(li){li.classList.add('is-pending');});later(function(){cur=(cur+1)%HERO.length;load(HERO[cur]);resetFeed();later(step,600);},260);},ms);}
  function step(){
    if(F.i>=items.length){endHold(9000);return;}
    var li=items[F.i],t=+li.dataset.t;tickClock(t,850);
    later(function(){
      li.classList.remove('is-pending');
      if(li.hasAttribute('data-built')){setTimeout(function(){li.classList.add('is-flash');setTimeout(function(){li.classList.remove('is-flash');},700);},420);}
      F.i++;later(step,1500);
    },900);
  }
  if(!REDUCED){
    /* Start complete, so the first frame reads fully, then replay */
    F.i=items.length;endHold(3500);
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){F.visible=es[0].isIntersecting&&!document.hidden;if(F.visible&&F.waiting){var fn=F.waiting;F.waiting=false;fn();}}).observe(feed);
    }
    document.addEventListener('visibilitychange',function(){F.visible=!document.hidden;if(F.visible&&F.waiting){var fn=F.waiting;F.waiting=false;fn();}});
  }

  }

  /* ---------- Evenings: the week's admin is handed over as you scroll ---------- */
  var DAYS=['Mon','Tue','Wed','Thu','Fri','Sat'],TIMES=['18:30','19:00','19:30','20:00','20:30','21:00'];
  /* null = free; ['k',label] = still yours; ['q'|'f',order,label] = handed over */
  var PLAN=[
    [['q',1,'Quote for the Oak Rd kitchen'],null,['k','Materials'],['f',6,'Chaser on the Elm St quote'],null,null],
    [['k','Site notes'],['q',2,'Quote for a loft ladder'],null,null,['q',8,'Quote for a stair rail'],null],
    [null,['f',3,'Follow-up on the Hale job'],['q',4,'Quote for a garden room'],['k','Invoicing'],null,null],
    [null,null,null,['q',7,'Quote for fitted wardrobes'],null,['k','Pricing']],
    [null,null,['f',5,'Chaser on the Park Ave quote'],null,null,null],
    [null,null,null,null,null,null]
  ];
  /* kind: [icon, label before, label after, verb for the running caption] */
  var KIND={q:['file-doc','Quote','Drafted','drafted for you'],f:['paper-plane-tilt','Chase','Sent','sent for you']};
  var calGrid=document.getElementById('cal-grid');
  if(calGrid){
  var slots=[],adminCount=0,html='<span></span>'+DAYS.map(function(d){return '<span class="cal-day">'+d+'</span>';}).join('');
  PLAN.forEach(function(row,r){
    html+='<span class="cal-time">'+TIMES[r]+'</span>';
    row.forEach(function(c,d){
      if(!c){html+='<div class="slot is-free"></div>';return;}
      adminCount++;
      if(c[0]==='k'){html+='<div class="slot is-old"><span>'+esc(c[1])+'</span></div>';return;}
      var k=KIND[c[0]];slots[c[1]-1]={day:DAYS[d],time:TIMES[r],label:c[2],verb:k[3]};
      html+='<div class="slot is-auto" data-n="'+c[1]+'" title="'+esc(c[2])+'"><span>'+esc(k[1])+'</span><span class="chip-b">'+icon(k[0])+'<span class="lbl">'+esc(k[2])+'</span></span></div>';
    });
  });
  calGrid.innerHTML=html;
  var slotEls=[];calGrid.querySelectorAll('[data-n]').forEach(function(el){slotEls[+el.dataset.n-1]=el;});
  var diary=document.getElementById('diary'),hrsEl=document.getElementById('fill-hrs'),latestEl=document.getElementById('fill-latest'),shown=-1;
  function hm(mins){var h=Math.floor(mins/60),m=mins%60;return h+'h '+(m<10?'0':'')+m+'m';}
  function paintDiary(n){
    if(n===shown)return;shown=n;
    slotEls.forEach(function(el,i){el.classList.toggle('on',i<n);});
    hrsEl.textContent=hm((adminCount-n)*30);
    if(n===0)latestEl.textContent='Scroll to hand the admin over.';
    else{var b=slots[n-1];latestEl.innerHTML='<span class="mono">'+b.day+' '+b.time+'</span>'+esc(b.label)+', '+b.verb+'.';}
  }
  function onDiaryScroll(){
    if(diary.offsetParent===null)return;
    var r=diary.getBoundingClientRect(),run=r.height-window.innerHeight;
    var p=run>0?Math.min(1,Math.max(0,(-r.top+window.innerHeight*.15)/run)):1;
    paintDiary(Math.min(slotEls.length,Math.round(p*1.12*slotEls.length)));
  }
  if(REDUCED){paintDiary(slotEls.length);}
  else{window.addEventListener('scroll',function(){requestAnimationFrame(onDiaryScroll);},{passive:true});window.addEventListener('resize',onDiaryScroll);onDiaryScroll();}

  }

  /* ---------- Cursor spotlight ---------- */
  if(window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    var spotRaf=0,lastE=null;
    document.addEventListener('pointermove',function(e){lastE=e;if(spotRaf)return;spotRaf=requestAnimationFrame(function(){spotRaf=0;
      var el=lastE.target.closest&&lastE.target.closest('.spot');if(!el)return;var b=el.getBoundingClientRect();
      el.style.setProperty('--mx',(lastE.clientX-b.left)+'px');el.style.setProperty('--my',(lastE.clientY-b.top)+'px');});},{passive:true});
  }

  /* ---------- Scroll-driven background ---------- */
  (function(){
    var layer=document.querySelector('.bg-layer'),cv=document.getElementById('flow'),ctx=cv&&cv.getContext('2d');if(!layer||!ctx)return;
    var TOUCH=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
    var W=0,H=0,DPR=0,GAP=26,t=0,last=performance.now(),lastY=scrollTop(),sampleY=lastY,sampleT=last,speed=0,energy=0,still=0,running=false,hidden=false,lastDraw=0,rsz=0;
    var LEVELS=7,paths=[];
    var de=document.documentElement;
    function light(){return de.getAttribute('data-theme')==='light';}
    function scrollTop(){var y=window.scrollY;return y>0?y:0;} /* iOS rubber-banding reports a negative scroll */
    /* Size from the layer (100lvh), not innerHeight. A phone's address bar sliding away fires resize and changes
       innerHeight but not the layer, and setting canvas.width blanks the canvas: so only do it when the size really changed. */
    function size(){
      var w=layer.clientWidth||innerWidth,h=layer.clientHeight||innerHeight,d=Math.min(2,window.devicePixelRatio||1);
      if(w===W&&h===H&&d===DPR)return false;
      W=w;H=h;DPR=d;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);GAP=W<640?22:26;return true;
    }
    function draw(){
      var y=scrollTop(),L=light();
      var base=L?[38,52,75]:[232,235,235],hi=L?[0,128,106]:[59,191,167];
      var baseA=L?.09:.075, hiA=L?(.28+.16*energy):(.32+.22*energy);
      var par=y*0.35, n0=Math.floor(par/GAP), off=par-n0*GAP;
      for(var k=0;k<LEVELS;k++)paths[k]=new Path2D();
      var cols=Math.ceil(W/GAP)+1,rows=Math.ceil(H/GAP)+2;
      for(var r=0;r<rows;r++){
        /* Row n0+r of the page. The stagger follows the page row: following the screen row made the whole lattice
           jump half a cell sideways every time scrolling carried it on by one row. */
        var n=n0+r, sy=r*GAP-off, wy=n*GAP, sh=n&1?GAP/2:0;
        for(var c=0;c<cols;c++){
          var sx=c*GAP+sh-GAP/2;
          var w=Math.sin(sx*.0055+wy*.0042-y*.0016-t*.18)+.65*Math.sin(sx*.0102-wy*.0068+y*.0011+t*.11);
          var b=(w-.55)/1.05;b=b<0?0:b>1?1:b;b=b*b*(3-2*b);
          var k=Math.min(LEVELS-1,Math.floor(b*LEVELS));
          var rad=1+b*(1.4+energy*.8);
          paths[k].moveTo(sx+rad,sy);paths[k].arc(sx,sy,rad,0,6.2832);
        }
      }
      ctx.clearRect(0,0,W,H);
      for(var k2=0;k2<LEVELS;k2++){
        var m=k2/(LEVELS-1),a=baseA+(hiA-baseA)*m,cc=k2===0?base:[base[0]+(hi[0]-base[0])*Math.min(1,m*1.6)|0,base[1]+(hi[1]-base[1])*Math.min(1,m*1.6)|0,base[2]+(hi[2]-base[2])*Math.min(1,m*1.6)|0];
        ctx.fillStyle='rgba('+cc[0]+','+cc[1]+','+cc[2]+','+a.toFixed(3)+')';ctx.fill(paths[k2]);
      }
    }
    function frame(now){
      if(hidden){running=false;return;}
      var dt=Math.max(0,Math.min(64,now-last));last=now;
      var y=scrollTop();
      /* Scroll speed over 32ms or more, so phones that report the position unevenly don't make the ridges flicker */
      if(now-sampleT>=32){speed=Math.abs(y-sampleY)/(now-sampleT);sampleY=y;sampleT=now;}
      var moved=y!==lastY;
      if(moved){lastY=y;still=0;}else still+=dt;
      var target=Math.min(1,speed*16.7/28);
      energy+=(target-energy)*(1-Math.exp(-dt/(target>energy?85:400)));
      t+=dt/1000*(0.35+energy*1.6);
      var calm=energy<=.02,rest=TOUCH&&calm&&still>600;
      if(rest||(calm&&!moved?now-lastDraw>42:now-lastDraw>10)){draw();lastDraw=now;} /* every frame while scrolling, slower drift at rest */
      if(rest){running=false;return;} /* touch screens: stop when scrolling stops, the next scroll restarts it */
      requestAnimationFrame(frame);
    }
    function start(){
      if(running||hidden)return;
      running=true;last=performance.now();sampleT=last;sampleY=lastY=scrollTop();still=0;requestAnimationFrame(frame);
    }
    size();draw();
    window.addEventListener('resize',function(){if(rsz)return;rsz=requestAnimationFrame(function(){rsz=0;if(size())draw();});});
    new MutationObserver(function(){draw();}).observe(de,{attributes:true,attributeFilter:['data-theme']});
    if(REDUCED)return;
    document.addEventListener('visibilitychange',function(){hidden=document.hidden;if(!hidden)start();});
    window.addEventListener('scroll',start,{passive:true});
    window.addEventListener('pageshow',function(e){if(e.persisted){size();draw();start();}});
    start();
  })();

  /* Routing: each view is its own page (/audit/, /faq/ ...). Old /#faq links are redirected in the page head. */
  var VIEWS=['home','audit','services','about','faq','privacy'];
  var head=document.querySelector('.site-head'),mnav=document.getElementById('mobile-nav'),mbtn=document.getElementById('menu-btn');
  function pathFor(v){return v==='home'?'/':'/'+v+'/';}
  var curEl=document.querySelector('[data-view]'),curView=curEl?curEl.dataset.view:'';
  document.querySelectorAll('.nav a,.mobile-nav a').forEach(function(a){if(a.dataset.go===curView)a.setAttribute('aria-current','page');});
  document.addEventListener('click',function(e){
    var a=e.target.closest('[data-go]');if(!a||e.defaultPrevented)return;
    if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var v=a.dataset.go;if(VIEWS.indexOf(v)<0)return;closeMenu();
    if(v===curView){e.preventDefault();window.scrollTo({top:0,behavior:REDUCED?'auto':'smooth'});return;}
    if(a.tagName!=='A'){e.preventDefault();location.href=pathFor(v);}
  });

  /* Header state on scroll */
  function onScroll(){head.classList.toggle('is-scrolled',window.scrollY>8);}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();

  /* Mobile menu */
  function closeMenu(){mnav.classList.remove('open');mbtn.setAttribute('aria-expanded','false');mbtn.setAttribute('aria-label','Open menu');}
  mbtn.addEventListener('click',function(){var o=!mnav.classList.contains('open');mnav.classList.toggle('open',o);mbtn.setAttribute('aria-expanded',o);mbtn.setAttribute('aria-label',o?'Close menu':'Open menu');});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMenu();});
  document.addEventListener('click',function(e){if(mnav.classList.contains('open')&&!e.target.closest('#mobile-nav,#menu-btn'))closeMenu();});

  /* Theme: dark is the brand default, light on request */
  var root=document.documentElement,tbtn=document.getElementById('theme-btn');
  function syncTheme(){var l=root.getAttribute('data-theme')==='light';tbtn.setAttribute('aria-label',l?'Switch to dark theme':'Switch to light theme');}
  tbtn.addEventListener('click',function(){root.setAttribute('data-theme',root.getAttribute('data-theme')==='light'?'dark':'light');syncTheme();});
  syncTheme();

  /* Book-a-call dialog */
  var dlg=document.getElementById('book'),form=document.getElementById('book-form'),wrapF=document.getElementById('book-form-wrap'),sent=document.getElementById('book-sent');
  document.addEventListener('click',function(e){
    if(e.target.closest('[data-book]')){if(window.gtag)gtag('event','book_call_opened');closeMenu();wrapF.hidden=false;sent.hidden=true;if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');setTimeout(function(){document.getElementById('b-first').focus();},30);}
    if(e.target.closest('[data-close]'))dlg.close();
  });
  dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});
  var MSG={first:'Enter your first name.',last:'Enter your surname.',email:'Enter an email address like name@business.co.uk.',phone:'Enter a phone number we can call.',business:'Enter your business name.'};
  function check(inp){
    var v=inp.value.trim(),bad=!v||(inp.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))||(inp.type==='tel'&&v.replace(/\D/g,'').length<10);
    inp.setAttribute('aria-invalid',bad);document.getElementById(inp.id+'-err').textContent=bad?MSG[inp.name]:'';return !bad;
  }
  form.addEventListener('submit',function(e){
    e.preventDefault();var first=null;
    form.querySelectorAll('.input[required]').forEach(function(i){if(!check(i)&&!first)first=i;});
    if(first){first.focus();return;}
    var f=form.elements;
    /* GoHighLevel inbound webhook, the same one and field names the April site used */
    fetch('https://services.leadconnectorhq.com/hooks/X7fJLbGttbin1BYvD1oX/webhook-trigger/4687c9dd-0762-46df-8f8f-1f1d34bded4c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      first_name:f.first.value.trim(),last_name:f.last.value.trim(),email:f.email.value.trim(),
      phone:f.phone.value.trim(),business_name:f.business.value.trim(),message:f.week.value.trim(),
      source:'Website: book a call'
    })}).then(function(r){if(r.ok&&window.gtag)gtag('event','generate_lead',{form_id:'book-form'});}).catch(function(err){console.error('Booking request failed',err);});
    wrapF.hidden=true;sent.hidden=false;form.reset();
  });
  form.addEventListener('input',function(e){if(e.target.getAttribute('aria-invalid')==='true')check(e.target);});
})();
