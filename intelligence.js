/* A synthetic, interactive point-cloud study. No customer data or live model. */
(() => {
  const canvas=document.querySelector('#intelligence-canvas'), ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=document.querySelector('#motion-toggle');
  const titles=['READ THE SIGNAL','FIND THE PATTERNS','RETRIEVE THE EVIDENCE'];
  const captions=['Complex signals begin as an unstructured cloud.','Similar signals form neighborhoods of meaning.','A query brings related evidence into focus.'];
  const colors=[[106,225,236],[115,156,245],[169,181,251],[78,180,218],[170,230,244]];
  let seed=37;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
  const points=Array.from({length:720},(_,i)=>{
    const group=i%5,theta=random()*Math.PI*2,u=random()*2-1,r=.16+Math.pow(random(),.5)*.25;
    const gtheta=group*Math.PI*2/5;
    const cluster=[Math.cos(gtheta)*.56+Math.cos(theta)*Math.sqrt(1-u*u)*r,Math.sin(gtheta)*.56+u*r,(group%2?-.17:.2)+Math.sin(theta)*Math.sqrt(1-u*u)*r];
    const raw=[(random()-.5)*1.8,(random()-.5)*1.8,(random()-.5)*1.8];
    return {group,raw,cluster,p:[...cluster],size:.7+random()*1.2,phase:random()*Math.PI*2};
  });
  let mode=1,paused=reduced.matches,inView=true,raf=0,w=1,h=1,dpr=1,angle=.4,last=0,tilt=.1,pointerX=0,pointerY=0,transition=0;
  function size(){const r=canvas.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);draw(0);request()}
  function project(x,y,z){const ca=Math.cos(angle),sa=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt);const rx=x*ca-z*sa,rz=x*sa+z*ca;const ry=y*ct-rz*st,zz=y*st+rz*ct;const depth=2.9/(2.9+zz);const scale=Math.min(w,h)*.38;return{x:w*.5+rx*scale*depth,y:h*.48+ry*scale*depth,z:zz,depth}}
  function draw(dt){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    if(!paused){angle+=dt*.000065;angle+=pointerX*.0015;tilt+=(pointerY*.3+.1-tilt)*.025}
    let moving=false;
    for(const p of points){const target=mode===0?p.raw:p.cluster;for(let k=0;k<3;k++){if(Math.abs(target[k]-p.p[k])>.0005)moving=true;p.p[k]+= (target[k]-p.p[k])*(reduced.matches?1:.065)}}
    const projected=points.map((p,i)=>{const q=project(...p.p);return{...q,p,i}});
    // Thin reference orbits provide depth without turning the scene into a dashboard.
    ctx.lineWidth=.65;for(let ring=0;ring<3;ring++){ctx.beginPath();for(let a=0;a<=120;a++){const t=a/120*Math.PI*2;let coords=ring===0?[Math.cos(t)*1.04,Math.sin(t)*1.04,0]:ring===1?[Math.cos(t)*1.04,0,Math.sin(t)*1.04]:[0,Math.cos(t)*1.04,Math.sin(t)*1.04];const q=project(...coords);a?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)}ctx.strokeStyle=ring===0?'#44678345':'#37506d24';ctx.stroke()}
    // Short connections use the same synthetic neighborhoods shown by the points.
    if(mode!==0){for(let i=0;i<points.length;i+=5){const a=projected[i],b=projected[(i+25)%points.length];const dist=Math.hypot(a.x-b.x,a.y-b.y);if(dist>75)continue;const bright=mode===2&&a.p.group===0;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=bright?'#9cf2ff45':'#648fb51c';ctx.lineWidth=bright?.8:.5;ctx.stroke()}}
    projected.sort((a,b)=>b.z-a.z).forEach(q=>{const c=colors[q.p.group];let alpha=Math.max(.2,Math.min(.95,.65-q.z*.28));if(mode===2&&q.p.group!==0)alpha*=.18;const radius=q.p.size*q.depth*(mode===2&&q.p.group===0?1.15:1);ctx.beginPath();ctx.arc(q.x,q.y,radius,0,Math.PI*2);ctx.fillStyle=`rgba(${c.join(',')},${alpha})`;ctx.fill();if(q.i%61===0&&(mode!==2||q.p.group===0)){const glow=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,12);glow.addColorStop(0,`rgba(${c.join(',')},.2)`);glow.addColorStop(1,`rgba(${c.join(',')},0)`);ctx.fillStyle=glow;ctx.fillRect(q.x-12,q.y-12,24,24)}});
    if(mode===2){const q=project(.56,0,.2);const pulse=paused?0:Math.sin(angle*10)*3;ctx.beginPath();ctx.arc(q.x,q.y,29+pulse,0,Math.PI*2);ctx.strokeStyle='#9ef6ff9a';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();ctx.arc(q.x,q.y,37+pulse,0,Math.PI*2);ctx.strokeStyle='#67dfed30';ctx.stroke()}
    transition=moving?transition+1:0;
  }
  function tick(t){raf=0;const dt=last?Math.min(t-last,40):16;last=t;draw(dt);if((!paused||transition)&&inView&&!document.hidden)request()}
  function request(){if(!raf&&inView&&!document.hidden)raf=requestAnimationFrame(tick)}
  document.querySelectorAll('[data-space]').forEach(button=>button.addEventListener('click',()=>{mode=Number(button.dataset.space);canvas.dataset.mode=String(mode);document.querySelectorAll('[data-space]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelector('#space-number').textContent=String(mode+1).padStart(2,'0');document.querySelector('#space-title').textContent=titles[mode];document.querySelector('#space-description').textContent=captions[mode];transition=1;request()}));
  function updateMotion(){motion.setAttribute('aria-pressed',String(paused));motion.setAttribute('aria-label',paused?'Play visualization':'Pause visualization');motion.innerHTML=paused?'<svg class="motion-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>':'<svg class="motion-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10"/></svg>';request()}
  motion.addEventListener('click',()=>{paused=!paused;updateMotion()});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateMotion()});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5},{passive:true});canvas.addEventListener('pointerleave',()=>{pointerX=0;pointerY=0});
  new ResizeObserver(size).observe(canvas);
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;if(inView){last=0;request()}},{threshold:0}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=0;request()}});
  canvas.dataset.mode='1';updateMotion();
})();
