'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const W = 1280, H = 704, T = 40, COLS = 32, ROWS = 17;
  const TAU = Math.PI * 2, keys = new Set();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const at = (x, y) => ({x: x * T + 20, y: y * T + 20});
  const titles = ['The main course has escaped', 'Good dog, bad employment', 'Grandma knows', 'The corn is not cooperating', 'Dinner is cancelled'];
  const briefings = [
    'Lure the farmer onto a rake. He drops his key when knocked down. Take it to the northeast gate. There is no honorable version of this.',
    'Biscuit has joined the workforce. Muddy footprints give you away. Find cornbread, then press E near him to negotiate a labor dispute.',
    'Grandma is at the crossroads. She hears gobbles and cans from across the farm. Quiet waddling has suddenly become a personality trait.',
    'The drone is probably legal. Every dinner bell opens one corn passage and closes another. Stay out of the light. Count the scarecrows again.',
    'The combine is working the central lane. Everyone is here. Every bad idea you have learned is now a transferable skill.'
  ];
  let night = 0, phase = 'ready', previousPhase = 'ready', totalScore = 0, startingScore = 0;
  let grid, player, farmer, dog, grandma, drone, combine, traps, pickups, footprints, particles, scares, gate, droppedKey;
  let time = 180, elapsed = 0, gobbleCD = 0, keyHeld = false, inventory, noise, talkTimer = 0, toastTimer = 0, shake = 0, shiftTimer = 0, saveBest = 0;
  let sound = false, audio, last = 0, lastHUD = 0, selected = '', ambienceTimer = 0, winBonus = 0;
  let stillTime = 0, employed = false, employmentReceipt = false;
  const terrain = document.createElement('canvas'); terrain.width = W; terrain.height = H;
  const tc = terrain.getContext('2d');
  let rngState = 8341;
  function rand() { rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0; return rngState / 4294967296; }
  try { saveBest = Number(localStorage.getItem('fowl-play-best')) || 0; } catch {}

  function tone(freq = 240, duration = .1, type = 'sine', gain = .025, end = freq) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, audio.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(1, end), audio.currentTime + duration);
      g.gain.setValueAtTime(gain, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      o.connect(g); g.connect(audio.destination); o.start(); o.stop(audio.currentTime + duration);
    } catch { sound = false; }
  }
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); toastTimer = 3.8; }
  function say(text) { $('dialogue').textContent = text; $('dialogue').classList.add('visible'); talkTimer = 4; }
  function score(n, text) { totalScore += n; if (text) toast(`+${n} GRAVY · ${text}`); }
  function tile(x, y) { return grid[Math.floor(y / T)]?.[Math.floor(x / T)] ?? 1; }
  function walkable(c, r, turkey = false) { const v = grid[r]?.[c]; return v !== undefined && v !== 1 && (v !== 3 || turkey); }
  function open(x, y, radius = 10, turkey = false) {
    return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([dx,dy]) => walkable(Math.floor((x+dx)/T), Math.floor((y+dy)/T), turkey));
  }
  function move(a, dx, dy, turkey = false) {
    const r = turkey ? 9 : 10;
    if (open(a.x + dx, a.y, r, turkey)) a.x += dx;
    if (open(a.x, a.y + dy, r, turkey)) a.y += dy;
    if (dx || dy) a.angle = Math.atan2(dy, dx);
  }
  function lineOfSight(a, b) {
    const d = dist(a,b), steps = Math.ceil(d / 14);
    for (let i=1; i<steps; i++) { const s = tile(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps); if (s === 1 || s === 3) return false; }
    return true;
  }
  function pathTo(a, target) {
    const start = [Math.floor(a.x/T),Math.floor(a.y/T)], end = [clamp(Math.floor(target.x/T),1,30),clamp(Math.floor(target.y/T),1,15)];
    if (!walkable(...end)) {
      const near = [[0,1],[1,0],[0,-1],[-1,0]].map(([x,y])=>[end[0]+x,end[1]+y]).find(p=>walkable(...p));
      if (!near) return []; end[0]=near[0]; end[1]=near[1];
    }
    if(start[0]===end[0]&&start[1]===end[1]) return open(target.x,target.y,10)?[{x:target.x,y:target.y}]:[at(...end)];
    const queue=[start], seen=new Map([[start.join(','),null]]); let found=false;
    for(let i=0;i<queue.length;i++) {
      const p=queue[i]; if(p[0]===end[0]&&p[1]===end[1]) {found=true;break;}
      for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) {
        const n=[p[0]+dx,p[1]+dy], k=n.join(',');
        if(walkable(...n)&&!seen.has(k)) {seen.set(k,p);queue.push(n);}
      }
    }
    if(!found) return [];
    const route=[]; let p=end;
    while(p && p.join(',')!==start.join(',')) {route.push(at(...p));p=seen.get(p.join(','));}
    return route.reverse();
  }
  function navigate(a, target, speed, dt) {
    a.repath=(a.repath||0)-dt;
    if(a.repath<=0 || !a.path?.length) {a.path=pathTo(a,target);a.repath=.65;}
    const p=a.path[0]; if(!p) return;
    const d=dist(a,p); if(d<4) {a.path.shift();return;}
    const step=Math.min(d,speed*dt); move(a,(p.x-a.x)/d*step,(p.y-a.y)/d*step);
  }

  function setup() {
    keys.clear();talkTimer=0;toastTimer=0;
    $('dialogue').classList.remove('visible');$('toast').classList.remove('visible');
    grid=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>c===0||r===0||c===31||r===16?1:0));
    for(const [x,y,w,h] of [[2,2,5,2],[9,2,5,2],[17,2,5,2],[25,2,3,2],[2,6,3,4],[7,5,4,3],[13,5,3,6],[18,5,4,3],[24,5,5,3],[7,10,4,3],[18,10,4,4],[24,10,3,2],[2,12,3,2],[13,13,3,2],[24,14,5,1]]) {
      for(let r=y;r<y+h;r++) for(let c=x;c<x+w;c++) grid[r][c]=1;
    }
    for(const [x,y] of [[13,8],[14,8],[15,8],[7,11],[8,11],[9,11],[10,11]]) grid[y][x]=3;
    for(const [x,y] of [[5,10],[6,10],[5,11],[11,4],[12,4],[22,8],[23,8],[28,12],[29,12],[11,13]]) grid[y][x]=2;
    player={...at(3,14),hp:3,stamina:100,angle:-.6,invuln:0,slide:0,step:0,bread:0,hide:false};
    farmer={...at(22,9),angle:Math.PI,stun:0,composure:100,state:'patrol',patrol:0,repath:0,path:[],memory:{},slide:0};
    dog=night>=1?{...at(28,8),angle:Math.PI,bribed:0,stun:0,path:[],repath:0}:null;
    grandma=night>=2?{...at(12,12),angle:-Math.PI/2,active:0,stun:0,path:[],repath:0}:null;
    drone=night>=3?{x:650,y:120,angle:0}:null;
    combine=night>=4?{x:60,y:9*T+20,angle:0}:null;
    gate=at(29,1); droppedKey=null; keyHeld=false; noise=null; elapsed=0; lastHUD=0; gobbleCD=0; time=night===4?210:180; shiftTimer=0; ambienceTimer=0;shake=0;stillTime=0;employed=false;
    traps=[{...at(22,4),type:'rake',armed:true,age:5,owner:false},{...at(11,9),type:'rake',armed:true,age:5,owner:false},{...at(6,5),type:'grease',armed:true,age:5,owner:false},{...at(17,9),type:'hay',armed:true,age:5,owner:false}];
    pickups=[{...at(8,9),type:'food'},{...at(23,13),type:'food'},{...at(16,4),type:'rescue'}];
    if(night>=1) pickups.push({...at(6,13),type:'bread'});
    footprints=[];particles=[];scares=[[8,4],[16,12],[23,4],[29,9],[6,14],[12,2],[22,14]].map(p=>({...at(...p),angle:0}));
    inventory={rake:3,grease:2,can:2,hay:1};
    if(night>=3) scares.push({...at(17,14)},{...at(6,8)});
    drawTerrain(); updateHUD();
    $('night-name').textContent=titles[night];$('night-number').textContent=`NIGHT 0${night+1} / 05`;
    document.querySelectorAll('#campaign span').forEach((el,i)=>{el.className=i<night?'complete':i===night?'current':'';});
    $('scarecrow-count').textContent=`SCARECROWS: 0${scares.length}. PROBABLY.`;
  }
  function start() {
    keys.clear();
    if(phase==='ready') {phase='playing';startingScore=totalScore;say('“I have already purchased stuffing.”');toast('1: PLACE A RAKE · SPACE: LURE HIM OVER IT · E: TAKE KEY');}
    else if(phase==='lost') {totalScore=startingScore;setup();phase='playing';toast('A fresh start. Same stuffing.');}
    else if(phase==='won') {night++;startingScore=totalScore;setup();phase='playing';toast(briefings[night]);}
    else if(phase==='complete') {night=0;totalScore=0;startingScore=0;setup();phase='playing';toast('The farm has learned absolutely nothing.');}
    else if(phase==='paused') {phase='playing';}
    $('overlay').classList.add('hidden');$('pause-button').textContent='Ⅱ';$('pause-button').setAttribute('aria-label','Pause game');canvas.focus({preventScroll:true});
  }
  function showOverlay(title,copy,button,foot) {
    $('overlay-title').innerHTML=title;$('overlay-copy').textContent=copy;$('start-button').innerHTML=`${button} <span>→</span>`;$('overlay-foot').textContent=foot;$('overlay').classList.remove('hidden');
    $('start-button').focus({preventScroll:true});
  }
  function finish(won,reason='') {
    if(phase!=='playing') return;
    if(won) {
      winBonus=Math.ceil(time)*2+player.hp*100;totalScore+=winBonus;
      phase=night===4?'complete':'won';tone(520,.4,'triangle',.04,800);
      if(totalScore>saveBest) {saveBest=totalScore;try{localStorage.setItem('fowl-play-best',String(saveBest));}catch{}}
      showOverlay(night===4?'Dinner is<br>cancelled.':'Still not<br>the main course.',night===4?'You escaped all five nights. Somewhere, an unopened box of stuffing expires in silence.':`Night ${night+1} survived. ${briefings[night+1]}`,night===4?'Make Thanksgiving weird again':`Continue to night ${night+2}`,`${totalScore} GRAVY POINTS · +${winBonus} SURVIVAL BONUS · BEST ${saveBest}`);
    } else {
      phase='lost';tone(170,.6,'sawtooth',.035,45);
      showOverlay('A deeply<br>seasonal tragedy.',reason,'Appeal the menu',`NIGHT 0${night+1} · ${totalScore} GRAVY POINTS · THREE FEATHERS WERE A SUGGESTION`);
    }
    updateHUD();
  }
  function togglePause() {
    if(phase==='playing') {phase='paused';keys.clear();showOverlay('A brief<br>poultry pause.','The farmer has agreed to stop time. He remains disappointed.','Back to the incident','ESC / P TO RESUME');$('pause-button').textContent='▶';$('pause-button').setAttribute('aria-label','Resume game');}
    else if(phase==='paused') start();
  }
  function emitNoise(x,y,kind='gobble') {
    noise={x,y,age:0};farmer.target={x,y};farmer.state='investigate';farmer.investigateUntil=elapsed+11;farmer.repath=0;
    if(grandma){grandma.active=9;grandma.target={x,y};grandma.repath=0;}
    particles.push({x,y,life:1,max:1,kind:'ring',color:'#e4c37c'});
    if(kind==='gobble') {tone(330,.15,'triangle',.05,170);setTimeout(()=>tone(260,.15,'triangle',.035,130),100);}
  }
  function gobble() {
    if(phase!=='playing') return;
    if(gobbleCD>0) {toast(`GOBBLE RECOVERING · ${gobbleCD.toFixed(1)}s`);return;}
    stillTime=0;employed=false;gobbleCD=5;emitNoise(player.x,player.y);toast('GOBBLE. A FORMAL INVITATION TO VIOLENCE.');
    if(dist(player,farmer)<72 && farmer.stun<=0){farmer.stun=1.3;say('“Was that absolutely necessary?”');}
  }
  function place(type) {
    if(phase!=='playing') return;
    if(inventory[type]<=0) {toast('OUT OF STOCK. PROCUREMENT IS A TURKEY.');return;}
    if(tile(player.x,player.y)===3 || dist(player,gate)<55) {toast('NOT ENOUGH ROOM FOR AN INCIDENT HERE.');return;}
    if(traps.some(t=>t.armed&&dist(t,player)<30)){toast('ONE WORKPLACE VIOLATION PER SQUARE, PLEASE.');return;}
    inventory[type]--;selected=type;
    traps.push({x:player.x,y:player.y,type,armed:true,age:0,owner:true,fuse:type==='can'?2.5:0});
    toast({rake:'RAKE SET. WALK AWAY. THEN GOBBLE.',grease:'PUMPKIN GREASED. PERSONAL LIABILITY ACCEPTED.',can:'GOBBLE-IN-A-CAN · ACTIVATES IN 2.5 SECONDS.',hay:'HAY RIGGED. IMPACT MAY ALTER ROUTES.'}[type]);tone(170,.09,'triangle');updateHUD();
  }
  function interact() {
    if(phase!=='playing') return;
    if(droppedKey&&dist(player,droppedKey)<65) {takeKey();return;}
    if(keyHeld&&dist(player,gate)<70){finish(true);return;}
    if(dog&&player.bread>0&&dist(player,dog)<190) {player.bread--;dog.bribed=25;score(100,'COLLECTIVE BARKING AGREEMENT');say('Biscuit has accepted the terms.');return;}
    if(!keyHeld&&dist(player,gate)<70) {toast('LOCKED. THE FARMER HAS THE ONLY KEY.');return;}
    toast('STEAL A DROPPED KEY · OPEN GATE · BRIBE A NEARBY DOG');
  }
  function takeKey() {keyHeld=true;droppedKey=null;score(250,'KEY ACQUIRED. DINNER POSTPONED.');say('“That is county property. Emotionally.”');tone(800,.3,'triangle',.04,1200);}
  function hit(source) {
    if(player.invuln>0||phase!=='playing')return;
    player.hp--;player.invuln=2.8;shake=9;
    for(let i=0;i<8;i++) particles.push({x:player.x,y:player.y,vx:(Math.random()-.5)*120,vy:(Math.random()-.5)*120,life:1,max:1,kind:'feather'});
    tone(200,.16,'sawtooth',.025,70);
    if(player.hp<=0){finish(false,source==='trap'?'You were caught in your own excellent plan. The accident report is mostly feathers.':source==='combine'?'The combine has declined your right-of-way request. Dinner is back on schedule.':'The farmer has caught the main course. He would like to thank everyone who believed in the stuffing.');return;}
    toast(`${player.hp} FEATHERS LEFT. PLEASE REMAIN UNCOOKED.`);
    if(source!=='trap') {farmer.stun=Math.max(farmer.stun,1.5);if(dog)dog.stun=1.5;if(grandma)grandma.stun=1.5;}
    updateHUD();
  }
  function spring(t,a,isPlayer=false) {
    if(!t.armed||t.type==='can')return;
    t.armed=false;t.used=3;t.victim=a;shake=6;
    tone(t.type==='hay'?90:210,.2,'sawtooth',.025,45);
    particles.push({x:t.x,y:t.y,life:.8,max:.8,kind:'word',text:t.type==='rake'?'THWACK.':t.type==='grease'?'A CAREER LOW.':'HAY NOW.'});
    if(isPlayer) {hit('trap');if(t.type==='grease')player.slide=1.2;else player.stagger=.45;return;}
    if(t.type==='grease'){a.slide=1.5;a.stun=.25;} else a.stun=t.type==='hay'?8:6;
    if(a===farmer){
      farmer.composure=Math.max(0,farmer.composure-(t.type==='hay'?45:30));
      farmer.memory[t.type]=(farmer.memory[t.type]||0)+1;
      if(farmer.memory[t.type]>1) farmer.stun=Math.max(2,farmer.stun-1.2);
      if(!keyHeld&&!droppedKey){droppedKey={x:farmer.x+16,y:farmer.y+14};}
      score(t.type==='hay'?200:150,t.type==='grease'?'A SLIPPERY PROFESSIONAL SITUATION':'FARMER TEMPORARILY HORIZONTAL');
      say(['“I have a permit for this.”','“…She was right about me.”','“This was not in the brochure.”','“I am choosing to remain professional.”'][Math.floor(Math.random()*4)]);
      if(farmer.composure<=0) {farmer.stun+=3;farmer.breakdown=true;say('“I could have bought a pie.”');}
      if(t.type==='hay') { // Falling bales open a nearby corn edge; never seal a route.
        const c=Math.floor(t.x/T),r=Math.floor(t.y/T);
        for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]) if(c+dc>0&&c+dc<31&&r+dr>0&&r+dr<16&&grid[r+dr][c+dc]===1){grid[r+dr][c+dc]=2;drawTerrain();break;}
      }
    }
  }
  function update(dt) {
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}
    if(talkTimer>0){talkTimer-=dt;if(talkTimer<=0)$('dialogue').classList.remove('visible');}
    if(phase!=='playing')return;
    elapsed+=dt;time-=dt;gobbleCD=Math.max(0,gobbleCD-dt);player.invuln=Math.max(0,player.invuln-dt);shake=Math.max(0,shake-dt*22);
    if(time<=0){finish(false,'The dinner bell rings. Your reservation was apparently non-refundable.');return;}
    let dx=(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),dy=(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);
    let moving=!!(dx||dy), running=moving&&keys.has('Shift')&&player.stamina>2;
    const n=Math.hypot(dx,dy)||1;dx/=n;dy/=n;
    player.stamina=clamp(player.stamina+(running?-30:18)*dt,0,100);
    let speed=running?190:102;
    if(player.stagger>0){player.stagger-=dt;speed=15;}
    if(player.slide>0){player.slide-=dt;dx=Math.cos(player.angle);dy=Math.sin(player.angle);speed=270;moving=true;}
    move(player,dx*speed*dt,dy*speed*dt,true);player.hide=(tile(player.x,player.y)===2||tile(player.x,player.y)===3)&&!running;
    // Misfire Arcade egg: an unpaid scarecrow internship. Approved by the proprietor.
    const besideScarecrow=scares.some(s=>dist(player,s)<38);
    if(!moving&&besideScarecrow){
      stillTime+=dt;
      if(stillTime>=8&&!employed){
        employed=true;employmentReceipt=true;
        toast('POSITION FILLED. YOU ARE NOW AN UNPAID SCARECROW.');
        say('Personnel has filed your employment receipt under Field Notes.');
      }
    }else{stillTime=0;employed=false;}
    $('scarecrow-count').textContent=employed?`SCARECROWS: ${String(scares.length+1).padStart(2,'0')}. ONE ON PROBATION.`:`SCARECROWS: ${String(scares.length).padStart(2,'0')}. PROBABLY.`;
    if(moving){player.step+=dt*(running?15:9);player.footTimer=(player.footTimer||0)+dt;if(player.footTimer>.22){player.footTimer=0;footprints.push({x:player.x,y:player.y,angle:player.angle,life:night>=1?9:3});}if(running&&dist(player,farmer)<300){farmer.target={x:player.x,y:player.y};farmer.state='investigate';farmer.investigateUntil=elapsed+5;}}
    if(noise){noise.age+=dt;if(noise.age>10)noise=null;}
    const bearing=Math.atan2(player.y-farmer.y,player.x-farmer.x);
    const viewAngle=Math.atan2(Math.sin(bearing-farmer.angle),Math.cos(bearing-farmer.angle));
    const visible=!player.hide&&dist(farmer,player)<(night>=3?290:235)&&(Math.abs(viewAngle)<.8||dist(farmer,player)<65)&&lineOfSight(farmer,player);
    if(farmer.stun>0){farmer.stun-=dt;if(farmer.stun<=0&&farmer.breakdown){farmer.breakdown=false;farmer.composure=40;say('“New policy. No more policies.”');}}
    else {
      if(visible) {if(farmer.state!=='chase'){tone(370,.18,'triangle');toast('SPOTTED. MAINTAIN AN UNPROFESSIONAL DISTANCE.');}farmer.state='chase';farmer.target={x:player.x,y:player.y};farmer.lastSeen=elapsed;}
      else if(farmer.state==='chase'&&elapsed-(farmer.lastSeen||0)>2.5){farmer.state='investigate';farmer.investigateUntil=elapsed+6;}
      if(farmer.state==='investigate'&&farmer.target&&(dist(farmer,farmer.target)<20||elapsed>farmer.investigateUntil)){farmer.state='patrol';farmer.target=null;}
      const patrol=[at(22,9),at(17,4),at(6,4),at(6,14),at(22,14),at(29,4)];
      if(farmer.state==='patrol'){farmer.target=patrol[farmer.patrol];if(dist(farmer,farmer.target)<20){farmer.patrol=(farmer.patrol+1)%patrol.length;farmer.repath=0;}}
      let fs=farmer.state==='chase'?119+night*5:72+night*4;
      if(farmer.composure<40) fs+=18;
      if(farmer.slide>0){farmer.slide-=dt;move(farmer,Math.cos(farmer.angle)*260*dt,Math.sin(farmer.angle)*260*dt);}else if(farmer.target)navigate(farmer,farmer.target,fs,dt);
      if(dist(player,farmer)<26)hit('farmer');
    }
    if(dog){dog.stun=Math.max(0,dog.stun-dt);dog.bribed=Math.max(0,dog.bribed-dt);if(dog.bribed<=0&&dog.stun<=0){const track=footprints[Math.max(0,footprints.length-7)];const target=dist(dog,player)<125?player:track||at(28,8);navigate(dog,target,night===4?111:96,dt);if(dist(dog,player)<23)hit('dog');}}
    if(grandma){grandma.stun=Math.max(0,grandma.stun-dt);grandma.active=Math.max(0,grandma.active-dt);if(grandma.stun<=0){navigate(grandma,grandma.active>0?grandma.target:at(12,12),grandma.active>0?91:45,dt);if(dist(grandma,player)<26)hit('grandma');}}
    if(drone){drone.x=640+Math.sin(elapsed*.24)*450;drone.y=330+Math.sin(elapsed*.43)*210;if(dist(drone,player)<72&&!player.hide){farmer.target={x:player.x,y:player.y};farmer.state='chase';farmer.lastSeen=elapsed;farmer.repath=0;}}
    if(combine){combine.x=60+((elapsed*70)%1160);if(Math.abs(player.y-combine.y)<32&&Math.abs(player.x-combine.x)<48)hit('combine');}
    if(night>=3){shiftTimer+=dt;if(shiftTimer>25){shiftTimer=0;const val=grid[8][14]===3?1:3;for(const c of [13,14,15])grid[8][c]=val;for(const c of [7,8,9,10])grid[11][c]=val===1?3:1;if(!open(player.x,player.y,9,true)){Object.assign(player,at(12,8));player.invuln=2;}farmer.path=[];farmer.repath=0;scares[0]={...at(val===1?11:8,4)};drawTerrain();toast('THE DINNER BELL. THE CORN HAS RECONSIDERED.');tone(500,1,'sine',.035,450);}}
    for(const t of traps){t.age+=dt;if(t.used)t.used-=dt;if(!t.armed)continue;
      if(t.type==='can'){t.fuse-=dt;if(t.fuse<=0){t.armed=false;t.used=2;emitNoise(t.x,t.y,'can');tone(300,.2,'square',.015,120);}continue;}
      if(farmer.stun<=0&&dist(t,farmer)<23)spring(t,farmer);
      if(t.armed&&dog&&dog.bribed<=0&&dog.stun<=0&&dist(t,dog)<20)spring(t,dog);
      if(t.armed&&grandma&&grandma.stun<=0&&dist(t,grandma)<22)spring(t,grandma);
      if(t.armed&&t.age>1.1&&player.invuln<=0&&dist(t,player)<21)spring(t,player,true);
    }
    traps=traps.filter(t=>t.armed||t.used>0);
    if(droppedKey&&dist(player,droppedKey)<24)takeKey();
    if(keyHeld&&dist(player,gate)<34)finish(true);
    pickups=pickups.filter(p=>{if(dist(player,p)>25)return true;if(p.type==='food'){player.stamina=100;score(40,'FARM-TO-TURKEY ENERGY');}else if(p.type==='bread'){player.bread++;toast('CORNBREAD ACQUIRED. E NEAR BISCUIT TO BRIBE.');}else{score(200,'PARDON GRANTED. ONE POULTRY RESCUED.');say('The other turkey refuses to give a statement.');}return false;});
    footprints.forEach(f=>f.life-=dt);footprints=footprints.filter(f=>f.life>0);
    particles.forEach(p=>{p.life-=dt;if(p.vx){p.x+=p.vx*dt;p.y+=p.vy*dt;}});particles=particles.filter(p=>p.life>0);
    ambienceTimer+=dt;if(ambienceTimer>18){ambienceTimer=0;if(elapsed>20){const lines=['The corn whispers: “Diversify your portfolio.”','The shed has acquired another window.','Something large is respecting your personal space.','The scarecrow was facing the other way.'];toast(lines[Math.floor(elapsed/18)%lines.length]);scares[(Math.floor(elapsed/18))%scares.length].angle=Math.PI;}}
    if(elapsed-lastHUD>.1){lastHUD=elapsed;updateHUD();}
  }
  function updateHUD() {
    $('hearts').textContent='♥ '.repeat(Math.max(0,player.hp))+'♡ '.repeat(3-Math.max(0,player.hp));$('hearts').setAttribute('aria-label',`${player.hp} hit points`);
    $('stamina-fill').style.width=`${player.stamina}%`;$('score').textContent=String(totalScore).padStart(4,'0');
    $('clock').textContent=`DINNER IN ${Math.floor(Math.max(0,time)/60)}:${String(Math.floor(Math.max(0,time)%60)).padStart(2,'0')}`;
    $('objective').innerHTML=keyHeld?'<span class="key-symbol">⚿</span> KEY ACQUIRED. NORTHEAST GATE →':droppedKey?'<span class="key-symbol">⚿</span> KEY DROPPED. GRAB IT!':'<span class="key-symbol">⚿</span> THE FARMER HAS THE KEY.';
    for(const type of ['rake','grease','can','hay']){$(`count-${type}`).textContent=`× ${inventory[type]}`;document.querySelector(`[data-tool="${type}"]`).disabled=inventory[type]===0;}
  }

  // All farm art is drawn locally: no downloaded sprites, textures, or runtime dependencies.
  function ellipse(c,x,y,rx,ry,color,rot=0){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,rot,0,TAU);c.fill();}
  function line(c,x,y,xx,yy,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
  function round(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
  function corn(c,x,y,variation=0){
    const h=18+variation*12;
    line(c,x+3,y+8,x-2,y-h,'#828551',2);
    c.fillStyle=variation>.5?'#697747':'#596b43';
    for(let j=0;j<3;j++){let yy=y-j*8;c.beginPath();c.moveTo(x,yy+2);c.quadraticCurveTo(x-20,yy-13,x-17,yy-18);c.quadraticCurveTo(x-5,yy-15,x,yy-2);c.fill();c.beginPath();c.moveTo(x,yy-3);c.quadraticCurveTo(x+17,yy-20,x+20,yy-17);c.quadraticCurveTo(x+15,yy-3,x,yy+3);c.fill();}
    line(c,x-2,y-h,x-6,y-h-7,'#b2a56a');line(c,x-2,y-h,x+3,y-h-8,'#b2a56a');
    if(variation>.6)ellipse(c,x+5,y-7,3,7,'#b6a65e',.35);
  }
  function drawTerrain(){
    rngState=8134+night*33;
    tc.fillStyle='#4e533a';tc.fillRect(0,0,W,H);
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const x=c*T,y=r*T,v=grid[r][c];
      if(v!==1){tc.fillStyle=v===3?'#3e4d32':v===2?'#4f5c36':'#777050';tc.fillRect(x,y,T,T);if(night>=1&&v===0&&((c*3+r)%9===0)){ellipse(tc,x+20,y+25,20,10,'#5d5d43',-.2);}}
    }
    for(let i=0;i<7600;i++){const x=rand()*W,y=rand()*H;tc.globalAlpha=.12+rand()*.22;tc.fillStyle=rand()>.5?'#dbca8a':'#243323';tc.fillRect(x,y,rand()*3+1,rand()*1.5+1);}tc.globalAlpha=1;
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const x=c*T,y=r*T,v=grid[r][c];
      if(v===1){tc.fillStyle='#243d2b';tc.fillRect(x,y,T,T);if(grid[r+1]?.[c]!==1){tc.fillStyle='#22332480';tc.fillRect(x-3,y+T-2,T+8,12);}
        for(let j=0;j<5;j++)corn(tc,x+6+rand()*29,y+9+j*8,rand());
      } else if(v===2){for(let j=0;j<10;j++){const xx=x+rand()*T,yy=y+rand()*T;line(tc,xx,yy,xx-3,yy-10,'#828c54',1.5);line(tc,xx,yy,xx+4,yy-7,'#6f7e48');}}
      else if(v===3){for(let j=0;j<5;j++){line(tc,x+4+j*8,y+7,x+6+j*8,y+33,'#a49b6060',1);} }
    }
    // Weathered fence and the only exit.
    for(let x=40;x<W-40;x+=40){line(tc,x,26,x,39,'#c1ad72',4);line(tc,x-18,29,x+22,29,'#a79b6b',3);}
    for(let y=55;y<650;y+=38){line(tc,24,y,40,y,'#a69765',3);line(tc,30,y-18,30,y+20,'#9d9564',2);}
    for(let x=40;x<W-40;x+=40){line(tc,x,650,x,675,'#a69a64',3);line(tc,x-18,659,x+22,659,'#93895c',2);line(tc,x-18,668,x+22,668,'#93895c',2);}
    // Farmhouse: an architectural disagreement in the bottom corner.
    const bx=1113,by=540;
    tc.fillStyle='#202e24';tc.fillRect(bx+8,by+12,110,92);tc.fillStyle='#7a5039';tc.fillRect(bx,by,108,80);
    for(let i=0;i<8;i++)line(tc,bx+i*14,by,bx+i*14,by+80,'#573e30',2);
    tc.fillStyle='#303f32';tc.beginPath();tc.moveTo(bx-14,by+7);tc.lineTo(bx+52,by-42);tc.lineTo(bx+122,by+7);tc.fill();
    line(tc,bx-14,by+7,bx+52,by-42,'#8a8860',3);line(tc,bx+52,by-42,bx+122,by+7,'#8a8860',3);
    round(tc,bx+45,by+35,27,45,2,'#293628');line(tc,bx+45,by+35,bx+72,by+80,'#948062',2);line(tc,bx+72,by+35,bx+45,by+80,'#948062',2);
    for(let i=0;i<(night>=3?3:2);i++){const xx=bx+12+i*34;round(tc,xx,by+14,18,20,1,'#c5aa65');line(tc,xx+9,by+14,xx+9,by+34,'#594e33',2);line(tc,xx,by+24,xx+18,by+24,'#594e33',2);}
    // Discarded equipment, pumpkins, stones and little broken things.
    for(const [cx,cy] of [[6,2],[28,4],[2,11],[17,14],[29,13],[12,6]]){const p=at(cx,cy);if(tile(p.x,p.y)===1)continue;pumpkin(tc,p.x,p.y,.75);pumpkin(tc,p.x+16,p.y+8,.45);}
    for(let i=0;i<65;i++){const x=rand()*W,y=rand()*H;if(tile(x,y)===0)ellipse(tc,x,y,2+rand()*3,1+rand()*2,'#b8ae79',rand());}
    // Crossing signs, clearly written by someone who is not a lawyer.
    sign(tc,102,181,'HARVEST MAZE');sign(tc,1150,125,'EXIT →');sign(tc,704,579,'DO NOT QUESTION CORN');
    sign(tc,scares[4].x,scares[4].y+30,'HELP WANTED');tc.fillStyle='#d6c38c';tc.font='6px monospace';tc.fillText('STAND STILL',scares[4].x,scares[4].y+44);
  }
  function sign(c,x,y,text){line(c,x,y,x,y+25,'#5b4f34',3);round(c,x-49,y-13,98,20,1,'#b9a477');c.fillStyle='#3e4931';c.font='bold 7px monospace';c.textAlign='center';c.fillText(text,x,y);}
  function pumpkin(c,x,y,s=1){c.save();c.translate(x,y);c.scale(s,s);ellipse(c,3,6,16,9,'#25322266');ellipse(c,-7,0,8,11,'#a56536');ellipse(c,7,0,8,11,'#a56536');ellipse(c,0,0,8,12,'#bd7c43');line(c,0,-10,2,-16,'#73734a',4);c.restore();}
  function turkey(c,x,y,scale=1,angle=0,rescue=false){
    c.save();c.translate(x,y);c.scale(scale,scale);const flip=Math.cos(angle)<0?-1:1;c.scale(flip,1);
    ellipse(c,1,13,20,8,'#18271c60');
    const bob=phase==='playing'&&!rescue?Math.sin(player.step)*1.5:0;c.translate(0,bob);
    const featherColors=['#a8643d','#c68a4c','#b77a43','#d19a57','#a7653f'];
    for(let i=0;i<7;i++){const a=-Math.PI*.95+i*.32;const xx=-8+Math.cos(a)*14,yy=-6+Math.sin(a)*16;ellipse(c,xx,yy,6,17,featherColors[i%5],a+Math.PI/2);ellipse(c,xx+Math.cos(a)*6,yy+Math.sin(a)*6,3,5,'#e3b76d',a+Math.PI/2);}
    line(c,-3,12,-6,20,'#d29a51',2);line(c,7,12,9,20,'#d29a51',2);line(c,-9,20,-2,20,'#d29a51',2);line(c,6,20,13,20,'#d29a51',2);
    ellipse(c,0,2,15,16,'#5a3d30',-.3);ellipse(c,2,0,10,11,'#826044',-.35);ellipse(c,-3,1,8,6,'#a78051',.5);line(c,-9,0,1,7,'#ceab6c',1);
    round(c,9,-23,8,24,5,'#779391');ellipse(c,13,-23,9,8,'#94aaa0');ellipse(c,18,-21,4,2,'#ddbb69');ellipse(c,15,-12,3,7,'#b75035',.2);ellipse(c,16,-25,2,2,'#172920');ellipse(c,16.5,-25.7,.6,.6,'#fff8d7');
    c.restore();
  }
  function farmerArt(c,a){
    c.save();c.translate(a.x,a.y);if(a.stun>.2)c.rotate(-Math.PI/2);const flip=Math.cos(a.angle)<0?-1:1;c.scale(flip,1);ellipse(c,0,16,15,6,'#1c291a77');
    line(c,-7,5,-8,20,'#293d38',7);line(c,7,5,9,20,'#293d38',7);round(c,-14,17,11,6,2,'#2d2b24');round(c,5,17,12,6,2,'#2d2b24');
    round(c,-12,-18,24,29,5,'#a97649');line(c,-8,-13,-3,8,'#52614b',5);line(c,8,-13,4,8,'#52614b',5);round(c,-8,-4,16,15,2,'#53624b');
    line(c,-10,-10,-18,5,'#a87851',6);line(c,10,-10,16,2,'#a87851',6);line(c,18,-18,17,19,'#443f2e',4);line(c,18,-22,18,-3,'#6c7162',3);
    ellipse(c,0,-24,10,12,'#c5a477');ellipse(c,4,-20,9,5,'#a68b65');ellipse(c,6,-26,1.5,1.5,'#253225');ellipse(c,-1,-32,17,4,'#6c6243');round(c,-10,-43,19,12,3,'#7e7350');line(c,-10,-34,8,-34,'#3c4a32',3);
    if(!keyHeld&&!droppedKey){c.strokeStyle='#ead18a';c.lineWidth=2;c.beginPath();c.arc(13,5,3,0,TAU);c.stroke();line(c,13,8,13,15,'#ead18a',2);line(c,13,13,17,13,'#ead18a',2);}
    if(a.stun>0){c.fillStyle='#e4ce7c';c.font='15px serif';c.fillText('✦',-20,-34);c.fillText('✦',14,-42);}
    c.restore();
  }
  function scarecrow(c,a){c.save();c.translate(a.x,a.y);ellipse(c,6,17,16,5,'#24302166');line(c,0,-15,0,19,'#6c5d3c',4);line(c,-19,-12,19,-12,'#8e8150',3);c.fillStyle='#6f6240';c.beginPath();c.moveTo(-11,-17);c.lineTo(11,-17);c.lineTo(17,5);c.lineTo(-13,2);c.fill();line(c,-10,-12,-24,-6,'#918251',5);line(c,10,-12,23,-7,'#918251',5);ellipse(c,0,-25,9,10,'#b99e60');ellipse(c,0,-31,15,3,'#82764b');round(c,-8,-39,15,9,1,'#7d754b');line(c,-4,-26,-1,-23,'#3c4430',2);line(c,5,-26,2,-23,'#3c4430',2);line(c,-4,-18,4,-18,'#3c4430',1);c.restore();}
  function trapArt(c,t){c.save();c.translate(t.x,t.y);if(!t.armed)c.globalAlpha=.4;
    if(t.type==='rake'){line(c,-15,14,14,-15,'#b9a36a',4);line(c,7,-20,21,-7,'#b4b3a0',3);for(let i=0;i<5;i++)line(c,7+i*3,-20+i*3,3+i*3,-15+i*3,'#b4b3a0',2);}
    if(t.type==='grease'){ellipse(c,0,6,25,12,'#c8bf7370',-.2);ellipse(c,0,6,18,7,'#ada95c60');pumpkin(c,0,-1,.8);}
    if(t.type==='can'){ellipse(c,0,8,9,4,'#223c2a66');round(c,-8,-11,16,20,2,'#9ca38b');ellipse(c,0,-11,8,3,'#c3c3a0');round(c,-6,-5,12,10,1,'#ac7245');c.fillStyle='#eee1aa';c.font='8px monospace';c.textAlign='center';c.fillText('G',0,3);if(t.armed){c.fillStyle='#e4cf74';c.fillText(Math.ceil(t.fuse),0,-21);}}
    if(t.type==='hay'){round(c,-22,-14,44,28,4,'#b6a15d');for(let i=0;i<15;i++)line(c,-20+i*3,-11,-18+i*3,12,'#d0ba72',1);line(c,-12,-14,-12,14,'#6b7050',2);line(c,12,-14,12,14,'#6b7050',2);line(c,-21,-9,21,-9,'#887e47',1);}
    c.restore();}
  function dogArt(c,a){c.save();c.translate(a.x,a.y);if(a.stun>0)c.rotate(1.5);ellipse(c,0,10,18,6,'#22342166');line(c,-9,3,-10,13,'#795536',4);line(c,8,3,10,13,'#795536',4);ellipse(c,0,0,19,10,'#a77b43');ellipse(c,-5,-2,10,8,'#4f4a30');const f=Math.cos(a.angle)<0?-1:1;c.scale(f,1);ellipse(c,17,-5,9,9,'#b08a50');ellipse(c,12,-3,4,11,'#6c5336',-.3);ellipse(c,24,-4,4,3,'#303a29');ellipse(c,20,-9,1.5,1.5,'#15281a');line(c,-18,-4,-26,-12,'#9b7947',4);if(a.bribed>0){c.fillStyle='#e6bd7d';c.font='18px serif';c.fillText('♥',-8,-23);}c.restore();}
  function grandmaArt(c,a){c.save();c.translate(a.x,a.y);if(a.stun>0)c.rotate(1.5);ellipse(c,0,15,15,6,'#20312155');c.fillStyle='#8e817b';c.beginPath();c.moveTo(-8,-18);c.lineTo(9,-18);c.lineTo(16,16);c.lineTo(-15,16);c.fill();round(c,-7,-8,15,22,2,'#b9b6a0');ellipse(c,0,-26,9,11,'#c8b38a');ellipse(c,0,-34,11,7,'#c5c5b0');ellipse(c,-5,-39,6,6,'#c5c5b0');line(c,-8,-27,8,-27,'#566455',2);line(c,-16,-6,-22,8,'#b6a989',4);line(c,14,-7,19,7,'#b6a989',4);line(c,20,-9,20,21,'#6c573a',3);c.restore();}
  function keyArt(c,k){c.save();c.translate(k.x,k.y);const p=1+Math.sin(performance.now()/180)*.15;ellipse(c,0,2,18*p,13*p,'#ebca6750');c.strokeStyle='#f5da81';c.lineWidth=3;c.beginPath();c.arc(-5,-4,5,0,TAU);c.stroke();line(c,-1,0,9,10,'#f5da81',3);line(c,5,6,10,2,'#f5da81',3);line(c,9,10,14,6,'#f5da81',3);c.restore();}
  function draw(now){
    ctx.save();
    const viewWidth=canvas.width;
    ctx.translate(-clamp(player.x-viewWidth/2,0,W-viewWidth),0);
    if(shake>0&&phase==='playing')ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
    ctx.drawImage(terrain,0,0);
    // The farmer's torch remains visible through the dusk, but never through corn.
    if(farmer.stun<=0){ctx.save();ctx.globalAlpha=.12;ctx.fillStyle='#f5d78a';ctx.beginPath();ctx.moveTo(farmer.x,farmer.y);ctx.arc(farmer.x,farmer.y,200,farmer.angle-.7,farmer.angle+.7);ctx.closePath();ctx.fill();ctx.restore();}
    for(const f of footprints){ctx.save();ctx.globalAlpha=clamp(f.life/9,0,.4);ctx.translate(f.x,f.y);ctx.rotate(f.angle);line(ctx,-3,-4,2,-2,'#333d28',2);line(ctx,-3,4,2,2,'#333d28',2);ctx.restore();}
    // Gate swings open only for the suspiciously qualified keyholder.
    ctx.save();ctx.translate(gate.x,gate.y);line(ctx,-23,-20,-23,24,'#c3b37e',5);line(ctx,23,-20,23,24,'#c3b37e',5);ctx.strokeStyle=keyHeld?'#b6c992':'#9c9971';ctx.lineWidth=3;ctx.strokeRect(-22,-8,keyHeld?9:44,30);line(ctx,-22,-6,keyHeld?-13:22,20,'#aba379',2);if(!keyHeld){round(ctx,-5,1,10,12,2,'#d1ad5d');}else{ctx.fillStyle='#d5dea0';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillText('EXIT ↑',0,-20);}ctx.restore();
    for(const t of traps)trapArt(ctx,t);
    for(const p of pickups){if(p.type==='rescue'){round(ctx,p.x-19,p.y-19,38,37,2,'#9b916c');turkey(ctx,p.x,p.y,.6,0,true);for(let i=0;i<5;i++)line(ctx,p.x-18+i*9,p.y-20,p.x-18+i*9,p.y+17,'#494e36',2);}else{ellipse(ctx,p.x,p.y+5,12,7,'#c4ad6d50');round(ctx,p.x-9,p.y-7,18,13,3,p.type==='bread'?'#d1ad5f':'#b38747');for(let i=0;i<3;i++)ellipse(ctx,p.x-4+i*4,p.y-3,1,1,'#ead695');}}
    const items=[...scares.map(a=>({y:a.y,draw:()=>scarecrow(ctx,a)})),{y:farmer.y,draw:()=>farmerArt(ctx,farmer)},{y:player.y,draw:()=>{
      if(player.invuln>0&&Math.floor(now/100)%2===0)return;
      if(player.hide)ctx.globalAlpha=.65;
      turkey(ctx,player.x,player.y,1,player.angle);ctx.globalAlpha=1;
      ctx.textAlign='center';ctx.font='bold 8px monospace';ctx.fillStyle=player.hide?'#c7d19d':'#efe6b9';ctx.fillText(player.hide?'HIDDEN':'YOU',player.x,player.y-48);
      if(keyHeld){ctx.fillStyle='#e5c768';ctx.font='18px serif';ctx.fillText('⚿',player.x+25,player.y-22);}
    }}];
    if(dog)items.push({y:dog.y,draw:()=>dogArt(ctx,dog)});if(grandma)items.push({y:grandma.y,draw:()=>grandmaArt(ctx,grandma)});
    if(combine)items.push({y:combine.y+20,draw:()=>{const x=combine.x,y=combine.y;ellipse(ctx,x,y+20,56,20,'#1e302480');round(ctx,x-37,y-33,74,65,5,'#8d6040');round(ctx,x-25,y-40,34,35,3,'#c2af78');round(ctx,x-20,y-35,24,21,2,'#4a6659');for(const dx of [-35,35]){round(ctx,x+dx-8,y-26,16,22,3,'#2a3428');round(ctx,x+dx-8,y+10,16,22,3,'#2a3428');}round(ctx,x+35,y-48,20,96,3,'#a1874b');for(let i=0;i<9;i++)line(ctx,x+48,y-43+i*10,x+65,y-43+i*10,'#b4a777',3);}});
    items.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());
    if(droppedKey)keyArt(ctx,droppedKey);
    if(drone){ellipse(ctx,drone.x,drone.y,70,50,'#e6ca6c18');ctx.save();ctx.translate(drone.x,drone.y-45);line(ctx,-19,-9,19,9,'#a5ad99',3);line(ctx,-19,9,19,-9,'#a5ad99',3);round(ctx,-8,-7,16,14,3,'#b5b9a1');for(const [x,y]of[[-19,-9],[19,9],[-19,9],[19,-9]]){ellipse(ctx,x,y,13,3,'#b7bb9b80',now/100);}ellipse(ctx,0,4,2,2,'#d9a36b');ctx.restore();}
    for(const p of particles){ctx.save();ctx.globalAlpha=p.life/p.max;if(p.kind==='ring'){ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,(1-p.life)*170+15,0,TAU);ctx.stroke();}else if(p.kind==='feather'){ellipse(ctx,p.x,p.y,3,9,'#e0b97a',p.life*4);}else if(p.kind==='word'){ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillStyle='#f8df9b';ctx.fillText(p.text,p.x,p.y-35-(1-p.life)*20);}ctx.restore();}
    // A slow, distant shape. It has no collision and no explanation.
    if(elapsed>35&&Math.sin(elapsed*.08)>.75){ctx.save();ctx.globalAlpha=.13;ellipse(ctx,400+Math.sin(elapsed*.11)*220,90,105,24,'#0b2116');ctx.restore();}
    const vignette=ctx.createRadialGradient(W*.48,H*.5,H*.2,W*.48,H*.5,W*.65);vignette.addColorStop(0,'#122b1b00');vignette.addColorStop(1,'#10271c9a');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
    // Moths and suspended autumn dust.
    for(let i=0;i<26;i++){const x=(i*173+Math.sin(now/3000+i)*20)%W,y=(i*97+now/170+i*15)%H;ellipse(ctx,x,y,1.2,.7,'#ead6a34a');}
    if(phase==='playing'){
      round(ctx,player.x-22,player.y+28,44,3,1,'#263b29');round(ctx,player.x-22,player.y+28,44*player.stamina/100,3,1,'#cad09a');
      if(gobbleCD>0){ctx.font='7px monospace';ctx.textAlign='center';ctx.fillStyle='#ebdba7';ctx.fillText(`GOBBLE ${gobbleCD.toFixed(1)}s`,player.x,player.y+43);}
      round(ctx,farmer.x-22,farmer.y+31,44,3,1,'#2e3b29');round(ctx,farmer.x-22,farmer.y+31,44*farmer.composure/100,3,1,'#c09a62');ctx.font='6px monospace';ctx.textAlign='center';ctx.fillStyle='#d5ca9d';ctx.fillText(farmer.stun>0?'RECONSIDERING':farmer.state==='chase'?'DEEPLY INVESTED':'COMPOSURE',farmer.x,farmer.y+43);
    }
    ctx.restore();
  }
  function frame(now){const dt=Math.min((now-last)/1000||0,.04);last=now;update(dt);draw(now);requestAnimationFrame(frame);}
  function showInfo(kind){
    previousPhase=phase;if(phase==='playing'){phase='reading';keys.clear();}
    $('info-content').innerHTML=kind==='help'?`<span class="eyebrow">A BRIEF SURVIVAL MANUAL</span><h2>You are not a side dish.</h2><p>The farmer carries the only exit key. Knock him down with a trap, steal the dropped key, and reach the gate in the northeast before dinner.</p><ul><li><kbd>WASD</kbd> / arrows to waddle. <kbd>Shift</kbd> to sprint. Rest to refill stamina.</li><li><kbd>1</kbd> rake · <kbd>2</kbd> grease · <kbd>3</kbd> delayed gobble can · <kbd>4</kbd> falling hay. Place a trap beneath you, then move away.</li><li><kbd>Space</kbd> gobbles. It lures the farmer to your location and briefly interrupts him up close. Five-second cooldown.</li><li><kbd>E</kbd> takes a nearby dropped key, opens the gate, or bribes Biscuit when you have cornbread. Keys also collect on contact.</li><li>Green grass and narrow striped corn tunnels hide a quietly waddling turkey. The farmer cannot use turkey tunnels.</li><li>Three feathers. No extra lives. Your own traps work on you after a one-second grace period. <kbd>P</kbd> / <kbd>Esc</kbd> pauses.</li></ul><p>On touchscreens, use the direction pad, action buttons, and equipment tray. Sound starts off.</p>`:`<span class="eyebrow">COUNTY EXTENSION OFFICE · UNVERIFIED</span><h2>Notes from the field.</h2><div class="note-item"><strong>01 — The main course has escaped</strong><p>A rake, a key, and a farmer who has severely underestimated the situation.</p></div><div class="note-item"><strong>02 — Good dog, bad employment</strong><p>Biscuit follows muddy footprints. Cornbread near the southwest corner can buy 25 seconds of professional disloyalty.</p></div><div class="note-item"><strong>03 — Grandma knows</strong><p>She investigates every gobble and every can. The quiet approach remains available.</p></div><div class="note-item"><strong>04 — The corn is not cooperating</strong><p>Drone searchlights reveal you. Turkey tunnels swap every 25 seconds. The scarecrow count is an estimate.</p></div><div class="note-item"><strong>05 — Dinner is cancelled</strong><p>A combine patrols the central east–west lane. Previous employees retain their positions.</p></div><p>Gravy: rake +150, hay +200, key +250, rescue +200, dog bribe +100, food +40. Survival adds time and remaining feathers.</p><p>Turkey and farmer names: pending a less hostile committee. Personal best: <strong>${saveBest}</strong>.</p>`;
    if(kind==='notes'&&employmentReceipt) $('info-content').innerHTML+='<div class="note-item"><span class="eyebrow">PERSONNEL DEPARTMENT · RECEIPT 000-T</span><h3>Congratulations on standing still.</h3><p>Position: Scarecrow, provisional.<br>Compensation: exposure. To weather.<br>References: one farmer, unwilling.<br>Reason for leaving: moved.</p><p>Inspected and unnecessarily automated by <strong>GPT-6.1-Sol</strong>.<br>This position does not include a Thanksgiving pardon.</p></div>';
    $('info-dialog').showModal();
  }
  $('info-dialog').addEventListener('close',()=>{if(phase==='reading')phase=previousPhase;if(phase==='playing')canvas.focus({preventScroll:true});});
  document.querySelector('.close-dialog').addEventListener('click',()=>$('info-dialog').close());
  $('help-button').addEventListener('click',()=>showInfo('help'));$('notes-button').addEventListener('click',()=>showInfo('notes'));
  $('start-button').addEventListener('click',start);$('pause-button').addEventListener('click',togglePause);
  $('sound-button').addEventListener('click',()=>{sound=!sound;$('sound-button').setAttribute('aria-pressed',String(sound));$('sound-button').setAttribute('aria-label',sound?'Disable sound':'Enable sound');$('sound-button').innerHTML=`♪ <span>Sound ${sound?'on':'off'}</span>`;if(sound)tone(440,.1);});
  document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{place(b.dataset.tool);canvas.focus({preventScroll:true});}));
  window.addEventListener('keydown',e=>{
    if($('info-dialog').open)return;
    const key=e.key.length===1?e.key.toLowerCase():e.key;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Shift'].includes(key)&&phase==='playing')e.preventDefault();
    if(e.repeat){keys.add(key);return;}
    if(key==='Escape'||key==='p'){togglePause();return;}
    // Native button activation is kept intact for Enter and Space outside the canvas.
    if(document.activeElement?.tagName==='BUTTON'&&(key===' '||key==='Enter'))return;
    keys.add(key);if(phase!=='playing')return;
    if(key===' ')gobble();if(key==='e')interact();if('1234'.includes(key))place(['rake','grease','can','hay'][Number(key)-1]);
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
  window.addEventListener('blur',()=>{keys.clear();if(phase==='playing')togglePause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')togglePause();});
  document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>keys.delete(b.dataset.key));});
  document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>b.dataset.action==='gobble'?gobble():interact()));
  function resizeViewport(){canvas.width=window.innerWidth<=680?800:1280;canvas.height=H;}
  window.addEventListener('resize',resizeViewport);resizeViewport();
  setup();requestAnimationFrame(frame);
})();
