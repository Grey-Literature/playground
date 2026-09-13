(function(T){
  'use strict';
  const {drawEllipse:ellipse,drawLine:line}=T;
  function trace(ctx,p){ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));ctx.closePath();}
  class GardenRenderer{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.bg=new Image();this.bg.src='tinwater-garden/assets/garden.png';this.plants=new Image();this.plants.src='tinwater-garden/assets/botanicals.png';this.zoom=1;this.pan={x:0,y:0};this.scale=1;this.ox=0;this.oy=0;this.width=1;this.height=1;this.selected=-1;this.hover=-1;this.ready=false;this.bg.onload=()=>{this.ready=true;};this.resize();}
    resize(){const b=this.canvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);this.width=b.width;this.height=b.height;this.canvas.width=Math.round(b.width*d);this.canvas.height=Math.round(b.height*d);this.dpr=d;this.layout();}
    layout(){this.baseScale=Math.min(this.width/(this.width<700?700:T.W),this.height/T.H);this.minZoom=Math.min(this.width/T.W,this.height/T.H)/this.baseScale;this.zoom=T.clamp(this.zoom,this.minZoom,3.5);this.scale=this.baseScale*this.zoom;const extraX=Math.max(0,(T.W*this.scale-this.width)/2),extraY=Math.max(0,(T.H*this.scale-this.height)/2);this.pan.x=T.clamp(this.pan.x,-extraX,extraX);this.pan.y=T.clamp(this.pan.y,-extraY,extraY);this.ox=(this.width-T.W*this.scale)/2+this.pan.x;this.oy=(this.height-T.H*this.scale)/2+this.pan.y;}
    point(x,y){return{x:(x-this.ox)/this.scale,y:(y-this.oy)/this.scale};}
    zoomAt(factor,x=this.width/2,y=this.height/2){const old=this.point(x,y);this.zoom=T.clamp(this.zoom*factor,this.minZoom,3.5);this.layout();this.pan.x+=x-(old.x*this.scale+this.ox);this.pan.y+=y-(old.y*this.scale+this.oy);this.layout();}
    botanical(ctx,kind,x,y,w,h,angle=0){if(!this.plants.complete||!this.plants.naturalWidth)return;const sw=this.plants.naturalWidth/2,sh=this.plants.naturalHeight/2;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(this.plants,(kind%2)*sw,Math.floor(kind/2)*sh,sw,sh,-w/2,-h,w,h);ctx.restore();}
    draw(sim,wild,night,reduced){const ctx=this.ctx,t=sim.time;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.fillStyle=night>.5?'#334441':'#dedac2';ctx.fillRect(0,0,this.width,this.height);ctx.save();ctx.translate(this.ox,this.oy);ctx.scale(this.scale,this.scale);
      if(this.bg.complete&&this.bg.naturalWidth)ctx.drawImage(this.bg,0,0,T.W,T.H);else{ctx.fillStyle='#e7dec2';ctx.fillRect(0,0,T.W,T.H);}
      // Wisps of passing leaf-shadow keep the painted backdrop alive.
      if(!reduced){ctx.save();ctx.globalAlpha=.035;ctx.fillStyle='#697a43';for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(540+i*82+Math.sin(t*.13+i)*22,370+Math.cos(t*.19+i)*190,22,180,-.6,0,Math.PI*2);ctx.fill();}ctx.restore();}
      for(const s of sim.soil){if(s.wet>.01){const y=T.terrain(s.x);const g=ctx.createRadialGradient(s.x,y,1,s.x,y,26);g.addColorStop(0,`rgba(79,64,38,${s.wet*.34})`);g.addColorStop(1,'rgba(79,64,38,0)');ctx.fillStyle=g;ctx.fillRect(s.x-26,y-26,52,52);}if(s.water>1){const y=T.terrain(s.x)-Math.min(8,s.water*.18);ellipse(ctx,s.x,y,14+Math.min(10,s.water*.12),3+Math.min(8,s.water*.10),'#759b994e');line(ctx,[[s.x-10,y-1],[s.x+9,y-1]],'#d9e7ce90',.8);}}
      // Slender, crooked stakes and small handmade yokes. These remain fixed.
      for(const c of sim.cups){ctx.save();const sx=c.x-c.w-13,ground=T.terrain(sx);line(ctx,[[sx+3,ground],[sx-5,c.y+140],[sx,c.y+9],[c.x-9,c.y+9]],'#504b3840',6);line(ctx,[[sx,ground],[sx-8,c.y+140],[sx-3,c.y+7],[c.x-9,c.y+7]],'#88866b',3);line(ctx,[[sx-1,ground],[sx-9,c.y+140],[sx-4,c.y+7]],'#dad0ae',.8);ellipse(ctx,sx-2,ground,8,2,'#655a3c50');ctx.restore();}
      for(const c of sim.cups)this.cup(ctx,c,t);
      ctx.save();ctx.lineCap='round';for(const d of sim.drops){ctx.strokeStyle=d.volume>.8?'#76a6a5a8':'#8cbbbdb0';ctx.lineWidth=T.clamp(1+d.volume*1.3,1,4);const stretch=Math.min(12,2+d.vy*.012);line(ctx,[[d.x-d.vx*.013,d.y-stretch],[d.x,d.y]],ctx.strokeStyle,ctx.lineWidth);line(ctx,[[d.x-.5,d.y-stretch],[d.x-.5,d.y-1]],'#eaf7deba',.6);}
      for(const s of sim.splashes)ellipse(ctx,s.x,s.y,1.1,1.6,`rgba(128,180,181,${Math.min(1,s.life*2)})`);for(const r of sim.ripples){ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,r.r*.22,0,0,Math.PI*2);ctx.strokeStyle=`rgba(232,242,212,${r.life*.65})`;ctx.lineWidth=.9;ctx.stroke();}ctx.restore();
      for(const f of wild.flowers){const sway=reduced?0:Math.sin(t*1.4+f.x)*.013+Math.sin(t*21)*f.shake*.075;this.botanical(ctx,f.kind,f.x,f.y,f.w,f.h,sway);}
      for(const l of sim.leaves){ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.angle);if(l.held){ellipse(ctx,3,7,25,5,'#3b493223');}this.botanical(ctx,l.kind,0,14,63,48,0);ctx.restore();}
      // Night is a continuous material tint, not an unrelated background swap.
      if(night>0){ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=`rgba(40,67,95,${night*.82})`;ctx.fillRect(0,0,T.W,T.H);ctx.globalCompositeOperation='source-over';ctx.fillStyle=`rgba(17,32,52,${night*.22})`;ctx.fillRect(0,0,T.W,T.H);ctx.restore();}
      if(night>.25){ctx.save();ctx.globalAlpha=(night-.25)*.9;const moon=ctx.createRadialGradient(584,140,3,584,140,80);moon.addColorStop(0,'#f1eaca38');moon.addColorStop(1,'#d7e6dc00');ctx.fillStyle=moon;ctx.fillRect(494,50,180,180);ellipse(ctx,584,140,15,15,'#e4e6c8');ellipse(ctx,591,135,14,14,'#687f85');ctx.restore();}
      T.drawWildlife(ctx,wild,sim,reduced);
      // Pollen is sparse and disappears into the dark.
      if(!reduced&&night<.6){ctx.save();ctx.globalAlpha=(1-night)*.45;for(let i=0;i<12;i++){const x=330+(i*89+t*(3+i%3))%760,y=260+(i*79+Math.sin(t*.3+i)*14)%510;ellipse(ctx,x,y,1.1,1.1,'#f5f0c4');}ctx.restore();}
      ctx.restore();
    }
    cup(ctx,c,time){const p=T.polygon(c),water=T.liquid(c),fill=c.volume/c.capacity;ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);const w=c.w;
      // Hammered tin with tarnished brass seams: irregular highlights and fine scratches.
      const body=ctx.createLinearGradient(-w,0,w,25);body.addColorStop(0,'#706f58');body.addColorStop(.15,'#a9afa0');body.addColorStop(.38,'#dedaca');body.addColorStop(.63,'#b7b49a');body.addColorStop(.85,'#9e9f83');body.addColorStop(1,'#636e64');
      ctx.beginPath();ctx.moveTo(-w,-42);ctx.bezierCurveTo(-w*.89,6,-w*.57,25,0,27);ctx.bezierCurveTo(w*.57,25,w*.89,6,w,-42);ctx.closePath();ctx.fillStyle=body;ctx.fill();ctx.strokeStyle='#655f45';ctx.lineWidth=1.5;ctx.stroke();
      ellipse(ctx,0,-42,w,12,'#626d60');ellipse(ctx,0,-43,w-4,9,'#adb6a0');
      ctx.restore();
      if(fill>.003&&water.poly.length>2){ctx.save();trace(ctx,p);ctx.clip();trace(ctx,water.poly);const watery=ctx.createLinearGradient(0,water.y,0,c.y+40);watery.addColorStop(0,'#a6c8ba');watery.addColorStop(.07,'#65969b');watery.addColorStop(1,'#477d8170');ctx.fillStyle=watery;ctx.globalAlpha=.78;ctx.fill();const xs=water.poly.filter(q=>Math.abs(q.y-water.y)<1).map(q=>q.x);if(xs.length>1){line(ctx,[[Math.min(...xs),water.y],[Math.max(...xs),water.y]],'#e9f0d4',1.7);for(let i=0;i<2;i++){const ripple=Math.sin(time*3+i*2)*3;line(ctx,[[c.x-19+i*17,water.y+4+ripple],[c.x+6+i*11,water.y+4+ripple]],'#e0ebd66f',.7);}}ctx.restore();}
      ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.angle);
      ctx.strokeStyle='#566452';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-w,-42);ctx.bezierCurveTo(-w*.89,6,-w*.57,25,0,27);ctx.bezierCurveTo(w*.57,25,w*.89,6,w,-42);ctx.stroke();
      for(let i=0;i<43;i++){const x=Math.sin(i*12.989+c.id)*w*.79,y=-31+(i*17%49),len=2+(i%5)*1.1;line(ctx,[[x,y],[x+len,y-1]],i%3===0?'#f8ecd75a':'#59685530',i%4===0?1:.6);}
      ctx.beginPath();ctx.ellipse(0,-42,w,12,0,0,Math.PI*2);ctx.strokeStyle='#726f52';ctx.lineWidth=3;ctx.stroke();ctx.beginPath();ctx.ellipse(0,-43,w-1,11,0,0,Math.PI);ctx.strokeStyle='#ece0b2';ctx.lineWidth=1.5;ctx.stroke();
      // Short etched ribs and a small maker's rivet; the fill stays legible between ribs.
      for(const f of [-.68,-.37,.37,.68]){ctx.beginPath();ctx.moveTo(w*f,-30);ctx.quadraticCurveTo(w*f*.91,1,w*f*.5,20);ctx.strokeStyle='#63766966';ctx.lineWidth=.8;ctx.stroke();}
      line(ctx,[[-8,9],[8,9]],'#746b4c',2);ellipse(ctx,0,9,5,5,'#8b7850');ellipse(ctx,-1,8,2.3,2.3,'#d9cba3');
      if(c.held||this.selected===c.id||this.hover===c.id){ctx.beginPath();ctx.ellipse(0,-42,w+8,17,0,0,Math.PI*2);ctx.strokeStyle=c.held?'#e8d3a0':'#faf3d6bb';ctx.lineWidth=1.3;ctx.setLineDash(c.held?[]:[2,5]);ctx.stroke();ctx.setLineDash([]);}
      ctx.restore();
    }
  }
  T.GardenRenderer=GardenRenderer;
})(window.Tinwater);
