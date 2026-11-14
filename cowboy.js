/* Original supplied animation frames, mirrored at render time. No generated poses. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const layer = document.createElement('div');
  layer.id = 'cowboy-scroll';
  layer.innerHTML = `<div class="lasso-track" role="scrollbar" tabindex="0" aria-label="Page scroll position" aria-controls="main" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="lasso-rail"></span><span class="lasso-thumb"></span></div><svg class="lasso-line" aria-hidden="true"><g class="rope-lead"><path class="rope-shadow"/><path class="rope-core"/><path class="rope-twist"/></g><g class="rope-wrap"><path class="rope-shadow"/><path class="rope-core"/><path class="rope-twist"/></g><g class="rope-knot"><path class="rope-shadow"/><path class="rope-core"/></g></svg><canvas class="cowboy-actor" width="340" height="348" aria-hidden="true"></canvas>`;
  document.body.append(layer);
  const canvas = layer.querySelector('canvas'), ctx = canvas.getContext('2d');
  const track = layer.querySelector('.lasso-track'), thumb = layer.querySelector('.lasso-thumb');
  const rope = layer.querySelector('svg'), paths = [...rope.querySelectorAll('.rope-lead path')], wraps=[...rope.querySelectorAll('.rope-wrap path')], knots=[...rope.querySelectorAll('.rope-knot path')];
  let clips, state = 'loading', start = 0, lastScroll = -Infinity, raf = 0;
  let viewport = {}, actorX = 0, ropePoint = null, currentClip = '', currentFrame = -1;
  let attached = false, dragging = false, totalWalk = 0, pullStart = 0;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  function resize() {
    const mobile = innerWidth <= 760;
    viewport = {w:document.documentElement.clientWidth,h:document.documentElement.clientHeight,size:mobile?130:200,dock:mobile?34:58,trackX:mobile?17:34,bottom:mobile?12:18,trackTop:mobile?80:98};
    viewport.actorHeight=viewport.size*348/340;
    viewport.trackBottom=Math.max(viewport.trackTop+40,viewport.h-viewport.actorHeight-28);
    canvas.style.width=viewport.size+'px';canvas.style.height=viewport.actorHeight+'px';
    canvas.style.bottom=viewport.bottom+'px';
    track.style.left=(viewport.trackX-13)+'px';track.style.top=viewport.trackTop+'px';track.style.height=(viewport.trackBottom-viewport.trackTop)+'px';
    rope.setAttribute('viewBox',`0 0 ${viewport.w} ${viewport.h}`);
    if(state!=='walking'&&state!=='loading') place(viewport.dock);
    updateScroll();
  }
  function progress(){return clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight),0,1)}
  function updateScroll(){const p=progress();thumb.style.top=`${p*100}%`;track.setAttribute('aria-valuenow',String(Math.round(p*100)));track.setAttribute('aria-valuetext',Math.round(p*100)+'% through page');drawRope();}
  function place(x){actorX=x;canvas.style.left=(x-viewport.size/2)+'px';}
  // A canvas display mask removes only the near-black background connected to
  // the frame edges. Interior dark features (beard, clothes) stay untouched.
  function displayFrame(image, sx,sy,w,h){
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,sx,sy,w,h,0,0,w,h);
    const im=x.getImageData(0,0,w,h),d=im.data,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
    function add(i){if(i<0||i>=w*h||seen[i])return;seen[i]=1;const j=i*4;if(d[j+3]===0||Math.max(d[j],d[j+1],d[j+2])<=13){queue[tail++]=i;d[j+3]=0;}}
    for(let col=0;col<w;col++){add(col);add((h-1)*w+col)}for(let row=0;row<h;row++){add(row*w);add(row*w+w-1)}
    while(head<tail){const i=queue[head++],col=i%w;add(i-w);add(i+w);if(col>0)add(i-1);if(col<w-1)add(i+1)}
    x.putImageData(im,0,0);return c;
  }
  async function load(){
    const meta=await fetch('assets/cowboy/clips.json').then(r=>{if(!r.ok)throw Error('Missing animation metadata');return r.json()});
    const entries=await Promise.all(Object.entries(meta).map(async([name,m])=>{const image=new Image();image.src=`assets/cowboy/${name}.webp`;await image.decode();return[name,{...m,frames:m.frames.map((f,i)=>({...f,image:displayFrame(image,(i%4)*m.width,Math.floor(i/4)*m.height,m.width,m.height)}))}]}));
    clips=Object.fromEntries(entries);document.body.classList.add('cowboy-enabled');resize();
    state=reducedMotion.matches?'idle':'walking';layer.dataset.state=state;start=performance.now();totalWalk=clamp(viewport.w/210*1000,2200,5200)+1120;
    layer.classList.add('ready');if(reducedMotion.matches){attached=true;place(viewport.dock);render('pull',15);layer.classList.add('attached');drawRope()}else requestTick();
  }
  function render(name,frame){
    if(name===currentClip&&frame===currentFrame)return;
    currentClip=name;currentFrame=frame;const f=clips[name].frames[frame];
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,340,348);
    ctx.setTransform(-1,0,0,1,340,0);ctx.drawImage(f.image,170-f.anchorX,348-clips[name].height);ctx.setTransform(1,0,0,1,0,0);
    ropePoint=f.ropeX===null?null:{x:170+f.anchorX-f.ropeX,y:348-clips[name].height};
    canvas.dataset.clip=name;canvas.dataset.frame=frame;
  }
  function drawRope(reach=1){
    if(!ropePoint||(!attached&&state!=='tossing')){rope.style.opacity='0';return}
    const scale=viewport.size/340;
    const x=actorX-viewport.size/2+ropePoint.x*scale,y=viewport.h-viewport.bottom-viewport.actorHeight+ropePoint.y*scale;
    const tx=viewport.trackX,ty=viewport.trackTop+progress()*(viewport.trackBottom-viewport.trackTop);
    const ey=y+(ty+6-y)*reach,ex=x+(tx-8-x)*reach;
    const d=`M ${x} ${y+8} Q ${x-2} ${(y+ey)/2} ${ex} ${ey}`;
    paths.forEach(p=>p.setAttribute('d',d));
    // The loop encloses the handle, crosses its front, and cinches at the left.
    // Its geometry follows the same thumb position as scrolling and dragging.
    const loop=`M ${tx-8} ${ty+6} C ${tx-14} ${ty-3} ${tx-9} ${ty-16} ${tx} ${ty-16} C ${tx+12} ${ty-16} ${tx+14} ${ty-3} ${tx+9} ${ty+8} C ${tx+5} ${ty+17} ${tx-7} ${ty+16} ${tx-9} ${ty+6} L ${tx+8} ${ty+1}`;
    const knot=`M ${tx-10} ${ty+4} l 5 4 l -5 2 l 4 -7 M ${tx-7} ${ty+9} q 4 7 9 8`;
    wraps.forEach(p=>{p.setAttribute('d',loop);p.style.opacity=String(clamp((reach-.8)/.2,0,1))});
    knots.forEach(p=>{p.setAttribute('d',knot);p.style.opacity=String(clamp((reach-.94)/.06,0,1))});
    rope.style.opacity=String(reach>0?1:0);
  }
  function setState(next){state=next;layer.dataset.state=next;}
  function requestTick(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick)}
  function tick(now){raf=0;
    if(reducedMotion.matches){setState('idle');attached=true;layer.classList.add('attached');place(viewport.dock);render('pull',15);drawRope();return}
    if(state==='walking'){
      const t=Math.max(0,now-start),travel=totalWalk-1120;
      // Loop the walking part, then use the supplied settling/looking-up frames.
      const f=t<travel?Math.floor(t/140)%8:8+Math.min(7,Math.floor((t-travel)/140));
      const p=clamp(t/travel,0,1);place((viewport.w+viewport.size/2)*(1-p)+viewport.dock*p);render('walk',f);
      if(t>=totalWalk){setState('tossing');start=now;place(viewport.dock)}
    }else if(state==='tossing'){
      const t=Math.max(0,now-start);render('toss',Math.min(15,Math.floor(t/150)));
      // The supplied rope reaches the top of its frame at frame 11–12.
      // Continue that exact endpoint to the custom scrollbar thumb.
      const reach=clamp((t-1650)/400,0,1);drawRope(reach);
      if(reach>=1){attached=true;layer.classList.add('attached')}
      if(t>=2400){setState('idle');attached=true;render('pull',0);drawRope();if(now-lastScroll<350){setState('pulling');pullStart=now}}
    }else if(state==='pulling'){
      const elapsed=Math.max(0,now-pullStart);render('pull',Math.floor(elapsed/140)%16);drawRope();
      if(elapsed>=2240&&now-lastScroll>180){setState('idle');render('pull',15);drawRope()}
    }
    if(state==='walking'||state==='tossing'||state==='pulling')requestTick();
  }
  addEventListener('scroll',()=>{updateScroll();lastScroll=performance.now();if(state==='idle'&&!reducedMotion.matches){setState('pulling');pullStart=lastScroll;requestTick()}},{passive:true});
  addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(state==='walking'||state==='tossing'){start=performance.now()}requestTick()}});
  reducedMotion.addEventListener('change',()=>{if(clips)requestTick()});
  function seek(clientY){const r=track.getBoundingClientRect(),p=clamp((clientY-r.top)/r.height,0,1);window.scrollTo({top:p*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'})}
  track.addEventListener('pointerdown',e=>{dragging=true;track.setPointerCapture(e.pointerId);seek(e.clientY)});
  track.addEventListener('pointermove',e=>{if(dragging)seek(e.clientY)});track.addEventListener('pointerup',()=>dragging=false);track.addEventListener('pointercancel',()=>dragging=false);
  track.addEventListener('keydown',e=>{let y=scrollY;const max=document.documentElement.scrollHeight-innerHeight;switch(e.key){case'ArrowDown':y+=60;break;case'ArrowUp':y-=60;break;case'PageDown':y+=innerHeight*.8;break;case'PageUp':y-=innerHeight*.8;break;case'Home':y=0;break;case'End':y=max;break;default:return}e.preventDefault();scrollTo({top:clamp(y,0,max),behavior:'instant'})});
  load().catch(()=>{layer.remove();document.body.classList.remove('cowboy-enabled')});
})();
