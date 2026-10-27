'use strict';

(() => {
  const TRAILS = [
    {id:'none',name:'Clean Flight',desc:'No added trail.',coins:0,scrap:0,style:'none'},
    {id:'ember',name:'Ember Wake',desc:'Hot sparks peel away behind the projectile.',coins:3000,scrap:2,style:'ember'},
    {id:'frost',name:'Frost Shards',desc:'Cold fragments tumble through the flight path.',coins:4500,scrap:3,style:'frost'},
    {id:'storm',name:'Storm Thread',desc:'Electric needles flash along the trajectory.',coins:6500,scrap:4,style:'storm'},
    {id:'crystal',name:'Crystal Dust',desc:'Bright mineral flecks scatter in the wake.',coins:8000,scrap:5,style:'crystal'},
    {id:'leaf',name:'Canopy Drift',desc:'Small leaf fragments spiral behind the shot.',coins:9000,scrap:5,style:'leaf'},
    {id:'honey',name:'Honey Drip',desc:'Golden droplets stretch and fall behind the projectile.',coins:11000,scrap:6,style:'honey'},
    {id:'magnet',name:'Magnetic Arc',desc:'Blue-white arc fragments snap across the trail.',coins:13000,scrap:7,style:'magnet'},
    {id:'bone',name:'Bone Splinters',desc:'Pale splinters tumble from the projectile path.',coins:15000,scrap:8,style:'bone'},
    {id:'portal',name:'Portal Echo',desc:'Short-lived rings mark where the projectile was.',coins:18000,scrap:10,style:'portal'},
    {id:'royal',name:'Royal Streamers',desc:'Gold ribbon fragments follow high-skill shots.',coins:22000,scrap:12,style:'royal'},
    {id:'void',name:'Final Frontier',desc:'Dark motes with a sharp red core trail the shot.',coins:30000,scrap:18,style:'void'}
  ];

  const LAUNCHERS = [
    {id:'timber',name:'Field Timber',desc:'The original launcher finish.',coins:0,scrap:0,material:'wood'},
    {id:'steel',name:'Riveted Steel',desc:'Industrial plates and hard rivet texture.',coins:5500,scrap:3,material:'rivetedmetal'},
    {id:'crystal',name:'Crystal Vein',desc:'Cut crystal texture across the launcher frame.',coins:8000,scrap:5,material:'crystal'},
    {id:'frost',name:'Frostbound',desc:'Ice texture with pale fracture marks.',coins:9500,scrap:6,material:'ice'},
    {id:'honey',name:'Honey Sealed',desc:'Amber resin coats the launcher surface.',coins:11000,scrap:7,material:'honey'},
    {id:'bone',name:'Bone Carved',desc:'Pale carved plating over the launcher frame.',coins:14000,scrap:9,material:'bone'},
    {id:'magnet',name:'Magnet Works',desc:'Charged industrial texture with blue accents.',coins:17500,scrap:11,material:'magnet'},
    {id:'portal',name:'Portal Forged',desc:'Late-game teleporter texture over the full frame.',coins:25000,scrap:16,material:'teleporter'}
  ];

  const IMPACTS = [
    {id:'classic',name:'Impact Dust',desc:'A compact demolition burst.',coins:0,scrap:0,style:'classic'},
    {id:'glass',name:'Shard Bloom',desc:'Angular glass-like fragments on impact.',coins:4000,scrap:2,style:'glass'},
    {id:'spark',name:'Forge Sparks',desc:'Warm metal sparks spray away from collisions.',coins:6500,scrap:4,style:'spark'},
    {id:'snow',name:'Snow Burst',desc:'Soft white fragments scatter from a hit.',coins:8500,scrap:5,style:'snow'},
    {id:'storm',name:'Storm Crack',desc:'Short electric branches flare from the contact point.',coins:12000,scrap:7,style:'storm'},
    {id:'crystal',name:'Prism Break',desc:'Bright crystal fragments fan outward.',coins:14500,scrap:9,style:'crystal'},
    {id:'royal',name:'Royal Flash',desc:'Gold fragments and a sharp ring mark a heavy hit.',coins:19000,scrap:12,style:'royal'},
    {id:'void',name:'Void Fracture',desc:'Dark fragments collapse into a red center.',coins:28000,scrap:18,style:'void'}
  ];

  const VAULT = [
    {stars:25,coins:2500,scrap:2,name:'First Cache'},
    {stars:75,coins:5000,scrap:4,name:'Bronze Cache'},
    {stars:150,coins:9000,scrap:7,name:'Silver Cache'},
    {stars:300,coins:16000,scrap:11,name:'Gold Cache'},
    {stars:500,coins:26000,scrap:16,name:'Citadel Cache'},
    {stars:750,coins:38000,scrap:22,name:'Storm Cache'},
    {stars:1000,coins:55000,scrap:30,name:'Crown Cache'},
    {stars:1200,coins:90000,scrap:45,name:'Perfect Campaign Cache'}
  ];

  const MASTERY_THRESHOLDS = [0,70,180,340,560,840,1200,1650,2200,2900,3800];

  function masteryLevel(xp){
    let level=0;
    for(let i=1;i<MASTERY_THRESHOLDS.length;i++) if(xp>=MASTERY_THRESHOLDS[i]) level=i;
    return level;
  }

  function totalStars(save){
    let total=0;
    for(const side of ['bird','pig']) for(const v of Object.values(save.stars?.[side]||{})) total+=Number(v)||0;
    return total;
  }

  window.CRASH_PROGRESSION={TRAILS,LAUNCHERS,IMPACTS,VAULT,MASTERY_THRESHOLDS,masteryLevel,totalStars};
})();
