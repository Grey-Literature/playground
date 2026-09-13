(function(T){
  'use strict';
  class GardenAudio{
    constructor(){this.ctx=null;this.enabled=false;this.volume=.65;this.buffers={};this.voices=0;this.last=new Map();this.streams=new Map();this.status='idle';}
    async start(){
      if(location.protocol==='file:'&&!T.audioData){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='tinwater-garden/assets/audio-data.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
      if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC){this.status='unavailable';return false;}this.ctx=new AC();this.master=this.ctx.createGain();this.master.gain.value=0;this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.knee.value=18;this.compressor.ratio.value=5;this.master.connect(this.compressor).connect(this.ctx.destination);
        this.status='loading';this.loading=Promise.allSettled(['water-pour','metal-drips'].map(async name=>{let data;if(T.audioData?.[name]){const raw=atob(T.audioData[name]);data=Uint8Array.from(raw,c=>c.charCodeAt(0)).buffer;}else{const res=await fetch('tinwater-garden/assets/'+name+'.mp3');if(!res.ok)throw new Error('Audio '+res.status);data=await res.arrayBuffer();}this.buffers[name]=await this.ctx.decodeAudioData(data);})).then(()=>{this.status=Object.keys(this.buffers).length===2?'ready':'partial';if(this.buffers['metal-drips'])this.findDrips();});}
      this.enabled=true;await this.ctx.resume();this.setVolume(this.volume);await this.loading;return true;
    }
    findDrips(){const b=this.buffers['metal-drips'],d=b.getChannelData(0),rate=b.sampleRate,win=Math.round(rate*.012);this.drips=[];let last=-1;for(let i=win;i<d.length-win;i+=win){let e=0;for(let j=0;j<win;j++)e+=d[i+j]*d[i+j];e=Math.sqrt(e/win);if(e>.045&&i/rate-last>.26){this.drips.push(Math.max(0,i/rate-.018));last=i/rate;}}if(!this.drips.length)this.drips=[1,3,5,7];}
    setVolume(v){this.volume=v;if(this.master)this.master.gain.setTargetAtTime(this.enabled?v*.65:0,this.ctx.currentTime,.08);}
    mute(){this.enabled=false;this.setVolume(this.volume);}
    allowed(key,gap){const now=this.ctx.currentTime;if(now-(this.last.get(key)||-100)<gap)return false;this.last.set(key,now);return true;}
    sample(name,x,level,duration,offset,rate=1,filterHz=9000){
      const b=this.buffers[name];if(!b||this.voices>=22||!this.enabled)return;
      const now=this.ctx.currentTime,src=this.ctx.createBufferSource(),gain=this.ctx.createGain(),pan=this.ctx.createStereoPanner(),filter=this.ctx.createBiquadFilter();src.buffer=b;src.playbackRate.value=rate;pan.pan.value=T.clamp((x/T.W-.5)*1.5,-.85,.85);filter.type='lowpass';filter.frequency.value=filterHz;src.connect(filter).connect(gain).connect(pan).connect(this.master);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(level,now+.009);gain.gain.setValueAtTime(level,now+duration*.65);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);offset=Math.min(offset,Math.max(0,b.duration-duration*rate-.05));src.start(now,Math.max(0,offset),duration*rate);this.voices++;src.onended=()=>{this.voices--;src.disconnect();filter.disconnect();gain.disconnect();pan.disconnect();};
    }
    metal(c,strength=.3){if(!this.enabled||!this.ctx||this.voices>18)return;const now=this.ctx.currentTime,fill=c.volume/c.capacity,base=(470+(78-c.w)*9)*(1-fill*.13),decay=(c.held?.065:.32)*(1-fill*.6);for(const [ratio,g]of [[1,1],[2.71,.24],[5.19,.085]]){const o=this.ctx.createOscillator(),v=this.ctx.createGain(),p=this.ctx.createStereoPanner();o.frequency.value=base*ratio;o.type='sine';p.pan.value=(c.x/T.W-.5)*1.5;v.gain.setValueAtTime(Math.min(.10,strength*.055)*g,now);v.gain.exponentialRampToValueAtTime(.0001,now+decay);o.connect(v).connect(p).connect(this.master);o.start();o.stop(now+decay+.02);this.voices++;o.onended=()=>{this.voices--;o.disconnect();v.disconnect();p.disconnect();};}}
    events(events){if(!this.enabled||!this.ctx)return;for(const e of events){if(e.type==='tap'||e.type==='stop'){if(this.allowed('clink'+e.cup.id,.08))this.metal(e.cup,e.amount);continue;}if(e.type!=='impact')continue;const key=e.cup?'cup'+e.cup.id:'soil'+Math.floor(e.x/100);if(!this.allowed(key,e.cup?.12:.20))continue;
        if(e.material==='metal'){const d=this.drips||[1];this.sample('metal-drips',e.x,.17+Math.min(.18,e.amount*.05),.22,d[Math.floor(Math.random()*d.length)],.95+Math.random()*.08);}
        else if(e.material==='water'){this.sample('water-pour',e.x,.09+Math.min(.12,e.amount*.035),.21,4+Math.random()*16,1,4200);}
        else if(e.material==='puddle'){this.sample('water-pour',e.x,.075,.25,4+Math.random()*16,.85,1800);}
        else if(e.material==='stone'){this.sample('metal-drips',e.x,.035,.12,(this.drips||[1])[0],.7,900);}
        else this.sample('water-pour',e.x,.025,.15,8+Math.random()*8,.8,750);
      }}
    update(sim,night){if(!this.enabled||!this.ctx)return;for(const c of sim.cups){if(c.outflow>1&&this.allowed('pour'+c.id,.13))this.sample('water-pour',c.x,Math.min(.20,.035+c.outflow*.001),.24,3+Math.random()*18,.97+Math.random()*.05,5500);}
      if(night>.65&&this.allowed('cricket',3.4))this.chirp();
    }
    chirp(){const now=this.ctx.currentTime;for(let k=0;k<3;k++){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();p.pan.value=.6;o.frequency.value=4100;o.type='sine';g.gain.setValueAtTime(0,now);g.gain.setValueAtTime(.009,now+k*.12);g.gain.exponentialRampToValueAtTime(.0001,now+k*.12+.065);o.connect(g).connect(p).connect(this.master);o.start(now+k*.12);o.stop(now+k*.12+.08);o.onended=()=>{o.disconnect();g.disconnect();p.disconnect();};}}
    suspend(){if(this.ctx)this.ctx.suspend();}
    resume(){if(this.ctx&&this.enabled)this.ctx.resume();}
  }
  T.GardenAudio=GardenAudio;
})(window.Tinwater);
