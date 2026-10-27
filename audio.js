'use strict';

(() => {
  class CrashAudio {
    constructor(getSettings){
      this.getSettings=getSettings;
      this.ctx=null;
      this.masterGain=null;
      this.musicGain=null;
      this.sfxGain=null;
      this.limiter=null;
      this.elements={};
      this.elementSources={};
      this.currentTrack='';
      this.sfxBuffers={};
      this.readyPromise=null;
      this.trackFiles={menu:'music-menu.wav',level:'music-level.wav',boss:'music-boss.wav',final:'music-final-boss.wav'};
      this.sfxFiles={launch:'launch.wav',impact:'impact.wav',shatter:'shatter.wav',victory:'victory.wav',boss:'boss-hit.wav'};
    }
    async ensure(){
      if(this.readyPromise) return this.readyPromise;
      this.readyPromise=this._init();
      return this.readyPromise;
    }
    async _init(){
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC) return false;
      this.ctx=new AC();
      this.masterGain=this.ctx.createGain();
      this.musicGain=this.ctx.createGain();
      this.sfxGain=this.ctx.createGain();
      this.limiter=this.ctx.createDynamicsCompressor();
      this.limiter.threshold.value=-8;
      this.limiter.knee.value=3;
      this.limiter.ratio.value=18;
      this.limiter.attack.value=.002;
      this.limiter.release.value=.16;
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.limiter);
      this.limiter.connect(this.ctx.destination);
      for(const [key,file] of Object.entries(this.trackFiles)){
        const el=new Audio(file);el.loop=true;el.preload='auto';el.playsInline=true;el.volume=1;
        this.elements[key]=el;
        const src=this.ctx.createMediaElementSource(el);src.connect(this.musicGain);this.elementSources[key]=src;
      }
      await Promise.all(Object.entries(this.sfxFiles).map(async([key,file])=>{
        try{const res=await fetch(file);const arr=await res.arrayBuffer();this.sfxBuffers[key]=await this.ctx.decodeAudioData(arr);}catch{}
      }));
      this.syncVolumes();
      return true;
    }
    async resume(){
      await this.ensure();
      if(this.ctx?.state==='suspended') try{await this.ctx.resume();}catch{}
    }
    syncVolumes(){
      if(!this.ctx) return;
      const s=this.getSettings();
      const master=Math.max(0,Math.min(20,Number(s.masterVolume ?? 1)));
      const music=Math.max(0,Math.min(20,Number(s.musicVolume ?? .55)));
      const sfx=Math.max(0,Math.min(20,Number(s.sfxVolume ?? .62)));
      this.masterGain.gain.setTargetAtTime(master,this.ctx.currentTime,.02);
      this.musicGain.gain.setTargetAtTime(s.music?music:0,this.ctx.currentTime,.02);
      this.sfxGain.gain.setTargetAtTime(s.sfx?sfx:0,this.ctx.currentTime,.02);
    }
    async playSfx(name){
      const s=this.getSettings();if(!s.sfx)return;
      await this.resume();this.syncVolumes();
      const buf=this.sfxBuffers[name];if(!buf||!this.ctx)return;
      const source=this.ctx.createBufferSource();source.buffer=buf;source.connect(this.sfxGain);source.start();
    }
    async playMusic(kind){
      const s=this.getSettings();if(!s.music){this.stopMusic();return;}
      await this.resume();this.syncVolumes();
      const wanted=this.elements[kind]?kind:'level';
      if(this.currentTrack===wanted&&!this.elements[wanted].paused)return;
      for(const [k,el] of Object.entries(this.elements)){if(k!==wanted){el.pause();el.currentTime=0;}}
      const el=this.elements[wanted];this.currentTrack=wanted;try{await el.play();}catch{}
    }
    stopMusic(){for(const el of Object.values(this.elements)){el.pause();el.currentTime=0;}this.currentTrack='';}
  }
  window.CrashAudio=CrashAudio;
})();
