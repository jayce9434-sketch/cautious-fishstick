'use strict';

(() => {
  const C = window.CRASH_CONTENT;
  const L = window.CRASH_LEVELS;
  const P = window.CRASH_PROGRESSION;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d');
  const W=1280,H=720,GROUND=620;

  const images = {};
  const imageSources = {
    birds:'birds-sprites.png', pigs:'pigs-sprites.png', materials:'materials.png',
    field:'bg-field.png', factory:'bg-factory.png', storm:'bg-storm.png', cavern:'bg-cavern.png', sky:'bg-sky.png', citadel:'bg-citadel.png', launcher:'launcher.png'
  };
  Object.entries(imageSources).forEach(([k,src])=>{ const im=new Image(); im.src=src; images[k]=im; });

  const defaultSave = () => ({
    version:5, coins:2500, scrap:0, sound:true,
    settings:{music:true,sfx:true,masterVolume:1,musicVolume:.55,sfxVolume:.62,aim:true,reducedMotion:false,physicsDebug:false}, owner:false, daily:null,
    progress:{bird:1,pig:1}, completed:{bird:{},pig:{}}, stars:{bird:{},pig:{}},
    inventory:{bird:{},pig:{}}, permanent:{bird:{},pig:{}}, melt:{active:false,readyAt:0,lastClaim:0},
    cosmetics:{owned:{trails:['none'],launchers:['timber'],impacts:['classic']},equipped:{trail:'none',launcher:'timber',impact:'classic'}},
    mastery:{bird:{},pig:{},awarded:{}}, vault:{claimed:{}},
    awarded:{}, rewards:[], bestEndless:{bird:0,pig:0}, achievements:{claimed:{}}, stats:{clears:0,stars:0,blocks:0,bosses:0,abilities:0}
  });
  let save;
  try { save = Object.assign(defaultSave(), JSON.parse(localStorage.getItem('crashflock-save')||'{}')); }
  catch { save = defaultSave(); }
  const fresh=defaultSave();
  // Versioned nested migration safety. Old V3 saves remain playable.
  const wasVersion=Number(save.version||3);
  save.version=5;
  save.coins=Number.isFinite(+save.coins)?+save.coins:2500; save.scrap=Math.max(0,Math.floor(+save.scrap||0));
  if(wasVersion<5 && Number(save.capsules)>0){save.coins+=Math.max(0,Math.floor(Number(save.capsules)))*400; save.capsules=0;}
  save.progress={...fresh.progress,...(save.progress||{})};
  save.completed={bird:{...(save.completed?.bird||{})},pig:{...(save.completed?.pig||{})}};
  save.stars={bird:{...(save.stars?.bird||{})},pig:{...(save.stars?.pig||{})}};
  save.inventory={bird:{...(save.inventory?.bird||{})},pig:{...(save.inventory?.pig||{})}};
  const oldInfinite=save.infinite||{};
  save.permanent={bird:{...(save.permanent?.bird||{})},pig:{...(save.permanent?.pig||{})}};
  for(const side of ['bird','pig'])for(const [id,val] of Object.entries(oldInfinite[side]||{}))if(val)save.permanent[side][id]=Math.max(1,Number(save.permanent[side][id]||0));
  for(const side of ['bird','pig'])for(const id of Object.keys(save.permanent[side]))save.permanent[side][id]=Math.max(0,Math.min(4,Math.floor(Number(save.permanent[side][id])||0)));
  save.melt={active:!!save.melt?.active,readyAt:Number(save.melt?.readyAt)||0,lastClaim:Number(save.melt?.lastClaim)||0};
  save.awarded=save.awarded||{}; save.rewards=save.rewards||[]; save.bestEndless=save.bestEndless||{bird:0,pig:0};
  save.settings={...fresh.settings,...(save.settings||{})}; if(save.sound===false)save.settings.sfx=false;
  for(const key of ['masterVolume','musicVolume','sfxVolume']){const n=Number(save.settings[key]);save.settings[key]=Number.isFinite(n)?Math.max(0,Math.min(20,n)):fresh.settings[key];}
  save.achievements={claimed:{...(save.achievements?.claimed||{})}}; save.stats={...fresh.stats,...(save.stats||{})}; save.owner=!!save.owner;
  save.cosmetics={owned:{trails:[...new Set(save.cosmetics?.owned?.trails||['none'])],launchers:[...new Set(save.cosmetics?.owned?.launchers||['timber'])],impacts:[...new Set(save.cosmetics?.owned?.impacts||['classic'])]},equipped:{...fresh.cosmetics.equipped,...(save.cosmetics?.equipped||{})}};
  for(const [key,base] of [['trails','none'],['launchers','timber'],['impacts','classic']])if(!save.cosmetics.owned[key].includes(base))save.cosmetics.owned[key].unshift(base);
  save.mastery={bird:{...(save.mastery?.bird||{})},pig:{...(save.mastery?.pig||{})},awarded:{...(save.mastery?.awarded||{})}};
  save.vault={claimed:{...(save.vault?.claimed||{})}};

  function persist(){ try{localStorage.setItem('crashflock-save',JSON.stringify(save));}catch{} updateWallet(); }
  function updateWallet(){
    $('#coinCount').textContent=Math.floor(save.coins).toLocaleString(); $('#scrapCount').textContent=save.scrap; updateMeltTopStatus();
    $('#soundBtn').textContent=save.settings.sfx?'SFX ON':'SFX OFF'; $('#ownerTopBtn')?.classList.toggle('owner-hidden',!save.owner);
    if($('#cosmeticScrap'))$('#cosmeticScrap').textContent=save.scrap;
  }
  updateWallet();

  const audio=new window.CrashAudio(()=>save.settings);
  function playSound(name){ audio.playSfx(name).catch(()=>{}); }
  function musicMood(){
    if(currentScreen!=='gameScreen')return 'menu';
    if(level?.type==='final')return 'final';
    if(level && level.type!=='regular')return 'boss';
    return 'level';
  }
  function syncMusic(){audio.syncVolumes();if(save.settings.music)audio.playMusic(musicMood()).catch(()=>{});else audio.stopMusic();}
  document.addEventListener('pointerdown',()=>{audio.resume().then(syncMusic).catch(()=>{});},{once:true,capture:true});

  let currentScreen='homeScreen';
  function showScreen(id){
    $$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));
    currentScreen=id;
    $('#backBtn')?.classList.toggle('hidden',id==='homeScreen');
    if(id==='homeScreen') renderHome();
    if(id==='rosterScreen') renderRoster();
    if(id==='capsuleScreen') renderMelt();
    if(id==='settingsScreen') renderSettings();
    if(id==='challengesScreen') renderChallenges();
    if(id==='cosmeticsScreen') renderCosmetics();
    if(id==='progressionScreen') renderProgression();
    if(id==='ownerScreen') renderOwner();
    syncMusic();
  }
  function renderHome(){ updateWallet(); }
  function closeTransient(){
    if(!$('#modal').classList.contains('hidden')){$('#modal').classList.add('hidden');return true;}
    if(!$('#characterPicker').classList.contains('hidden')){$('#characterPicker').classList.add('hidden');return true;}
    if(currentScreen==='campaignScreen'&&!$('#levelPanel').classList.contains('hidden')){$('#levelPanel').classList.add('hidden');return true;}
    return false;
  }
  function navigateBack(){
    if(closeTransient())return;
    if(currentScreen==='gameScreen'){
      running=false;cancelAnimationFrame(raf);
      if(modeState?.mode==='campaign')openCampaign(level?.side||campaignSide);else showScreen('homeScreen');
      return;
    }
    showScreen('homeScreen');
  }

  let campaignSide='bird', rosterSide='bird';
  function sideTitle(side){ return side==='bird'?'Bird':'Pig'; }
  function isLevelUnlocked(side,n){ return n<=Math.max(1,save.progress[side]||1); }
  function charCopies(side,char){ return Math.max(0,Math.floor(save.inventory[side][char.id]||0)); }
  function permanentUnits(side,char){ return Math.max(0,Math.min(4,Math.floor(save.permanent[side][char.id]||0))); }
  function isStoryIntroduced(side,char){ return (char.introLevel||1)<=Math.max(1,save.progress[side]||1); }

  const launcherSkinCache=new Map();
  function ownedList(type){return save.cosmetics.owned[type]||[];}
  function hasCosmetic(type,id){return ownedList(type).includes(id);}
  function cosmeticEntry(type,id){
    const list=type==='trails'?P.TRAILS:type==='launchers'?P.LAUNCHERS:P.IMPACTS;
    return list.find(x=>x.id===id);
  }
  function buyOrEquipCosmetic(type,item){
    const owned=hasCosmetic(type,item.id);
    if(!owned){
      if(save.coins<item.coins||save.scrap<item.scrap)return;
      save.coins-=item.coins;save.scrap-=item.scrap;save.cosmetics.owned[type].push(item.id);
    }
    const key=type==='trails'?'trail':type==='launchers'?'launcher':'impact';
    save.cosmetics.equipped[key]=item.id;persist();renderCosmetics();
  }
  function cosmeticColor(style){
    return {none:'#8995a7',ember:'#e77c42',frost:'#b9ecff',storm:'#8ed2ff',crystal:'#c99cff',leaf:'#87b86b',honey:'#e6b54c',magnet:'#77c9ef',bone:'#e7dfcc',portal:'#81a5ff',royal:'#f2cf68',void:'#d94f5b',classic:'#e8c06a',glass:'#bcefff',spark:'#f08b45',snow:'#eef8ff'}[style]||'#e7bf63';
  }
  function getLauncherSkinCanvas(id=save.cosmetics.equipped.launcher){
    if(launcherSkinCache.has(id))return launcherSkinCache.get(id);
    if(!images.launcher?.complete)return null;
    const item=P.LAUNCHERS.find(x=>x.id===id)||P.LAUNCHERS[0];
    const cv=document.createElement('canvas');cv.width=256;cv.height=306;const c=cv.getContext('2d');
    c.clearRect(0,0,256,306);c.drawImage(images.launcher,0,0,256,306);
    if(item.id!=='timber'&&images.materials?.complete){
      const def=C.BLOCK_BY_ID[item.material]||C.BLOCK_BY_ID.wood,idx=def.index||0,cell=192,sx=(idx%5)*cell,sy=Math.floor(idx/5)*cell;
      c.globalCompositeOperation='source-atop';c.globalAlpha=.78;
      c.drawImage(images.materials,sx,sy,cell,cell,0,0,256,306);c.globalCompositeOperation='source-over';c.globalAlpha=.48;c.drawImage(images.launcher,0,0,256,306);c.globalAlpha=1;
    }
    launcherSkinCache.set(id,cv);return cv;
  }
  function masteryXp(side,id){return Math.max(0,Number(save.mastery?.[side]?.[id]||0));}
  function masteryProgress(side,id){
    const xp=masteryXp(side,id),level=P.masteryLevel(xp),next=P.MASTERY_THRESHOLDS[Math.min(10,level+1)]||P.MASTERY_THRESHOLDS[10],base=P.MASTERY_THRESHOLDS[level]||0;
    return {xp,level,next,base,pct:level>=10?100:Math.max(0,Math.min(100,(xp-base)/(next-base)*100))};
  }
  function awardMastery(side,used,stars,isBoss){
    const messages=[];
    for(const [id,count] of Object.entries(used)){
      if(!count)continue;const oldXp=masteryXp(side,id),oldLevel=P.masteryLevel(oldXp),gain=count*34+stars*18+(isBoss?35:0),newXp=oldXp+gain,newLevel=P.masteryLevel(newXp);save.mastery[side][id]=newXp;
      for(let lv=oldLevel+1;lv<=newLevel;lv++){
        const key=`${side}:${id}:${lv}`;if(save.mastery.awarded[key])continue;save.mastery.awarded[key]=true;
        const coins=500+lv*350;save.coins+=coins;let extra=`${coins.toLocaleString()} coins`;
        if([3,6,10].includes(lv)){save.scrap+=lv===10?4:2;extra+=lv===10?', 4 scrap':', 2 scrap';}
        if([5,10].includes(lv)){save.scrap+=lv===10?3:1;extra+=lv===10?', 3 bonus scrap':', 1 bonus scrap';}
        const ch=C.ROSTERS[side].find(x=>x.id===id);messages.push(`${ch?.name||id} mastery ${lv}: ${extra}`);
      }
    }
    return messages;
  }
  function totalStars(){return P.totalStars(save);}
  function openCampaign(side){ campaignSide=side; showScreen('campaignScreen'); renderCampaign(); }
  function renderCampaign(){
    const side=campaignSide;
    $('#campaignEyebrow').textContent=`${sideTitle(side).toUpperCase()} SIDE / 200 LEVELS`;
    $('#campaignTitle').textContent=`${sideTitle(side)} Campaign`;
    $('#switchSideBtn').textContent=`SWITCH TO ${side==='bird'?'PIG':'BIRD'} SIDE`;
    const grid=$('#storyGrid'); grid.innerHTML='';
    for(let s=1;s<=10;s++){
      const first=(s-1)*20+1, last=s*20, unlocked=isLevelUnlocked(side,first);
      const cleared=Object.keys(save.completed[side]).filter(k=>+k>=first&&+k<=last&&save.completed[side][k]).length;
      const theme=C.THEMES[(s-1)%C.THEMES.length];
      const b=document.createElement('button'); b.type='button'; b.className=`story-card ${unlocked?'':'locked'} ${save.progress[side]>=first&&save.progress[side]<=last?'current':''}`;
      b.innerHTML=`<div class="art" style="background-image:url('bg-${theme}.png')"></div><div class="body"><b>STORY ${s}: ${C.STORY_NAMES[side][s-1]}</b><small>${cleared}/20 cleared · bosses at 5, 10, 15, 20</small></div>`;
      b.disabled=!unlocked; b.addEventListener('click',()=>openStory(s)); grid.appendChild(b);
    }
  }
  function openStory(story){
    const side=campaignSide, first=(story-1)*20+1;
    $('#levelPanel').classList.remove('hidden');
    $('#storyLabel').textContent=`STORY ${story} / LEVELS ${first}-${first+19}`;
    $('#storyTitle').textContent=C.STORY_NAMES[side][story-1];
    $('#storyIntro').textContent=C.STORY_INTROS[side][story-1];
    const grid=$('#levelGrid'); grid.innerHTML='';
    for(let local=1;local<=20;local++){
      const n=first+local-1, level=L.generateLevel(side,n), unlocked=isLevelUnlocked(side,n);
      const b=document.createElement('button'); b.type='button';
      b.className=`level-btn ${level.type==='boss'?'boss':level.type==='major'?'major':level.type==='final'?'final':''} ${unlocked?'':'locked'} ${save.completed[side][n]?'complete':''}`;
      b.disabled=!unlocked;
      b.innerHTML=`${local}<span>${level.type==='regular'?'LEVEL':level.type.toUpperCase()}</span>`;
      b.addEventListener('click',()=>requestCampaignLevel(side,n)); grid.appendChild(b);
    }
    $('#levelPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }

  function showModal({kicker='',title='',body='',actions=[]}){
    $('#modalKicker').textContent=kicker; $('#modalTitle').textContent=title;
    $('#modalBody').innerHTML=body; const box=$('#modalActions'); box.innerHTML='';
    actions.forEach((a,i)=>{ const b=document.createElement('button'); b.type='button'; b.className=a.kind==='secondary'?'secondary':'primary'; b.textContent=a.label; b.addEventListener('click',()=>{ $('#modal').classList.add('hidden'); a.onClick?.(); }); box.appendChild(b); });
    $('#modal').classList.remove('hidden');
  }

  function requestCampaignLevel(side,n){
    const level=L.generateLevel(side,n);
    const local=level.local;
    const lines=[];
    if(local===1) lines.push(`<div class="cutscene-strip"><div class="cutscene-frame" style="background-image:url('bg-${level.theme}.png')"><b>STORY ${level.story}</b><span>${side==='bird'?'The flock enters new territory.':'The rebellion pushes into new territory.'}</span></div><div class="cutscene-frame" style="background-image:url('bg-${level.theme}.png')"><b>${C.STORY_NAMES[side][level.story-1]}</b><span>${C.STORY_INTROS[side][level.story-1]}</span></div></div>`);
    if(level.type!=='regular') lines.push(`<p>${level.type==='final'?'The story ends here. This boss has multiple exposed systems and no single-shot shortcut.':level.type==='major'?'A major defender blocks the route. Break every weak point.':'A field commander has entered the fight.'}</p>`);
    const debut=C.ROSTERS[side].find(ch=>ch.introLevel===n); if(debut) lines.push(`<p><strong>${debut.name}</strong> joins the supplied story lineup here. No purchase required.</p>`);
    if(lines.length){ showModal({kicker:`${sideTitle(side).toUpperCase()} SIDE · STORY ${level.story}`,title:level.title,body:lines.join(''),actions:[{label:'START LEVEL',onClick:()=>startGameLevel(level,{mode:'campaign'})},{label:'BACK',kind:'secondary'}]}); }
    else startGameLevel(level,{mode:'campaign'});
  }

  // GAME STATE
  let level=null, modeState=null, running=false, lastTime=0, raf=0;
  let blocks=[], targets=[], cores=[], boss=null, projectiles=[], particles=[];
  let shotIndex=0, score=0, selectedCharIndex=0, usedCopies={}, usedPermanent={}, usedCharacters={}, dragging=false, dragPos={x:L.ORIGIN.x,y:L.ORIGIN.y};
  let shotActive=false, abilityUsed=false, resultPending=false, cameraShake=0, attemptBlocksBroken=0, attemptAbilities=0;
  const projectileRadius=23;

  function defaultCharIndexForShot(i=shotIndex){ return level?.lineup?.[i] ?? 0; }
  function resetLoadedToDefault(){ selectedCharIndex=defaultCharIndexForShot(); }
  function isDefaultLoaded(ch){ return !!level && ch.index===defaultCharIndexForShot(); }
  function cloneLevel(src){ return JSON.parse(JSON.stringify(src)); }
  function blockDef(mat){ return C.BLOCK_BY_ID[mat]||C.BLOCK_BY_ID.wood; }
  function blockHp(mat){ return blockDef(mat).hp; }
  function startGameLevel(src, opts={mode:'campaign'}){
    level=cloneLevel(src); modeState={...(opts||{}), mode:opts.mode||'campaign'};
    blocks=level.blocks.map(b=>({...b,hp:b.hp||blockHp(b.mat),vx:0,vy:0,rotation:0,av:0,dead:false,landed:false}));
    targets=level.targets.map(t=>({...t,vx:0,vy:0,landed:false,dead:false})); cores=level.cores.map(c=>({...c,dead:false}));
    boss=level.boss?cloneLevel(level.boss):null;
    if(boss) boss.weak=boss.weak.map(w=>({...w,alive:true}));
    projectiles=[]; particles=[]; shotIndex=0; score=0; usedCopies={}; usedPermanent={}; usedCharacters={}; shotActive=false; abilityUsed=false; resultPending=false; dragging=false; cameraShake=0; attemptBlocksBroken=0; attemptAbilities=0;
    const roster=C.ROSTERS[level.side]; selectedCharIndex=level.lineup?.[0] ?? 0;
    showScreen('gameScreen');
    $('#hudMode').textContent=(modeState.mode==='campaign'?`${sideTitle(level.side).toUpperCase()} CAMPAIGN`:modeState.mode.toUpperCase());
    $('#hudTitle').textContent=level.type==='regular'?`${level.title} · ${blockDef(level.mechanic).label}`:level.title; $('#canvasHint').classList.remove('hidden');
    if(boss){ $('#bossBar').classList.remove('hidden'); $('#bossName').textContent=boss.name.toUpperCase(); } else $('#bossBar').classList.add('hidden');
    updateGameHud(); running=true; lastTime=performance.now(); cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
  }

  function reusableRemaining(side,ch){return ch.index===0?99:Math.max(0,permanentUnits(side,ch)-(usedPermanent[ch.id]||0));}
  function isCharAvailable(ch){
    if(!level||!ch)return false;
    if(isDefaultLoaded(ch)) return true;
    return reusableRemaining(level.side,ch)>0 || charCopies(level.side,ch)>0;
  }
  function getSelectedChar(){ return C.ROSTERS[level.side][selectedCharIndex]||C.ROSTERS[level.side][0]; }
  function updateGameHud(){
    $('#scoreText').textContent=Math.round(score).toLocaleString(); $('#twoStarText').textContent=(level?.stars?.[1]||0).toLocaleString(); $('#threeStarText').textContent=(level?.stars?.[2]||0).toLocaleString(); $('#shotsText').textContent=`${shotIndex}/${level?.birds||0}`;
    const ch=getSelectedChar(); $('#loadedName').textContent=ch.name; $('#loadedAbility').textContent=C.ABILITIES[ch.ability].label;
    $('#abilityBtn').disabled=!shotActive||abilityUsed;
    $('#abilityBtn').textContent=abilityUsed?'ABILITY USED':'USE ABILITY';
    const dots=$('#shotDots'); dots.innerHTML='';
    if(level) for(let i=0;i<level.birds;i++){ const d=document.createElement('i'); d.className=`shot-dot ${i<shotIndex?'used':''}`; dots.appendChild(d); }
    if(boss){ $('#bossHealth').style.width=`${Math.max(0,boss.hp/boss.maxHp*100)}%`; }
  }

  function canvasPoint(ev){
    const r=canvas.getBoundingClientRect(); return {x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height};
  }
  canvas.addEventListener('pointerdown',ev=>{
    if(!running||shotActive||resultPending||shotIndex>=level.birds) return;
    const p=canvasPoint(ev); if(Math.hypot(p.x-L.ORIGIN.x,p.y-L.ORIGIN.y)>95) return;
    dragging=true; dragPos=p; canvas.setPointerCapture?.(ev.pointerId); ev.preventDefault();
  });
  canvas.addEventListener('pointermove',ev=>{
    if(!dragging) return; const p=canvasPoint(ev); const dx=p.x-L.ORIGIN.x,dy=p.y-L.ORIGIN.y; const dist=Math.hypot(dx,dy),max=185;
    const s=dist>max?max/dist:1; dragPos={x:L.ORIGIN.x+dx*s,y:L.ORIGIN.y+dy*s}; ev.preventDefault();
  });
  canvas.addEventListener('pointerup',ev=>{ if(!dragging) return; dragging=false; fireFromDrag(); ev.preventDefault(); });

  function fireFromDrag(){
    const dx=L.ORIGIN.x-dragPos.x,dy=L.ORIGIN.y-dragPos.y; const pull=Math.hypot(dx,dy);
    if(pull<28){ dragPos={...L.ORIGIN}; return; }
    const ch=getSelectedChar();
    if(!isCharAvailable(ch)){ showPicker(); return; }
    const usingDefault=isDefaultLoaded(ch);
    const scale=5.35*ch.power;
    const p={x:L.ORIGIN.x,y:L.ORIGIN.y,vx:dx*scale,vy:dy*scale,r:projectileRadius,age:0,alive:true,charIndex:ch.index,pierce:0,bounce:0,primary:true};
    projectiles=[p]; shotIndex++; shotActive=true; abilityUsed=false; $('#canvasHint').classList.add('hidden');
    if(!usingDefault){
      if(reusableRemaining(level.side,ch)>0) usedPermanent[ch.id]=(usedPermanent[ch.id]||0)+1;
      else {save.inventory[level.side][ch.id]=Math.max(0,charCopies(level.side,ch)-1);usedCopies[ch.id]=(usedCopies[ch.id]||0)+1;persist();}
    }
    usedCharacters[ch.id]=(usedCharacters[ch.id]||0)+1;
    playSound('launch'); dragPos={...L.ORIGIN}; updateGameHud();
  }

  function useAbility(){
    if(!shotActive||abilityUsed) return; const p=projectiles.find(q=>q.alive&&q.primary) || projectiles.find(q=>q.alive); if(!p) return;
    abilityUsed=true; attemptAbilities++; const ch=C.ROSTERS[level.side][p.charIndex];
    if(ch.ability==='boost'){ p.vx*=1.55; p.vy*=1.15; burstParticles(p.x,p.y,14); }
    else if(ch.ability==='split'){
      const ang=Math.atan2(p.vy,p.vx), sp=Math.hypot(p.vx,p.vy)*.92;
      for(const off of [-.19,.19]) projectiles.push({...p,vx:Math.cos(ang+off)*sp,vy:Math.sin(ang+off)*sp,primary:false,r:19,age:p.age});
      burstParticles(p.x,p.y,10);
    }
    else if(ch.ability==='bomb'){ explodeAt(p.x,p.y,165,2.6,true); cameraShake=12; }
    else if(ch.ability==='drill'){ p.pierce=1.35; p.vx*=1.18; }
    else if(ch.ability==='bounce'){ p.bounce=2.0; p.vx*=1.16; p.vy-=130; }
    else if(ch.ability==='gravity'){ p.vy+=560; p.vx*=1.08; }
    else if(ch.ability==='brake'){ p.vx*=.22; p.vy=-95; }
    updateGameHud();
  }
  $('#abilityBtn').addEventListener('click',useAbility);
  window.addEventListener('keydown',e=>{ if(currentScreen==='gameScreen'&&e.code==='Space'){e.preventDefault();useAbility();} });

  function circleRect(px,py,pr,b){
    const cx=Math.max(b.x,Math.min(px,b.x+b.w)), cy=Math.max(b.y,Math.min(py,b.y+b.h));
    const dx=px-cx,dy=py-cy; return dx*dx+dy*dy<=pr*pr;
  }
  function damageBlock(b,amount,px,py){
    if(b.dead) return;
    const def=blockDef(b.mat); b.hp-=amount; const cx=b.x+b.w/2; b.vx+=(cx-(px??cx))*Math.min(1.8,amount)*.8; b.av+=((py??(b.y+b.h/2))-(b.y+b.h/2))*0.0009*Math.min(3,amount);
    if(b.hp<=0){
      b.dead=true; attemptBlocksBroken++; score+=def.score||220; playSound(def.shatter?'shatter':'impact'); burstParticles(b.x+b.w/2,b.y+b.h/2,def.shatter?14:9);
      if(def.explosive) explodeAt(b.x+b.w/2,b.y+b.h/2,175,3.25);
      else if(def.crystal) explodeAt(b.x+b.w/2,b.y+b.h/2,92,1.5);
    }
  }
  function killTarget(t){ if(t.dead)return; t.dead=true; score+=5000; playSound('impact'); burstParticles(t.x,t.y,12); }
  function hitBossWeak(w){
    if(!w.alive)return; w.alive=false; boss.hp--; score+=5000; cameraShake=16; playSound('boss'); burstParticles(w.x,w.y,22);
    boss.phase=Math.min(3,1+Math.floor((boss.maxHp-boss.hp)/(boss.maxHp/3)));
    updateGameHud();
  }
  function explodeAt(x,y,r,power=2,fromAbility=false){
    for(const t of targets){ if(!t.dead&&Math.hypot(t.x-x,t.y-y)<r+t.r) killTarget(t); }
    for(const c of cores){ if(!c.dead&&Math.hypot(c.x-x,c.y-y)<r*.6+c.r) triggerCore(c); }
    if(boss) for(const w of boss.weak){ if(w.alive&&Math.hypot(w.x-x,w.y-y)<r*.7+w.r) hitBossWeak(w); }
    for(const b of blocks){ if(!b.dead){ const bx=b.x+b.w/2,by=b.y+b.h/2,d=Math.hypot(bx-x,by-y); if(d<r+Math.max(b.w,b.h)/2) damageBlock(b,power*Math.max(.4,1-d/(r+100)),x,y); } }
    if(fromAbility) score+=250;
  }
  function triggerCore(c){ if(c.dead)return; c.dead=true; score+=2500; playSound('boss'); explodeAt(c.x,c.y,c.blast,3); burstParticles(c.x,c.y,26); cameraShake=13; }
  function burstParticles(x,y,count){
    const style=cosmeticEntry('impacts',save.cosmetics.equipped.impact)?.style||'classic';
    for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,sp=70+Math.random()*260,life=.4+Math.random()*.5;particles.push({kind:'impact',style,x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life,max:life,size:3+Math.random()*4,spin:(Math.random()-.5)*8});}
  }
  function emitTrail(p,dt){
    const item=cosmeticEntry('trails',save.cosmetics.equipped.trail);if(!item||item.style==='none')return;
    p.trailClock=(p.trailClock||0)+dt;
    while(p.trailClock>=.045){p.trailClock-=.045;const life=.34+Math.random()*.18;particles.push({kind:'trail',style:item.style,x:p.x-p.vx*.018+(Math.random()-.5)*7,y:p.y-p.vy*.018+(Math.random()-.5)*7,vx:-p.vx*.035+(Math.random()-.5)*25,vy:-p.vy*.035+(Math.random()-.5)*25,life,max:life,size:2.5+Math.random()*3.5,spin:(Math.random()-.5)*5});}
  }

  function updateProjectile(p,dt){
    if(!p.alive)return; p.age+=dt; p.portalCd=Math.max(0,(p.portalCd||0)-dt); if(p.pierce>0)p.pierce-=dt; if(p.bounce>0)p.bounce-=dt;

    // Environmental blocks affect the projectile before collision. Their influence is intentionally local and readable.
    for(const b of blocks){
      if(b.dead||b.decorative)continue; const def=blockDef(b.mat),cx=b.x+b.w/2,cy=b.y+b.h/2,dx=cx-p.x,dy=cy-p.y,d=Math.hypot(dx,dy)||1;
      if(def.fan && d<175) p.vx += (b.fanDir||1)*420*dt*(1-d/175);
      if(def.magnet && d<225){const pull=520*dt*(1-d/225);p.vx+=dx/d*pull;p.vy+=dy/d*pull;}
    }

    p.vx+=(level.wind||0)*dt; p.vy+=level.gravity*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; emitTrail(p,dt);
    const speed=Math.hypot(p.vx,p.vy);

    for(const c of cores){ if(!c.dead&&Math.hypot(p.x-c.x,p.y-c.y)<p.r+c.r){ triggerCore(c); p.vx*=.55;p.vy*=.55; } }
    for(const t of targets){ if(!t.dead&&Math.hypot(p.x-t.x,p.y-t.y)<p.r+t.r){ killTarget(t); p.vx*=.68;p.vy*=.68; } }
    if(boss) for(const w of boss.weak){ if(w.alive&&Math.hypot(p.x-w.x,p.y-w.y)<p.r+w.r){ hitBossWeak(w); if(level.type==='final'){ p.alive=false; break; } p.vx*=.6;p.vy*=.6; } }

    for(const b of blocks){
      if(b.dead||b.decorative||!circleRect(p.x,p.y,p.r,b)) continue;
      const def=blockDef(b.mat);
      if(def.teleporter && p.portalCd<=0){
        const mate=blocks.find(o=>!o.dead&&o!==b&&o.mat==='teleporter'&&o.portalGroup&&o.portalGroup===b.portalGroup);
        if(mate){p.x=mate.x+mate.w/2+Math.sign(p.vx||1)*(mate.w/2+p.r+8);p.y=mate.y+mate.h/2;p.portalCd=.55;burstParticles(p.x,p.y,15);continue;}
      }
      const ch=C.ROSTERS[level.side][p.charIndex];
      damageBlock(b,(speed/520)*ch.mass*def.impact*(p.pierce>0?3.2:1),p.x,p.y);
      if(def.spring){p.vy=-Math.max(360,Math.abs(p.vy)*1.05+160);p.vx*=1.08;p.bounce=Math.max(p.bounce,1.0);continue;}
      if(def.sticky){p.vx*=.22;p.vy*=.18;p.age+=.28;continue;}
      if(p.pierce<=0){
        const cx=b.x+b.w/2,cy=b.y+b.h/2,nx=(p.x-cx)/(b.w/2+p.r),ny=(p.y-cy)/(b.h/2+p.r);
        const rebound=def.ice?.72:def.snow?.18:.42;
        if(Math.abs(nx)>Math.abs(ny)) p.vx*=-rebound-(p.bounce>0?.32:0); else p.vy*=-rebound-(p.bounce>0?.36:0);
        p.x+=Math.sign(p.vx||1)*4;p.y+=Math.sign(p.vy||-1)*4;
      }
    }
    if(p.y+p.r>=GROUND){p.y=GROUND-p.r;if(Math.abs(p.vy)>90){p.vy*=-((p.bounce>0)?.78:.35);p.vx*=.78;playSound('impact');}else{p.vy=0;p.vx*=Math.pow(.1,dt);}}
    if(p.x>W+120||p.x<-180||p.y>H+120||p.age>8.2||(p.age>2.1&&Math.hypot(p.vx,p.vy)<18)){p.alive=false;}
  }

  function updateBlocks(dt){
    const live=blocks.filter(b=>!b.dead&&!b.decorative);
    live.sort((a,b)=>(b.y+b.h)-(a.y+a.h));
    for(const b of live){
      let supportY=GROUND;
      for(const o of live){
        if(o===b)continue;
        const overlap=Math.min(b.x+b.w,o.x+o.w)-Math.max(b.x,o.x);
        const bottom=b.y+b.h;
        if(overlap>Math.min(12,b.w*.22) && o.y>=bottom-5 && o.y<supportY) supportY=o.y;
      }
      const gap=supportY-(b.y+b.h);
      if(gap>2){
        b.landed=false; b.vy+=level.gravity*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.rotation+=b.av*dt;
        b.vx*=Math.pow(.985,dt*60); b.av*=Math.pow(.992,dt*60);
      } else {
        const impact=Math.max(0,b.vy);
        if(!b.landed&&impact>145){
          if(shotIndex>0&&impact>245) damageBlock(b,Math.min(2.2,impact/720),b.x+b.w/2,b.y+b.h);
          if(shotIndex>0)for(const t of targets){if(!t.dead&&t.x>b.x-t.r&&t.x<b.x+b.w+t.r&&t.y>b.y-t.r&&t.y<b.y+b.h+t.r&&impact>230)killTarget(t);}
        }
        b.y=supportY-b.h; b.vy=0; b.landed=true; b.x+=b.vx*dt; b.vx*=Math.pow(.72,dt*60); b.rotation+=b.av*dt; b.av*=Math.pow(.76,dt*60);
        if(Math.abs(b.rotation)<.008)b.rotation=0;
      }
      if(b.x<-80){b.x=-80;b.vx=Math.abs(b.vx)*.25;} if(b.x+b.w>W+80){b.x=W+80-b.w;b.vx=-Math.abs(b.vx)*.25;}
    }
  }

  function updateTargets(dt){
    const solids=blocks.filter(b=>!b.dead&&!b.decorative);
    for(const t of targets){
      if(t.dead)continue;
      let supportY=GROUND;
      const bottom=t.y+t.r;
      for(const b of solids){
        if(t.x+t.r*0.72<b.x||t.x-t.r*0.72>b.x+b.w)continue;
        if(b.y>=bottom-6&&b.y<supportY)supportY=b.y;
      }
      const gap=supportY-bottom;
      if(gap>2){t.landed=false;t.vy+=level.gravity*dt;t.x+=t.vx*dt;t.y+=t.vy*dt;t.vx*=Math.pow(.99,dt*60);}
      else{
        const impact=Math.max(0,t.vy);t.y=supportY-t.r;t.vy=0;t.landed=true;t.vx*=Math.pow(.76,dt*60);t.x+=t.vx*dt;
        if(shotIndex>0&&impact>390){killTarget(t);continue;}
      }
      for(const b of solids){
        if(b.vy>210&&circleRect(t.x,t.y,t.r*.82,b)){killTarget(t);break;}
      }
      if(t.y>H+80)killTarget(t);
    }
  }

  function updateParticles(dt){ for(const p of particles){p.life-=dt;p.vy+=(p.kind==='trail'?90:520)*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin=(p.spin||0)+dt;} particles=particles.filter(p=>p.life>0); }

  function update(dt){
    if(!level||resultPending)return;
    projectiles.forEach(p=>updateProjectile(p,dt)); updateBlocks(dt); updateTargets(dt); updateParticles(dt);
    if(cameraShake>0) cameraShake=Math.max(0,cameraShake-40*dt);
    const alive=projectiles.some(p=>p.alive);
    if(shotActive&&!alive){ shotActive=false; abilityUsed=false; projectiles=[]; resetLoadedToDefault(); updateGameHud(); checkResult(); }
    if(shotActive) checkResult();
  }
  function checkResult(){
    const cleared=boss?boss.hp<=0:targets.every(t=>t.dead);
    if(cleared){ resultPending=true; setTimeout(()=>finishWin(),650); return; }
    if(!shotActive&&shotIndex>=level.birds){ resultPending=true; setTimeout(()=>finishLoss(),500); }
  }

  function starCount(){
    let s=1; if(score>=level.stars[1])s=2; if(score>=level.stars[2])s=3; return s;
  }
  function storyIntroNotice(side,n){
    const next=C.ROSTERS[side].find(ch=>ch.introLevel===n+1);
    return next?[`${next.name} joins the supplied story lineup in Level ${n+1}.`]:[];
  }
  function finishWin(){
    if(!level)return; playSound('victory');
    const remaining=Math.max(0,level.birds-shotIndex); score+=remaining*10000;
    const stars=starCount(); let coinAward=level.coins+stars*90; let scrapAward=stars===3?1:0, unlockText=[];
    const daily=ensureDaily(); save.stats.clears++; save.stats.stars+=stars; save.stats.blocks+=attemptBlocksBroken; save.stats.abilities+=attemptAbilities; if(boss)save.stats.bosses++; daily.clears++; daily.stars+=stars; daily.blocks+=attemptBlocksBroken;
    if(modeState.mode==='campaign'){
      save.completed[level.side][level.number]=true; save.stars[level.side][level.number]=Math.max(stars,save.stars[level.side][level.number]||0);
      save.progress[level.side]=Math.max(save.progress[level.side],Math.min(201,level.number+1));
      coinAward=level.coins+stars*100;
      if(level.type==='boss'){scrapAward+=2;} if(level.type==='major'){scrapAward+=4;} if(level.type==='final'){scrapAward+=7;}
      unlockText=storyIntroNotice(level.side,level.number);
    } else if(modeState.mode==='endless'){
      modeState.stage=(modeState.stage||1); save.bestEndless[level.side]=Math.max(save.bestEndless[level.side]||0,modeState.stage); coinAward=220+modeState.stage*35; if(modeState.stage%5===0)scrapAward+=2;
    } else if(modeState.mode==='daily'){ coinAward=1000; scrapAward+=4; }
    else if(modeState.mode==='bossrush'){ coinAward=650; scrapAward+=4; }
    const masteryText=awardMastery(level.side,usedCharacters,stars,!!boss);
    save.coins+=coinAward; save.scrap+=scrapAward; persist();
    const extra=[...unlockText,...masteryText,scrapAward?`${scrapAward} scrap earned`:null].filter(Boolean).map(x=>`<p><strong>${x}</strong></p>`).join('');
    const actions=[];
    if(modeState.mode==='campaign'&&level.number<200) actions.push({label:'NEXT LEVEL',onClick:()=>startGameLevel(L.generateLevel(level.side,level.number+1),{mode:'campaign'})});
    if(modeState.mode==='endless') actions.push({label:'NEXT ENDLESS STAGE',onClick:()=>startEndlessStage(level.side,(modeState.stage||1)+1)});
    if(modeState.mode==='bossrush') actions.push({label:'NEXT BOSS',onClick:()=>nextBossRush()});
    actions.push({label:'CAMPAIGN MAP',kind:'secondary',onClick:()=>openCampaign(level.side)});
    actions.push({label:'MAIN MENU',kind:'secondary',onClick:()=>showScreen('homeScreen')});
    running=false; cancelAnimationFrame(raf);
    showModal({kicker:`LEVEL CLEARED · ${stars} STAR${stars===1?'':'S'}`,title:`${coinAward.toLocaleString()} coins earned`,body:`<p>Score: <strong>${Math.round(score).toLocaleString()}</strong>. Remaining shots were converted into bonus score.</p>${extra}`,actions});
  }
  function finishLoss(){
    running=false; cancelAnimationFrame(raf);
    showModal({kicker:'ATTEMPT ENDED',title:'The target is still standing',body:'<p>The supplied story lineup is always free. Only optional Character Swaps are spent; permanent swap units refresh when you retry.</p>',actions:[{label:'RETRY',onClick:()=>startGameLevel(L.generateLevel(level.side,level.number),modeState)},{label:'CHARACTER SWAP',kind:'secondary',onClick:()=>{running=true;showPicker();}},{label:'QUIT',kind:'secondary',onClick:()=>showScreen('homeScreen')}]});
  }

  function loop(now){
    if(!running)return; const dt=Math.min(.028,Math.max(.001,(now-lastTime)/1000)); lastTime=now;
    update(dt); draw(); raf=requestAnimationFrame(loop);
  }

  function drawSprite(side,index,x,y,size,alpha=1){
    const im=images[side==='bird'?'birds':'pigs']; if(!im.complete)return;
    const col=index%5,row=Math.floor(index/5),cell=204,sx=col*cell,sy=row*cell;
    ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,sx,sy,cell,cell,x-size/2,y-size/2,size,size);ctx.restore();
  }
  function drawBlock(b){
    if(b.dead)return; const im=images.materials,def=blockDef(b.mat),idx=def.index||0,cell=192,sx=(idx%5)*cell,sy=Math.floor(idx/5)*cell;
    ctx.save();
    if(b.rotation){ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate(b.rotation);ctx.translate(-(b.x+b.w/2),-(b.y+b.h/2));}
    if(im.complete)ctx.drawImage(im,sx,sy,cell,cell,b.x,b.y,b.w,b.h);else{ctx.fillStyle='#747c86';ctx.fillRect(b.x,b.y,b.w,b.h);}
    if(def.fan){ctx.strokeStyle='#d9e3ee88';ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(b.x+b.w+(i*18),b.y+8+i*9);ctx.lineTo(b.x+b.w+34+i*18,b.y+8+i*9);ctx.stroke();}}
    if(def.magnet){ctx.strokeStyle='#8dc6e788';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x+b.w/2,b.y+b.h/2,Math.max(b.w,b.h)*.75,0,Math.PI*2);ctx.stroke();}
    const frac=Math.max(0,b.hp/blockHp(b.mat));if(frac<.55){ctx.strokeStyle='#111820aa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x+b.w*.18,b.y+b.h*.05);ctx.lineTo(b.x+b.w*.5,b.y+b.h*.78);ctx.lineTo(b.x+b.w*.79,b.y+b.h*.18);ctx.stroke();}
    if(save.settings.physicsDebug){ctx.strokeStyle=b.landed?'#7bd58c':'#e5b95e';ctx.lineWidth=2;ctx.strokeRect(b.x,b.y,b.w,b.h);}
    ctx.restore();
  }

  function draw(){
    if(!level)return; ctx.save();
    if(cameraShake>0){ctx.translate((Math.random()-.5)*cameraShake,(Math.random()-.5)*cameraShake);}
    const bg=images[level.theme]; if(bg?.complete)ctx.drawImage(bg,0,0,W,H); else {ctx.fillStyle='#54687a';ctx.fillRect(0,0,W,H);}
    // atmosphere tint
    ctx.fillStyle=level.side==='pig'?'rgba(77,98,54,.08)':'rgba(51,65,89,.05)';ctx.fillRect(0,0,W,H);
    // ground
    ctx.fillStyle='#273129';ctx.fillRect(0,GROUND,W,H-GROUND);ctx.fillStyle='#384436';ctx.fillRect(0,GROUND,W,9);
    // launch platform and sling
    const launcherArt=getLauncherSkinCanvas();if(launcherArt)ctx.drawImage(launcherArt,104,458,155,185);else{ctx.fillStyle='#4a3526';ctx.fillRect(143,525,18,105);ctx.fillRect(195,525,18,105);}
    ctx.strokeStyle='#2b1c17';ctx.lineWidth=10;ctx.lineCap='round';
    const loadedPos=dragging?dragPos:{x:L.ORIGIN.x,y:L.ORIGIN.y};
    if(!shotActive&&shotIndex<level.birds){ctx.beginPath();ctx.moveTo(152,535);ctx.lineTo(loadedPos.x,loadedPos.y);ctx.lineTo(204,535);ctx.stroke();}

    // trajectory preview
    if(dragging&&save.settings.aim){
      const ch=getSelectedChar(),vx=(L.ORIGIN.x-dragPos.x)*5.35*ch.power,vy=(L.ORIGIN.y-dragPos.y)*5.35*ch.power;
      let x=L.ORIGIN.x,y=L.ORIGIN.y,vxx=vx,vyy=vy; ctx.fillStyle='#ffffffaa';
      for(let i=0;i<28;i++){const dt=.06;vxx+=(level.wind||0)*dt;vyy+=level.gravity*dt;x+=vxx*dt;y+=vyy*dt;if(i%2===0){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}if(y>GROUND)break;}
    }

    blocks.forEach(drawBlock);
    // cores
    for(const c of cores){if(c.dead)continue;ctx.save();ctx.strokeStyle='#6d5831aa';ctx.lineWidth=4;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(c.x,c.y+c.r);ctx.lineTo(c.x,Math.min(GROUND-45,c.y+225));ctx.stroke();ctx.setLineDash([]);ctx.translate(c.x,c.y);ctx.fillStyle='#d7b955';ctx.strokeStyle='#42351b';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,c.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#fff2';for(let a=0;a<6;a++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(c.r+4,0);ctx.lineTo(c.r+13,0);ctx.stroke();}ctx.restore();}
    // targets are the opposing faction
    const enemySide=level.side==='bird'?'pig':'bird';
    for(let i=0;i<targets.length;i++){const t=targets[i];if(t.dead)continue;drawSprite(enemySide,(level.number+i*3)%21,t.x,t.y,t.r*2.8);}
    if(save.settings.physicsDebug){ctx.save();ctx.font='700 11px ui-monospace,monospace';ctx.fillStyle='#f4cf6a';for(const t of targets){if(t.dead)continue;ctx.fillText(t.landed?'TARGET GROUNDED':'TARGET FALLING',t.x-42,t.y-t.r-12);}ctx.restore();}

    if(boss){
      // armored boss chassis
      ctx.save();ctx.translate(boss.x,boss.y);ctx.fillStyle='#1e2530cc';ctx.strokeStyle='#776d5a';ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(-155,-135,310,270,38);ctx.fill();ctx.stroke();
      drawSprite(enemySide,(boss.story||level.story)*2%21,0,-5,175);
      ctx.fillStyle='#0f141b';ctx.fillRect(-142,95,284,24);ctx.fillStyle='#b78b45';ctx.fillRect(-142,95,284*(boss.hp/boss.maxHp),24);ctx.restore();
      for(const w of boss.weak){ if(!w.alive)continue; const pulse=1+Math.sin(performance.now()/180+w.x)*.06;ctx.fillStyle='#e2b64f';ctx.strokeStyle='#241b0d';ctx.lineWidth=4;ctx.beginPath();ctx.arc(w.x,w.y,w.r*pulse,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff6';ctx.beginPath();ctx.arc(w.x-6,w.y-7,6,0,Math.PI*2);ctx.fill(); }
      // phase indicator bars
      ctx.fillStyle='#ffffff22'; for(let i=0;i<boss.phase;i++)ctx.fillRect(boss.x-80+i*58,boss.y-170,44,8);
    }

    // loaded character
    if(!shotActive&&shotIndex<level.birds) drawSprite(level.side,getSelectedChar().index,loadedPos.x,loadedPos.y,64);
    // projectiles
    for(const p of projectiles){if(!p.alive)continue;drawSprite(level.side,p.charIndex,p.x,p.y,p.r*2.8,p.primary?1:.82);if(p.pierce>0){ctx.strokeStyle='#f2d070aa';ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,p.r+7,0,Math.PI*2);ctx.stroke();}}
    // impact and equipped flight trail particles
    for(const p of particles){const alpha=Math.max(0,p.life/p.max),color=cosmeticColor(p.style);ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);ctx.rotate((p.spin||0)*2.2);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=2.2;if(p.style==='portal'){ctx.beginPath();ctx.arc(0,0,Math.max(3,p.size*2.2),0,Math.PI*2);ctx.stroke();}else if(p.style==='storm'||p.style==='magnet'){ctx.beginPath();ctx.moveTo(-p.size*2,0);ctx.lineTo(0,-p.size);ctx.lineTo(p.size*1.6,p.size*.6);ctx.stroke();}else if(p.style==='leaf'){ctx.beginPath();ctx.ellipse(0,0,p.size*1.8,p.size*.7,.5,0,Math.PI*2);ctx.fill();}else if(p.style==='glass'||p.style==='crystal'||p.style==='frost'){ctx.beginPath();ctx.moveTo(0,-p.size*1.8);ctx.lineTo(p.size,p.size);ctx.lineTo(-p.size,p.size*.7);ctx.closePath();ctx.fill();}else{ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);}ctx.restore();}ctx.globalAlpha=1;
    // wind indicator
    if(Math.abs(level.wind||0)>5){ctx.fillStyle='#111821b8';ctx.fillRect(18,18,145,38);ctx.fillStyle='#d8e1eb';ctx.font='700 15px system-ui';ctx.fillText(`WIND ${level.wind>0?'RIGHT':'LEFT'}`,30,43);}
    ctx.restore();
  }

  // Character picker
  function showPicker(){
    if(!level)return; const grid=$('#pickerGrid');grid.innerHTML='';
    C.ROSTERS[level.side].forEach(ch=>{
      const copies=charCopies(level.side,ch),perm=permanentUnits(level.side,ch),remain=reusableRemaining(level.side,ch),isDefault=isDefaultLoaded(ch),available=isDefault||remain>0||copies>0;
      const b=document.createElement('button');b.type='button';b.className='picker-item';b.disabled=!available;
      let stock=isDefault?'SUPPLIED FOR THIS SHOT · FREE':perm>0?`SWAP · PERMANENT ${remain}/${perm} THIS ATTEMPT · ${copies} FINITE`:`SWAP · ${copies} FINITE`;
      b.innerHTML=`<b>${ch.name}</b><span>${C.ABILITIES[ch.ability].label} · ${available?stock:'NO SWAPS OWNED'}</span>`;
      b.addEventListener('click',()=>{selectedCharIndex=ch.index;$('#characterPicker').classList.add('hidden');updateGameHud();});grid.appendChild(b);
    });
    $('#characterPicker').classList.remove('hidden');
  }
  $('#rosterBtn').addEventListener('click',showPicker);$('#closePickerBtn').addEventListener('click',()=>$('#characterPicker').classList.add('hidden'));

  // Character swap shop: finite packs + up to four reusable permanent units per character.
  function renderRoster(){
    $('#rosterSideBtn').textContent=`SHOW ${rosterSide==='bird'?'PIGS':'BIRDS'}`;
    const grid=$('#rosterGrid');grid.innerHTML='';
    C.ROSTERS[rosterSide].forEach(ch=>{
      const introduced=isStoryIntroduced(rosterSide,ch), copies=charCopies(rosterSide,ch),perm=permanentUnits(rosterSide,ch), mastery=masteryProgress(rosterSide,ch.id);
      const card=document.createElement('article');card.className='char-card';
      const art=document.createElement('div');art.className='char-art';const cv=document.createElement('canvas');cv.width=cv.height=130;art.appendChild(cv);
      const body=document.createElement('div');body.className='char-body';
      const stock=`PERMANENT ${ch.index===0?0:perm}/4 · ${copies} FINITE SWAPS`;
      const storyStatus=introduced?`STORY CHARACTER · INTRODUCED`:`STORY INTRO · LEVEL ${ch.introLevel}`;
      body.innerHTML=`<h3>${ch.name}</h3><div class="char-meta"><span>${ch.rarity}</span><span>${C.ABILITIES[ch.ability].label}</span></div><p>${C.ABILITIES[ch.ability].desc}</p><div class="char-meta"><span>${stock}</span><span>${storyStatus}</span></div><div class="roster-mastery"><div class="bar"><i style="width:${mastery.pct}%"></i></div><small><span>MASTERY ${mastery.level}/10</span><span>${mastery.level>=10?'MAX':`${mastery.xp}/${mastery.next} XP`}</span></small></div>`;
      {
        const shop=document.createElement('div');shop.className='swap-shop-row';
        for(const qty of [10,30,100]){const cost=ch.shop[`pack${qty}`],b=document.createElement('button');b.type='button';b.className='secondary';b.textContent=`+${qty} · ${cost.toLocaleString()}`;b.disabled=save.coins<cost;b.addEventListener('click',()=>buyFinite(ch,qty,cost));shop.appendChild(b);}
        const pb=document.createElement('button');pb.type='button';pb.className='primary';pb.textContent=perm>=4?'PERMANENT MAX 4/4':`BUY PERMANENT ${perm+1}/4 · ${ch.shop.permanent.toLocaleString()}`;pb.disabled=perm>=4||save.coins<ch.shop.permanent;pb.addEventListener('click',()=>buyPermanent(ch));shop.appendChild(pb);body.appendChild(shop);
      }
      card.append(art,body);grid.appendChild(card);
      requestAnimationFrame(()=>{const c=cv.getContext('2d'),im=images[rosterSide==='bird'?'birds':'pigs'];if(im.complete){const col=ch.index%5,row=Math.floor(ch.index/5);c.drawImage(im,col*204,row*204,204,204,0,0,130,130);}});
    });
  }
  function buyFinite(ch,qty,cost){if(save.coins<cost)return;save.coins-=cost;save.inventory[ch.side][ch.id]=charCopies(ch.side,ch)+qty;persist();renderRoster();}
  function buyPermanent(ch){const cur=permanentUnits(ch.side,ch);if(cur>=4||save.coins<ch.shop.permanent)return;save.coins-=ch.shop.permanent;save.permanent[ch.side][ch.id]=cur+1;persist();renderRoster();}

  // ABSW2-inspired timed melt: free random character swaps every eight hours.
  const MELT_MS=8*60*60*1000;
  function updateMeltTopStatus(){const el=$('#meltTopStatus');if(!el)return;const now=Date.now();if(!save?.melt?.active){el.textContent='IDLE';return;}if(now>=save.melt.readyAt){el.textContent='READY';return;}const mins=Math.ceil((save.melt.readyAt-now)/60000);el.textContent=mins>=60?`${Math.floor(mins/60)}H ${mins%60}M`:`${mins}M`;}
  function weightedChoice(items){let total=items.reduce((a,x)=>a+x.w,0),r=Math.random()*total;for(const x of items){r-=x.w;if(r<=0)return x.v;}return items.at(-1).v;}
  function meltReward(){
    const all=[];for(const side of ['bird','pig'])for(const ch of C.ROSTERS[side])all.push({side,ch,w:({Common:10,Uncommon:7,Rare:4,Epic:2,Legendary:1})[ch.rarity]||4});
    const pick=weightedChoice(all.map(x=>({v:x,w:x.w}))), r=pick.ch.rarity;
    const qty=weightedChoice(({Common:[[10,5],[20,3],[30,1]],Uncommon:[[5,5],[10,3],[20,1]],Rare:[[3,5],[5,3],[10,1]],Epic:[[2,5],[3,3],[5,1]],Legendary:[[1,6],[2,2.5],[3,.5]]})[r].map(([v,w])=>({v,w})));
    save.inventory[pick.side][pick.ch.id]=charCopies(pick.side,pick.ch)+qty;
    const title=`${pick.ch.name} +${qty}`;const detail=`Stasis melt recovered ${qty} finite ${pick.side} character swap${qty===1?'':'s'} (${r}).`;
    save.rewards.push({title,detail,at:Date.now()});save.rewards=save.rewards.slice(-30);return{title,detail};
  }
  function startMelt(){if(save.melt.active)return;save.melt.active=true;save.melt.readyAt=Date.now()+MELT_MS;persist();renderMelt();}
  function speedMelt(){if(!save.melt.active||Date.now()>=save.melt.readyAt||save.coins<80)return;save.coins-=80;save.melt.readyAt=Date.now();persist();renderMelt();}
  function claimMelt(){if(!save.melt.active||Date.now()<save.melt.readyAt)return;const reward=meltReward();save.melt.active=false;save.melt.readyAt=0;save.melt.lastClaim=Date.now();persist();renderMelt();showModal({kicker:'STASIS MELT COMPLETE',title:reward.title,body:`<p>${reward.detail}</p><p>Start another melt whenever you are ready.</p>`,actions:[{label:'BACK TO MELT'}]});}
  function renderMelt(){
    const now=Date.now(),active=save.melt.active,ready=active&&now>=save.melt.readyAt,state=$('#meltState'),timer=$('#meltTimer'),main=$('#meltMainBtn'),nowBtn=$('#meltNowBtn'),core=$('#meltCore');
    core?.classList.toggle('opening',ready);
    if(!active){state.textContent='READY TO START';timer.textContent='Start a melt. The random character reward becomes claimable in eight hours.';main.textContent='START 8-HOUR MELT';main.disabled=false;nowBtn.classList.add('hidden');main.onclick=startMelt;}
    else if(ready){state.textContent='REWARD READY';timer.textContent='The stasis core has fully melted.';main.textContent='CLAIM CHARACTER REWARD';main.disabled=false;nowBtn.classList.add('hidden');main.onclick=claimMelt;}
    else {const left=Math.max(0,save.melt.readyAt-now),h=Math.floor(left/3600000),m=Math.floor(left%3600000/60000),sec=Math.floor(left%60000/1000);state.textContent='MELTING';timer.textContent=`${h}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s remaining`;main.textContent='MELT IN PROGRESS';main.disabled=true;nowBtn.classList.remove('hidden');nowBtn.disabled=save.coins<80;nowBtn.textContent='MELT NOW · 80 COINS';nowBtn.onclick=speedMelt;}
    const log=$('#rewardLog');log.innerHTML='';const items=save.rewards.slice(-8).reverse();if(!items.length)log.innerHTML='<div class="reward-item"><b>No melts claimed yet</b><span>Each completed melt awards finite character swaps.</span></div>';items.forEach(r=>{const d=document.createElement('div');d.className='reward-item';d.innerHTML=`<b>${r.title}</b><span>${r.detail}</span>`;log.appendChild(d);});updateMeltTopStatus();
  }
  setInterval(()=>{updateMeltTopStatus();if(currentScreen==='capsuleScreen')renderMelt();},1000);

  // Cosmetics and long-term progression
  function renderCosmeticGroup(containerId,type,items){
    const box=$(containerId);box.innerHTML='';const equippedKey=type==='trails'?'trail':type==='launchers'?'launcher':'impact';
    for(const item of items){
      const owned=hasCosmetic(type,item.id),equipped=save.cosmetics.equipped[equippedKey]===item.id,afford=save.coins>=item.coins&&save.scrap>=item.scrap;
      const card=document.createElement('article');card.className=`cosmetic-card ${equipped?'equipped':''}`;
      const preview=document.createElement('div');preview.className='cosmetic-preview';
      if(type==='launchers'){
        const cv=document.createElement('canvas');cv.width=320;cv.height=132;preview.appendChild(cv);
        const paint=()=>{const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);const art=getLauncherSkinCanvas(item.id);if(art)c.drawImage(art,108,-13,110,132);else setTimeout(paint,100);};requestAnimationFrame(paint);
      }else if(type==='trails'){
        const demo=document.createElement('div');demo.className='trail-demo';demo.style.setProperty('--trail',cosmeticColor(item.style));preview.appendChild(demo);
      }else{
        const demo=document.createElement('div');demo.className='impact-demo';demo.style.setProperty('--impact',cosmeticColor(item.style));preview.appendChild(demo);
      }
      const body=document.createElement('div');body.className='cosmetic-body';
      const price=item.coins||item.scrap?`${item.coins.toLocaleString()} coins · ${item.scrap} scrap`:'STARTER';
      body.innerHTML=`<h3>${item.name}</h3><p>${item.desc}</p><div class="cosmetic-price">${price}</div>`;
      const btn=document.createElement('button');btn.type='button';btn.className=equipped?'secondary':'primary';btn.textContent=equipped?'EQUIPPED':owned?'EQUIP':'UNLOCK';btn.disabled=equipped||(!owned&&!afford);btn.addEventListener('click',()=>buyOrEquipCosmetic(type,item));body.appendChild(btn);card.append(preview,body);box.appendChild(card);
    }
  }
  function renderCosmetics(){
    updateWallet();$('#cosmeticScrap').textContent=save.scrap;
    renderCosmeticGroup('#trailGrid','trails',P.TRAILS);renderCosmeticGroup('#launcherGrid','launchers',P.LAUNCHERS);renderCosmeticGroup('#impactGrid','impacts',P.IMPACTS);
  }
  function claimVault(item){
    const key=String(item.stars);if(totalStars()<item.stars||save.vault.claimed[key])return;save.vault.claimed[key]=true;save.coins+=item.coins;save.scrap+=item.scrap;save.rewards.push({title:item.name,detail:`Star Vault reward: ${item.coins.toLocaleString()} coins and ${item.scrap} scrap.`,at:Date.now()});save.rewards=save.rewards.slice(-30);persist();renderProgression();
  }
  function renderProgression(){
    const stars=totalStars();$('#totalStarsText').textContent=stars.toLocaleString();const vault=$('#starVaultGrid');vault.innerHTML='';
    for(const item of P.VAULT){const claimed=!!save.vault.claimed[String(item.stars)],done=stars>=item.stars,pct=Math.min(100,stars/item.stars*100),card=document.createElement('article');card.className=`vault-card ${claimed?'claimed':''}`;card.innerHTML=`<h3>${item.name}</h3><p>${item.stars} total campaign stars</p><div class="vault-progress"><i style="width:${pct}%"></i></div><p>${item.coins.toLocaleString()} coins · ${item.scrap} scrap</p><button class="${done&&!claimed?'primary':'secondary'}" ${done&&!claimed?'':'disabled'}>${claimed?'CLAIMED':done?'CLAIM REWARD':`${stars}/${item.stars} STARS`}</button>`;card.querySelector('button').addEventListener('click',()=>claimVault(item));vault.appendChild(card);}
    const all=[];for(const side of ['bird','pig'])for(const ch of C.ROSTERS[side]){const m=masteryProgress(side,ch.id);all.push({side,ch,...m});}all.sort((a,b)=>b.xp-a.xp||a.ch.index-b.ch.index);const grid=$('#masteryGrid');grid.innerHTML='';
    for(const m of all.slice(0,12)){const card=document.createElement('article');card.className='mastery-card';card.innerHTML=`<div class="meta"><span>${m.side.toUpperCase()} SIDE</span><span>LEVEL ${m.level}/10</span></div><h3>${m.ch.name}</h3><div class="mastery-progress"><i style="width:${m.pct}%"></i></div><p>${m.level>=10?'MAX MASTERY':`${m.xp.toLocaleString()} / ${m.next.toLocaleString()} XP`} · Use this character in successful clears to progress.</p>`;grid.appendChild(card);}
  }

  // Extra modes
  function chooseSideFor(title,onPick){showModal({kicker:'SELECT A SIDE',title,body:'<p>Both factions have their own roster, progress, finite swaps, and permanent reusable units.</p>',actions:[{label:'BIRD SIDE',onClick:()=>onPick('bird')},{label:'PIG SIDE',onClick:()=>onPick('pig')},{label:'CANCEL',kind:'secondary'}]});}
  function endlessLevel(side,stage){
    let n=((stage*13+7)%200)+1; if(stage%5===0){const story=((Math.floor(stage/5)-1)%10)+1;n=(story-1)*20+(stage%10===0?10:5);} const l=L.generateLevel(side,n);l.title=`Endless Stage ${stage}: ${l.title}`;l.coins=200+stage*30;l.birds=Math.max(l.birds,3+Math.floor(stage/8));return l;
  }
  function startEndlessStage(side,stage=1){startGameLevel(endlessLevel(side,stage),{mode:'endless',stage});}
  let bossRushQueue=[];
  function startBossRush(side){
    const max=Math.min(200,save.progress[side]); bossRushQueue=[];
    for(let n=5;n<=max;n+=5){if([5,10,15,20].includes(((n-1)%20)+1))bossRushQueue.push(n);} if(!bossRushQueue.length)bossRushQueue=[5];
    const n=bossRushQueue.shift();startGameLevel(L.generateLevel(side,n),{mode:'bossrush',side});
  }
  function nextBossRush(){if(!bossRushQueue.length){showModal({kicker:'BOSS RUSH COMPLETE',title:'Run cleared',body:'<p>You cleared every boss currently available from campaign progress.</p>',actions:[{label:'MAIN MENU',onClick:()=>showScreen('homeScreen')}]});return;}const n=bossRushQueue.shift();startGameLevel(L.generateLevel(level.side,n),{mode:'bossrush',side:level.side});}
  function dailyLevel(){const d=new Date(),stamp=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000,side=stamp%2?'bird':'pig',n=(Math.abs(Math.floor(stamp*37))%200)+1,l=L.generateLevel(side,n);l.title=`Daily Challenge: ${l.title}`;l.birds=Math.max(3,l.birds-1);return l;}



  // Settings, daily contracts, achievements, and owner tools
  function renderSettings(){
    $('#musicToggle').checked=!!save.settings.music; $('#sfxToggle').checked=!!save.settings.sfx;
    const master=Math.round(save.settings.masterVolume*100),music=Math.round(save.settings.musicVolume*100),sfx=Math.round(save.settings.sfxVolume*100);
    $('#masterVolume').value=master;$('#musicVolume').value=music;$('#sfxVolume').value=sfx;
    $('#masterVolumeValue').textContent=`${master}%`;$('#musicVolumeValue').textContent=`${music}%`;$('#sfxVolumeValue').textContent=`${sfx}%`;
    $('#aimToggle').checked=!!save.settings.aim; $('#motionToggle').checked=!!save.settings.reducedMotion; $('#physicsToggle').checked=!!save.settings.physicsDebug;
  }
  function todayKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function ensureDaily(){
    const key=todayKey(); if(!save.daily||save.daily.key!==key)save.daily={key,clears:0,stars:0,blocks:0,claimed:{},bonusClaimed:false}; return save.daily;
  }
  const achievements=[
    {id:'first-clear',name:'First Impact',desc:'Clear your first level.',goal:1,progress:()=>save.stats.clears,reward:750},
    {id:'clears-25',name:'Campaign Regular',desc:'Clear 25 levels across both sides.',goal:25,progress:()=>save.stats.clears,reward:3500},
    {id:'stars-100',name:'Star Hunter',desc:'Earn 100 total stars.',goal:100,progress:()=>save.stats.stars,reward:5000},
    {id:'bosses-10',name:'Boss Breaker',desc:'Defeat 10 bosses.',goal:10,progress:()=>save.stats.bosses,reward:5000},
    {id:'blocks-250',name:'Demolition Crew',desc:'Break 250 structure blocks.',goal:250,progress:()=>save.stats.blocks,reward:6000},
    {id:'dual-50',name:'Two-Sided War',desc:'Reach level 50 on both Bird and Pig sides.',goal:50,progress:()=>Math.min(save.progress.bird-1,save.progress.pig-1),reward:8500},
    {id:'permanent-5',name:'Permanent Roster',desc:'Own at least one permanent unit on 5 characters.',goal:5,progress:()=>['bird','pig'].reduce((n,side)=>n+Object.values(save.permanent[side]).filter(v=>Number(v)>0).length,0),reward:10000},
    {id:'endless-10',name:'No Finish Line',desc:'Reach Endless Stage 10.',goal:10,progress:()=>Math.max(save.bestEndless.bird||0,save.bestEndless.pig||0),reward:7000}
  ];
  function contractCard(name,desc,value,goal,reward,id){
    const done=value>=goal,claimed=!!ensureDaily().claimed[id],pct=Math.min(100,value/goal*100);
    return `<article class="challenge-card"><h3>${name}</h3><p>${desc}</p><div class="progress"><i style="width:${pct}%"></i></div><footer><span>${Math.min(value,goal)}/${goal}</span><span>${reward.toLocaleString()} coins</span></footer><button class="${done&&!claimed?'primary':'secondary'}" data-contract="${id}" ${done&&!claimed?'':'disabled'}>${claimed?'CLAIMED':done?'CLAIM REWARD':'IN PROGRESS'}</button></article>`;
  }
  function renderChallenges(){
    const d=ensureDaily(), daily=$('#dailyGrid');
    daily.innerHTML=contractCard('Three Clears','Clear any 3 levels today.',d.clears,3,1200,'clears')+contractCard('Six Stars','Earn 6 stars from clears today.',d.stars,6,1400,'stars')+contractCard('Demolition Shift','Break 25 blocks today.',d.blocks,25,1600,'blocks');
    daily.querySelectorAll('[data-contract]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.contract,vals={clears:[d.clears,3,1200],stars:[d.stars,6,1400],blocks:[d.blocks,25,1600]}[id];if(!vals||vals[0]<vals[1]||d.claimed[id])return;d.claimed[id]=true;save.coins+=vals[2];if(Object.keys(d.claimed).length>=3&&!d.bonusClaimed){d.bonusClaimed=true;save.scrap+=5;}persist();renderChallenges();}));
    const grid=$('#achievementGrid');grid.innerHTML='';
    for(const a of achievements){const value=a.progress(),done=value>=a.goal,claimed=!!save.achievements.claimed[a.id],pct=Math.min(100,value/a.goal*100),el=document.createElement('article');el.className='challenge-card';el.innerHTML=`<h3>${a.name}</h3><p>${a.desc}</p><div class="progress"><i style="width:${pct}%"></i></div><footer><span>${Math.min(value,a.goal)}/${a.goal}</span><span>${a.reward.toLocaleString()} coins</span></footer><button class="${done&&!claimed?'primary':'secondary'}" ${done&&!claimed?'':'disabled'}>${claimed?'CLAIMED':done?'CLAIM REWARD':'IN PROGRESS'}</button>`;el.querySelector('button').addEventListener('click',()=>{if(!done||claimed)return;save.achievements.claimed[a.id]=true;save.coins+=a.reward;persist();renderChallenges();});grid.appendChild(el);}
  }
  function renderOwner(){updateWallet();$('#ownerCurrencyAmount').value=$('#ownerCurrency').value==='coins'?100000:10;}
  function grantAllCharacters(){for(const side of ['bird','pig'])for(const ch of C.ROSTERS[side])if(ch.index>0){save.inventory[side][ch.id]=Math.max(save.inventory[side][ch.id]||0,100);save.permanent[side][ch.id]=4;}}

  // QA
  function runQa(){
    $('#qaBig').textContent='TESTING 400';$('#qaDetail').textContent='Checking solvability, collision clearance, 3-star reachability, unique structures, and all twenty block systems.';$('#qaMeter').style.width='15%';$('#qaFailures').textContent='';
    setTimeout(()=>{const r=L.validateAll();$('#qaBig').textContent=`${r.pass}/${r.total} PASS`;$('#qaMeter').style.width=`${r.pass/r.total*100}%`;$('#qaDetail').textContent=r.failures.length?'Some levels failed certification and should not ship.':`${r.uniqueLayouts} unique level structures certified. ${r.blockTypesUsed}/20 block types appear across the campaign, using ${r.layoutFamilies} layout families.`;$('#qaFailures').textContent=r.failures.length?JSON.stringify(r.failures,null,2):`No certification failures.\n3-star thresholds verified reachable on all 400 levels.\nUnique structures: ${r.uniqueLayouts}/400\nBlock types used: ${r.blockTypesUsed}/20\nLayout families: ${r.layoutFamilies}`;},40);
  }

  // Touch-first browser safety: stop iOS text selection, long-press callouts, drag ghosts, gesture zoom, and double-tap zoom inside the game shell.
  for(const eventName of ['contextmenu','selectstart','dragstart','dblclick'])document.addEventListener(eventName,e=>{if(e.target.closest?.('#app'))e.preventDefault();},{passive:false});
  for(const eventName of ['gesturestart','gesturechange','gestureend'])document.addEventListener(eventName,e=>{if(e.target.closest?.('#app'))e.preventDefault();},{passive:false});
  $('#backBtn').addEventListener('click',navigateBack);$('#modalBackBtn').addEventListener('click',()=>$('#modal').classList.add('hidden'));
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();navigateBack();}});

  // Navigation / buttons
  $('#homeBtn').addEventListener('click',()=>{running=false;cancelAnimationFrame(raf);showScreen('homeScreen');});
  $('#soundBtn').addEventListener('click',()=>{save.settings.sfx=!save.settings.sfx;persist();audio.syncVolumes();});
  $('#settingsBtn').addEventListener('click',()=>showScreen('settingsScreen'));
  $('#ownerTopBtn').addEventListener('click',()=>showScreen('ownerScreen'));
  $('#switchSideBtn').addEventListener('click',()=>{campaignSide=campaignSide==='bird'?'pig':'bird';$('#levelPanel').classList.add('hidden');renderCampaign();});
  $('#closeLevelsBtn').addEventListener('click',()=>$('#levelPanel').classList.add('hidden'));
  $('#restartBtn').addEventListener('click',()=>startGameLevel(L.generateLevel(level.side,level.number),modeState));
  $('#quitBtn').addEventListener('click',()=>{running=false;cancelAnimationFrame(raf); if(modeState?.mode==='campaign')openCampaign(level.side);else showScreen('homeScreen');});
  $('#rosterSideBtn').addEventListener('click',()=>{rosterSide=rosterSide==='bird'?'pig':'bird';renderRoster();});
  $('#rerunQaBtn').addEventListener('click',runQa);
  $$('[data-action]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.action;
    if(a==='campaign')openCampaign(b.dataset.side);
    if(a==='roster'){rosterSide='bird';showScreen('rosterScreen');}
    if(a==='melt')showScreen('capsuleScreen');
    if(a==='qa'){showScreen('qaScreen');runQa();}
    if(a==='challenges')showScreen('challengesScreen');
    if(a==='cosmetics')showScreen('cosmeticsScreen');
    if(a==='progression')showScreen('progressionScreen');
    if(a==='endless')chooseSideFor('Endless Run',s=>startEndlessStage(s,1));
    if(a==='bossrush')chooseSideFor('Boss Rush',s=>startBossRush(s));
    if(a==='daily')startGameLevel(dailyLevel(),{mode:'daily'});
  }));


  $('#musicToggle').addEventListener('change',e=>{save.settings.music=e.target.checked;persist();syncMusic();});
  $('#sfxToggle').addEventListener('change',e=>{save.settings.sfx=e.target.checked;persist();audio.syncVolumes();});
  function volumeInput(key,valueId,e){save.settings[key]=+e.target.value/100;$(valueId).textContent=`${e.target.value}%`;persist();audio.syncVolumes();}
  $('#masterVolume').addEventListener('input',e=>volumeInput('masterVolume','#masterVolumeValue',e));
  $('#musicVolume').addEventListener('input',e=>volumeInput('musicVolume','#musicVolumeValue',e));
  $('#sfxVolume').addEventListener('input',e=>volumeInput('sfxVolume','#sfxVolumeValue',e));
  $('#aimToggle').addEventListener('change',e=>{save.settings.aim=e.target.checked;persist();});
  $('#motionToggle').addEventListener('change',e=>{save.settings.reducedMotion=e.target.checked;persist();});
  $('#physicsToggle').addEventListener('change',e=>{save.settings.physicsDebug=e.target.checked;persist();});
  $('#ownerAccessBtn').addEventListener('click',()=>{const code=prompt('Enter owner access code');if(code==='CRASHFLOCKDEV'){save.owner=true;persist();showScreen('ownerScreen');}else if(code!==null)alert('Incorrect owner code.');});
  $('#exportSaveBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='crashflock-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
  $('#importSaveBtn').addEventListener('click',()=>$('#importSaveInput').click());
  $('#importSaveInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||!data.progress||!data.settings)throw Error('Invalid save structure');localStorage.setItem('crashflock-save',JSON.stringify(data));location.reload();}catch{alert('That file is not a valid Crashflock save.');}finally{e.target.value='';}});
  $('#resetSaveBtn').addEventListener('click',()=>{if(confirm('Reset all Crashflock progress and settings?')){localStorage.removeItem('crashflock-save');location.reload();}});
  $('#ownerUnlockBtn').addEventListener('click',()=>{save.progress.bird=201;save.progress.pig=201;persist();});
  $('#ownerCharsBtn').addEventListener('click',()=>{grantAllCharacters();persist();});
  $('#ownerCosmeticsBtn').addEventListener('click',()=>{save.cosmetics.owned.trails=P.TRAILS.map(x=>x.id);save.cosmetics.owned.launchers=P.LAUNCHERS.map(x=>x.id);save.cosmetics.owned.impacts=P.IMPACTS.map(x=>x.id);persist();});
  $('#ownerCurrency').addEventListener('change',()=>renderOwner());
  function ownerCurrencyChange(mode){const key=$('#ownerCurrency').value,amount=Math.max(0,Math.floor(Number($('#ownerCurrencyAmount').value)||0));if(!['coins','scrap'].includes(key))return;save[key]=mode==='set'?amount:Math.max(0,(Number(save[key])||0)+amount);persist();renderOwner();}
  $('#ownerCurrencyAdd').addEventListener('click',()=>ownerCurrencyChange('add'));$('#ownerCurrencySet').addEventListener('click',()=>ownerCurrencyChange('set'));
  $('#ownerThreeStarBtn').addEventListener('click',()=>startGameLevel(L.generateLevel('bird',1),{mode:'campaign'}));
  $('#ownerQaBtn').addEventListener('click',()=>{showScreen('qaScreen');runQa();});

  // QA hooks used by the included build test and screenshot pass.
  window.__CRASH_QA = {
    validate:()=>L.validateAll(),
    openLevel:(side,n)=>{startGameLevel(L.generateLevel(side,n),{mode:'campaign'});return true;},
    openRoster:(side='bird')=>{rosterSide=side;showScreen('rosterScreen');return true;},
    openCampaign:(side='bird')=>{openCampaign(side);return true;},
    openMelt:()=>{showScreen('capsuleScreen');return true;},
    fireCertified:(goalIndex=0)=>{if(!level||shotActive)return false;const goals=boss?boss.weak:targets;const target=goals[goalIndex];if(!target)return false;const s=L.correctedShot(level,target),ch=getSelectedChar(),scale=5.35*ch.power;dragPos={x:L.ORIGIN.x-s.vx/scale,y:L.ORIGIN.y-s.vy/scale};fireFromDrag();return true;},
    selectCharacter:(index)=>{if(!level||shotActive)return false;const ch=C.ROSTERS[level.side][index];if(!ch||!isCharAvailable(ch))return false;selectedCharIndex=index;updateGameHud();return true;},
    state:()=>({screen:currentScreen,level:level?{side:level.side,number:level.number,type:level.type,title:level.title,layout:level.layoutName,mechanic:level.mechanic}:null,score,shots:shotIndex,shotActive,bossHp:boss?boss.hp:null,remainingTargets:targets.filter(t=>!t.dead).length,remainingCores:cores.filter(c=>!c.dead).length,lineup:level?.lineup?.slice(),loadedCharacter:getSelectedChar()?.name,defaultCharacter:C.ROSTERS[level?.side||'bird']?.[defaultCharIndexForShot()]?.name,musicTrack:audio.currentTrack,cosmetics:{...save.cosmetics.equipped},totalStars:totalStars(),scrap:save.scrap,melt:{...save.melt},permanent:save.permanent,inventory:save.inventory,starTargets:level?.stars?.slice()})
  };

  // PWA registration is intentionally optional; the game also works as plain static GitHub Pages files.
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
  showScreen('homeScreen');
})();
