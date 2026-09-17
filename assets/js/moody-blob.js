/**
 * mood_meter.js
 * Animated mood blob canvas for Moody.
 * Depends on: <canvas id="moodCanvas"> in the DOM.
 */
(function () {
    const canvas  = document.getElementById('moodCanvas');
    if (!canvas) return;
    const labelEl = document.getElementById('moodLabel');
    const dotEl   = document.getElementById('moodDot');

    const KF = [
        { petals:8, shape:'pointed',  baseRadius:58, layerGap:22, layerRGB:[[122,95,170],[155,127,196],[192,168,224]], layerSpeeds:[0.011,0.007,0.004], glowRGB:[160,127,208], rotation:0.3 },
        { petals:8, shape:'wavy',     baseRadius:56, layerGap:20, layerRGB:[[68,102,187],[102,136,204],[136,170,221]], layerSpeeds:[0.009,0.006,0.003], glowRGB:[102,153,221], rotation:0.1 },
        { petals:7, shape:'wavy',     baseRadius:54, layerGap:18, layerRGB:[[85,119,170],[119,153,187],[153,187,204]], layerSpeeds:[0.007,0.005,0.003], glowRGB:[153,187,221], rotation:0.0 },
        { petals:5, shape:'circle',   baseRadius:60, layerGap:26, layerRGB:[[102,153,170],[136,170,188],[170,204,208]], layerSpeeds:[0.005,0.003,0.002], glowRGB:[170,204,238], rotation:0.0 },
        { petals:5, shape:'pentagon', baseRadius:52, layerGap:20, layerRGB:[[85,153,51],[119,187,68],[170,221,102]],   layerSpeeds:[0.006,0.004,0.003], glowRGB:[170,221,102], rotation:-0.31 },
        { petals:5, shape:'star',     baseRadius:54, layerGap:22, layerRGB:[[153,187,0],[187,204,34],[221,238,68]],    layerSpeeds:[0.008,0.005,0.003], glowRGB:[221,240,0],   rotation:-0.31 },
        { petals:5, shape:'flower',   baseRadius:55, layerGap:22, layerRGB:[[204,85,32],[224,120,56],[240,160,96]],    layerSpeeds:[0.010,0.006,0.004], glowRGB:[255,187,102], rotation:0.0 },
    ];

    const LABELS   = ['Very Unpleasant','Unpleasant','Slightly Unpleasant','Neutral','Slightly Pleasant','Pleasant','Very Pleasant'];
    const HOLD_DUR = 3.5, TRANS_DUR = 2.5;

    function ss(t) { t=Math.max(0,Math.min(1,t)); return t*t*(3-2*t); }
    function lerpRGB(a,b,t) { return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)]; }
    function rgba(rgb,a) { return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`; }

    function neighbours(t) {
        const raw=t*(KF.length-1), lo=Math.max(0,Math.min(KF.length-2,Math.floor(raw)));
        return {lo, hi:lo+1, frac:raw-lo};
    }

    function interpolate(t) {
        const {lo,hi,frac}=neighbours(t), ef=ss(frac), a=KF[lo], b=KF[hi];
        const ld=(x,y)=>x+(y-x)*ef;
        return { shapeA:a.shape, shapeB:b.shape, shapeFrac:ef, petalsA:a.petals, petalsB:b.petals,
            baseRadius:ld(a.baseRadius,b.baseRadius), layerGap:ld(a.layerGap,b.layerGap),
            layerRGB:a.layerRGB.map((c,i)=>lerpRGB(c,b.layerRGB[i],ef)),
            layerSpeeds:a.layerSpeeds.map((s,i)=>ld(s,b.layerSpeeds[i])),
            glowRGB:lerpRGB(a.glowRGB,b.glowRGB,ef), rotation:ld(a.rotation,b.rotation) };
    }

    function shapeR(base,petals,shape,angle,time) {
        switch(shape) {
            case 'circle':   return base;
            case 'flower':   return base*(1+0.22*Math.cos(petals*angle+time*0.3));
            case 'wavy':     return base*(1+0.18*Math.cos(petals*angle+time*0.4)+0.06*Math.cos(petals*2*angle-time*0.2));
            case 'pointed':  return base*(1+0.28*Math.cos(petals*angle+time*0.25)+0.05*Math.cos(petals*2*angle+time*0.1));
            case 'star':     return base*(1+0.30*Math.cos(petals*(angle-Math.PI/2)+time*0.2));
            case 'pentagon': return base*(1+0.14*Math.cos(petals*(angle-Math.PI/2)+time*0.3));
        }
    }

    function blendR(base,cfg,angle,time) {
        const rA=shapeR(base,cfg.petalsA,cfg.shapeA,angle,time);
        const rB=shapeR(base,cfg.petalsB,cfg.shapeB,angle,time);
        return rA+(rB-rA)*cfg.shapeFrac;
    }

    function path(ctx,cx,cy,r,cfg,rot,time) {
        const steps=200, pts=[];
        for(let i=0;i<=steps;i++){
            const a=(i/steps)*Math.PI*2+rot, rv=blendR(r,cfg,a,time);
            pts.push([cx+Math.cos(a)*rv, cy+Math.sin(a)*rv]);
        }
        ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
        for(let i=1;i<pts.length;i++){
            const p=pts[i-1],c=pts[i];
            ctx.quadraticCurveTo(p[0],p[1],(p[0]+c[0])/2,(p[1]+c[1])/2);
        }
        ctx.closePath();
    }

    function resize() {
        const sz=700, dpr=Math.min(window.devicePixelRatio||1,2);
        canvas.width=sz*dpr; canvas.height=sz*dpr;
    }
    resize(); window.addEventListener('resize',resize);

    let t=0, targetT=0, moodIdx=0, holdTimer=0, time=0;
    const pDur=1.6, pInt=1.0; let rings=[{bt:0}];
    const idxToT=i=>i/(KF.length-1);
    let lastTs=null;

    let frame = 0;
    let visible = false;
    let enabled = !document.body.classList.contains("motion-off");
    function draw(ts) {
        if(!lastTs)lastTs=ts;
        const dt=Math.min((ts-lastTs)/1000,0.05); lastTs=ts; time+=dt;
        holdTimer-=dt;
        if(holdTimer<=0){ moodIdx=(moodIdx+1)%KF.length; targetT=idxToT(moodIdx); holdTimer=HOLD_DUR+TRANS_DUR; }
        const diff=targetT-t;
        if(Math.abs(diff)>0.001) t+=diff*(1-Math.exp(-dt*(1/TRANS_DUR)*3)); else t=targetT;
        if(!rings.length||time-rings[rings.length-1].bt>=pInt) rings.push({bt:time});
        rings=rings.filter(r=>time-r.bt<=pDur);
        const dpr=Math.min(window.devicePixelRatio||1,2), W=canvas.width, H=canvas.height, cx=W/2, cy=H/2;
        const ctx=canvas.getContext('2d');
        ctx.clearRect(0,0,W,H);
        let cfg=interpolate(t);
        const breathe=1+0.045*Math.sin(time*0.5*Math.PI*2/4);
        cfg.baseRadius*=2; cfg.layerGap*=2;
        cfg.baseRadius*=breathe*dpr; cfg.layerGap*=dpr;
        const glowR=(cfg.baseRadius+cfg.layerGap*2)*1.35;
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,glowR);
        g.addColorStop(0,rgba(cfg.glowRGB,0.2)); g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,glowR,0,Math.PI*2); ctx.fill();
        const alphas=[1.0,0.5,0.28];
        for(let li=2;li>=0;li--){
            const r=cfg.baseRadius+cfg.layerGap*li, rot=cfg.rotation+time*cfg.layerSpeeds[li];
            path(ctx,cx,cy,r,cfg,rot,time);
            ctx.fillStyle=rgba(cfg.layerRGB[li],alphas[li]); ctx.fill();
            ctx.strokeStyle=`rgba(255,255,255,${alphas[li]*0.45})`; ctx.lineWidth=1.5*dpr; ctx.stroke();
        }
        const outerR=cfg.baseRadius+cfg.layerGap*2, outerRot=cfg.rotation+time*cfg.layerSpeeds[2];
        for(const ring of rings){
            const progress=Math.max(0,Math.min(1,(time-ring.bt)/pDur)), eased=1-Math.pow(1-progress,2);
            path(ctx,cx,cy,outerR+30*dpr*eased,cfg,outerRot,time);
            ctx.strokeStyle=rgba(cfg.layerRGB[2],(1-progress)*0.18);
            ctx.lineWidth=2.8*dpr*(1-progress*0.7); ctx.stroke();
        }
        const iR=cfg.baseRadius*0.35;
        const ig=ctx.createRadialGradient(cx,cy,0,cx,cy,iR);
        ig.addColorStop(0,rgba(cfg.layerRGB[0],0.7)); ig.addColorStop(1,rgba(cfg.layerRGB[0],0));
        ctx.beginPath(); ctx.arc(cx,cy,iR,0,Math.PI*2); ctx.fillStyle=ig; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy,4*dpr,0,Math.PI*2);
        ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.fill();
        frame = enabled && visible && !document.hidden ? requestAnimationFrame(draw) : 0;
    }
    function sync() {
        cancelAnimationFrame(frame); frame=0; lastTs=null;
        if (visible && !document.hidden) draw(performance.now());
    }
    new IntersectionObserver(entries => {visible=entries[0].isIntersecting;sync();}).observe(canvas);
    document.addEventListener('portfolio-motion', e => {enabled=e.detail.enabled;sync();});
    document.addEventListener('visibilitychange', sync);
    draw(performance.now());
})();
