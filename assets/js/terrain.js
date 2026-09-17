/* Animated wireframe landscape. No external rendering dependencies. */
(() => {
  const canvas = document.querySelector('#terrainCanvas');
  const ctx = canvas.getContext('2d');
  let width=0, height=0, time=0, last=0, frame=0, visible=false;
  let enabled=!document.body.classList.contains('motion-off');
  let pointer=0, target=0;
  function resize(){
    const box=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    width=box.width; height=box.height; canvas.width=width*dpr;canvas.height=height*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);sync();
  }
  function project(x,z){
    const wave=Math.sin(x*2.4+z*1.9+time*.35)*.15+Math.cos(x*1.1-z*2.5+time*.23)*.11;
    const ridge=Math.exp(-((x-.25)**2)*1.3)*Math.sin(z*.9+time*.13)*.6;
    const depth=3.4+z;
    return [width*.5+(x+pointer*.18)*width*.76/depth,height*.35+(z*.29-wave-ridge)*height*.9/depth];
  }
  function draw(ts){
    const dt=last?Math.min((ts-last)/1000,.05):0;last=ts;
    if(enabled){time+=dt;pointer+=(target-pointer)*.04;}
    ctx.clearRect(0,0,width,height);
    const glow=ctx.createRadialGradient(width*.5,height*.51,0,width*.5,height*.51,width*.46);
    glow.addColorStop(0,'rgba(255,111,68,.10)');glow.addColorStop(1,'rgba(255,111,68,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
    for(let row=0;row<40;row++){
      const z=row*.12;ctx.beginPath();
      for(let col=0;col<=90;col++){const p=project(-2.5+col/18,z);if(col===0)ctx.moveTo(...p);else ctx.lineTo(...p);}
      ctx.strokeStyle=`rgba(255,${135+row},${99+row},${.65-row*.013})`;ctx.lineWidth=.8;ctx.stroke();
    }
    for(let col=0;col<=44;col++){
      ctx.beginPath();for(let row=0;row<40;row++){const p=project(-2.5+col/8.8,row*.12);if(row===0)ctx.moveTo(...p);else ctx.lineTo(...p);}
      ctx.strokeStyle='rgba(255,149,117,.18)';ctx.lineWidth=.65;ctx.stroke();
    }
    frame=enabled&&visible&&!document.hidden?requestAnimationFrame(draw):0;
  }
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(width&&height)draw(performance.now());}
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
  document.querySelector('.hero').addEventListener('pointermove',e=>{target=(e.clientX-canvas.getBoundingClientRect().left)/width-.5;});
  document.querySelector('.hero').addEventListener('pointerleave',()=>{target=0;});
  document.addEventListener('portfolio-motion',e=>{enabled=e.detail.enabled;sync();});
  document.addEventListener('visibilitychange',sync);
})();
