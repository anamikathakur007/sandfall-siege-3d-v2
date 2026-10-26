(() => {
'use strict';
const mount = document.getElementById('gameMount');
if (!mount || typeof THREE === 'undefined') {
  if (mount) mount.innerHTML = '<div style="padding:40px;color:white">Three.js could not load. Check your internet connection and refresh.</div>';
  return;
}

const ui = {
  wrap: document.getElementById('gameWrap'), menu: document.getElementById('menu'), start: document.getElementById('startBtn'),
  hud: document.getElementById('hud'), pause: document.getElementById('pausePanel'), end: document.getElementById('endPanel'),
  enemyCount: document.getElementById('enemyCount'), nearest: document.getElementById('nearestEnemy'), objective: document.getElementById('objectiveText'), health: document.getElementById('healthText'),
  healthBar: document.getElementById('healthBar'), mag: document.getElementById('ammoMag'), reserve: document.getElementById('ammoReserve'),
  reload: document.getElementById('reloadText'), hit: document.getElementById('hitMarker'), dmg: document.getElementById('damageVignette'),
  endTitle: document.getElementById('endTitle'), endEyebrow: document.getElementById('endEyebrow'), endStats: document.getElementById('endStats'),
  scoreInput: document.getElementById('scoreInput'), restart: document.getElementById('restartBtn'),
  first: document.getElementById('firstPersonBtn'), third: document.getElementById('thirdPersonBtn'),
  menuFirst: document.getElementById('menuFirstPerson'), menuThird: document.getElementById('menuThirdPerson')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x68b5ed);
scene.fog = new THREE.Fog(0xb9ddf3, 90, 260);
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 500);
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
mount.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xd8efff, 0x80613f, 1.15); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1cf, 1.45); sun.position.set(-55,85,20); sun.castShadow=true; sun.shadow.mapSize.set(1536,1536); sun.shadow.camera.left=-110; sun.shadow.camera.right=110; sun.shadow.camera.top=110; sun.shadow.camera.bottom=-110; scene.add(sun);

const world = new THREE.Group(); scene.add(world);
const colliders = [], enemies = [], tracers = [], effects = [];
const raycaster = new THREE.Raycaster(), clock = new THREE.Clock(), keys = Object.create(null);
const player = {
  pos:new THREE.Vector3(0,1.72,43), vel:new THREE.Vector3(), yaw:Math.PI, pitch:0,
  health:100, mag:30, reserve:150, maxMag:30, reloading:false, reloadTimer:0,
  grounded:true, ads:false, sprint:false, fireCooldown:0, alive:true, score:0, kills:0, shots:0, hits:0, bob:0,
  view:'first'
};
let locked=false, started=false, gameEnded=false, wave=1, waveDelay=0, elapsed=0, lastDamage=0, firing=false;

const mat = (color, rough=.85, metal=.05, map=null) => new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,map});
function textureCanvas(base, mortar, crack){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,256,256);
  for(let yy=0;yy<256;yy+=32){for(let xx=-32;xx<256;xx+=64){const ox=(yy/32)%2?32:0;x.fillStyle=`rgba(255,255,255,${.025+Math.random()*.035})`;x.fillRect(xx+ox+2,yy+2,60,28);x.strokeStyle=mortar;x.lineWidth=2;x.strokeRect(xx+ox,yy,64,32)}}
  x.strokeStyle=crack;x.lineWidth=1.4;for(let i=0;i<26;i++){let px=Math.random()*256,py=Math.random()*256;x.beginPath();x.moveTo(px,py);for(let k=0;k<4;k++){px+=(Math.random()-.5)*22;py+=4+Math.random()*14;x.lineTo(px,py)}x.stroke()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.4,1.4);t.anisotropy=4;return t;
}
const stoneTex=textureCanvas('#aa967c','rgba(67,54,41,.26)','rgba(74,54,39,.32)');
const darkTex=textureCanvas('#7b6b58','rgba(40,35,30,.32)','rgba(37,29,23,.4)');
const sandTex=textureCanvas('#cfaa6c','rgba(145,111,63,.12)','rgba(145,111,63,.07)');sandTex.repeat.set(12,12);
const sandMat=mat(0xffffff,1,0,sandTex), stone=mat(0xffffff,.98,0,stoneTex), stone2=mat(0xd5c1a0,.96,0,darkTex), darkStone=mat(0x786957,1,0,darkTex), metal=mat(0x1f2529,.28,.82), gunBlack=mat(0x202427,.26,.9), gunPoly=mat(0x2f3438,.62,.18), wood=mat(0x5a3924,.7,.05);

function addBox(x,y,z,w,h,d,m=stone,collider=true,rotY=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.rotation.y=rotY;mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);if(collider)colliders.push(new THREE.Box3().setFromObject(mesh));return mesh}
function addColumn(x,z,h=8,r=.7){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.9,r*1.18,h,14),stone);mesh.position.set(x,h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);colliders.push(new THREE.Box3().setFromObject(mesh));return mesh}
function addArch(x,z,rot=0,scale=1){const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=rot;world.add(group);const parts=[];const box=(px,py,pz,w,h,d)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),stone);m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;group.add(m);parts.push(m)};box(-2.5*scale,3.1*scale,0,1.25*scale,6.2*scale,1.25*scale);box(2.5*scale,3.1*scale,0,1.25*scale,6.2*scale,1.25*scale);box(0,6.2*scale,0,6.2*scale,1.1*scale,1.25*scale);for(const p of parts)colliders.push(new THREE.Box3().setFromObject(p));return group}
function rubble(x,z,n=12){for(let i=0;i<n;i++){const s=.22+Math.random()*.95;const mesh=new THREE.Mesh(new THREE.BoxGeometry(s,s*.55,s*(.8+Math.random())),Math.random()>.5?stone:stone2);mesh.position.set(x+(Math.random()-.5)*7,s*.25,z+(Math.random()-.5)*7);mesh.rotation.set(Math.random(),Math.random()*Math.PI,Math.random());mesh.castShadow=true;world.add(mesh)}}
function brokenWall(x,z,w,h,rot=0){const pieces=6;for(let i=0;i<pieces;i++){const pw=w/pieces;const ph=h*(.48+Math.random()*.52);if(Math.random()<.17)continue;addBox(x+(i-(pieces-1)/2)*pw*Math.cos(rot),ph/2,z-(i-(pieces-1)/2)*pw*Math.sin(rot),pw*.93,ph,.7,stone,true,rot)}}
function addWindowWall(x,z,w,h,rot=0){addBox(x,h/2,z,w,h,.8,stone,true,rot);for(let i=-1;i<=1;i++){const px=x+i*3*Math.cos(rot),pz=z-i*3*Math.sin(rot);const recess=new THREE.Mesh(new THREE.BoxGeometry(1.3,2.2,.84),mat(0x352d25,1,0));recess.position.set(px,3,pz);recess.rotation.y=rot;world.add(recess)}}

function buildWorld(){
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(360,360),sandMat);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);
  // Main ruined palace, deliberately close enough that combat starts quickly.
  brokenWall(-20,12,28,8,0); brokenWall(20,12,28,8,0); addArch(0,12,0,1.15);
  brokenWall(-36,-16,62,9,Math.PI/2); brokenWall(36,-16,62,9,Math.PI/2); brokenWall(0,-52,72,10,0);
  addWindowWall(-22,-44,20,10,0); addWindowWall(22,-44,20,11,0);
  addArch(-11,-44,0,.8); addArch(11,-44,0,.8);
  addBox(-29,8.5,-45,12,17,11,stone2); addBox(29,10,-45,13,20,11,stone2);
  addBox(0,13,-68,26,26,18,darkStone); brokenWall(0,-57,26,7,0);
  for(const x of [-29,-20,-11,11,20,29]) addColumn(x,-33,7.8,.65);
  for(const x of [-28,-17,-6,6,17,28]) addColumn(x,5,6.4,.55);
  // Courtyard cover, balconies and collapsed palace sections.
  addBox(-17,2.2,-3,10,4.4,3.3,darkStone); addBox(16,2,-8,11,4,3.3,darkStone);
  addBox(-9,1.4,-21,7,2.8,3,stone); addBox(10,1.25,-27,8,2.5,3,stone);
  addBox(-24,2,-31,9,4,5,stone); addBox(24,2,-34,9,4,5,stone);
  addBox(-22,6,-45,7,1,5,darkStone); addBox(22,7.5,-45,8,1,5,darkStone);
  rubble(-12,3,18); rubble(19,-18,16); rubble(-22,-38,14); rubble(3,-52,20);
  for(let i=0;i<45;i++){const r=.35+Math.random()*1.45;const mesh=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),mat(0x91734f,1,0));mesh.position.set((Math.random()-.5)*145,r*.32,(Math.random()-.5)*150);mesh.scale.y=.45;mesh.rotation.y=Math.random()*Math.PI;world.add(mesh)}
  // distant silhouettes for large-city / palace scale
  addBox(-62,15,-92,18,30,18,stone2,false);addBox(61,18,-95,22,36,20,darkStone,false);addBox(-28,11,-103,17,22,15,stone2,false);
}
buildWorld();

// Detailed first-person rifle: fictional but proportioned like a real assault rifle.
const gun=new THREE.Group();camera.add(gun);scene.add(camera);
function gm(geo,material,x,y,z,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;gun.add(m);return m}
const receiver=gm(new THREE.BoxGeometry(.25,.24,.86),gunBlack,.31,-.27,-.94,-.02);
gm(new THREE.BoxGeometry(.22,.18,.55),gunPoly,.31,-.20,-1.48,-.01);
gm(new THREE.CylinderGeometry(.033,.038,.78,12),metal,.31,-.19,-1.99,Math.PI/2);
gm(new THREE.CylinderGeometry(.06,.06,.18,12),metal,.31,-.19,-2.42,Math.PI/2);
gm(new THREE.BoxGeometry(.22,.28,.46),wood,.31,-.30,-.28,.04);
gm(new THREE.BoxGeometry(.16,.46,.28),gunPoly,.30,-.52,-.94,.22);
gm(new THREE.BoxGeometry(.115,.36,.16),gunBlack,.30,-.57,-1.15,.35);
gm(new THREE.BoxGeometry(.12,.34,.16),gunPoly,.30,-.49,-.63,-.23);
gm(new THREE.BoxGeometry(.09,.11,.52),gunBlack,.31,-.07,-1.11,0);
gm(new THREE.BoxGeometry(.05,.16,.06),metal,.31,.02,-1.36,0);
gm(new THREE.BoxGeometry(.05,.14,.06),metal,.31,.00,-.84,0);
const handMat=mat(0xb77f5c,.9,0);gm(new THREE.BoxGeometry(.18,.19,.38),handMat,.18,-.47,-.61,0,0,.22);gm(new THREE.BoxGeometry(.18,.19,.40),handMat,.23,-.40,-1.43,0,0,-.12);
const muzzle=new THREE.PointLight(0xffb45c,0,6,2);muzzle.position.set(.31,-.18,-2.5);gun.add(muzzle);

// Third-person soldier body.
const avatar=new THREE.Group();world.add(avatar);
const uniform=mat(0x6b735d,.82,0), vest=mat(0x343b32,.65,.08), boots=mat(0x262522,.85,0), skin=handMat;
function av(geo,material,x,y,z,rx=0,ry=0,rz=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;avatar.add(m);return m}
av(new THREE.BoxGeometry(.62,.88,.34),uniform,0,1.55,0);av(new THREE.BoxGeometry(.7,.52,.40),vest,0,1.6,-.03);av(new THREE.SphereGeometry(.24,14,10),skin,0,2.22,0);av(new THREE.SphereGeometry(.27,14,8,0,Math.PI*2,0,Math.PI*.58),darkStone,0,2.32,0);
av(new THREE.BoxGeometry(.22,.88,.24),uniform,-.18,.65,0);av(new THREE.BoxGeometry(.22,.88,.24),uniform,.18,.65,0);av(new THREE.BoxGeometry(.25,.18,.42),boots,-.18,.13,-.08);av(new THREE.BoxGeometry(.25,.18,.42),boots,.18,.13,-.08);
av(new THREE.BoxGeometry(.19,.80,.19),uniform,-.43,1.52,-.05,-.75,0,.05);av(new THREE.BoxGeometry(.19,.80,.19),uniform,.43,1.52,-.05,-.75,0,-.05);
const avatarGun=new THREE.Mesh(new THREE.BoxGeometry(.13,.14,.98),gunBlack);avatarGun.position.set(.16,1.47,-.52);avatarGun.rotation.x=-.12;avatar.add(avatarGun);

function enemyMarker(){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.fillStyle='#ff3e32';x.beginPath();x.moveTo(32,6);x.lineTo(57,52);x.lineTo(7,52);x.closePath();x.fill();x.fillStyle='white';x.font='bold 25px Arial';x.textAlign='center';x.fillText('!',32,43);const t=new THREE.CanvasTexture(c);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthTest:false}));s.scale.set(.75,.75,.75);s.position.y=3.05;s.renderOrder=99;return s}
function makeEnemy(x,z,level=1){
  const g=new THREE.Group();g.position.set(x,0,z);world.add(g);const u=mat(level>1?0x665440:0x515846,.82,0), sk=mat(0x9f6f50,.9,0);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.68,1.05,.34),u);torso.position.y=1.55;g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.24,12,8),sk);head.position.y=2.28;g.add(head);
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(.27,12,7,0,Math.PI*2,0,Math.PI*.58),darkStone);helmet.position.y=2.36;g.add(helmet);
  for(const sx of [-.19,.19]){const l=new THREE.Mesh(new THREE.BoxGeometry(.22,.9,.24),u);l.position.set(sx,.62,0);g.add(l)}
  for(const sx of [-.47,.47]){const a=new THREE.Mesh(new THREE.BoxGeometry(.2,.82,.2),u);a.position.set(sx,1.55,-.13);a.rotation.x=-.7;g.add(a)}
  const rifle=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.98),gunBlack);rifle.position.set(0,1.46,-.56);g.add(rifle);g.add(enemyMarker());
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.enemyGroup=g}});
  g.userData={health:level>1?150:100,speed:1.05+Math.random()*.32,cooldown:.5+Math.random(),alive:true,level};enemies.push(g);return g;
}
function spawnWave(num){
  // Close, readable enemy locations. They still spread through the palace instead of hiding far away.
  const spawns=num===1?[[-15,0],[14,-5],[-6,-18],[17,-22],[-20,-28],[5,-33]]:[[-24,-4],[23,-7],[-15,-17],[15,-18],[-26,-29],[27,-31],[-9,-40],[10,-41]];
  spawns.forEach((p,i)=>makeEnemy(p[0]+(Math.random()-.5)*1.5,p[1]+(Math.random()-.5)*1.5,num>1&&i%4===0?2:1));
  ui.objective.textContent=num===1?'Clear the palace courtyard':'Stop the counterattack';updateHUD();
}
spawnWave(1);

function updateHUD(){
  const alive=enemies.filter(e=>e.userData.alive);ui.enemyCount.textContent=alive.length;ui.health.textContent=Math.max(0,Math.ceil(player.health));ui.healthBar.style.width=Math.max(0,player.health)+'%';ui.mag.textContent=player.mag;ui.reserve.textContent=player.reserve;ui.reload.textContent=player.reloading?'RELOADING…':'';
  if(alive.length){const nearest=alive.reduce((a,b)=>a.position.distanceTo(player.pos)<b.position.distanceTo(player.pos)?a:b);const d=Math.round(nearest.position.distanceTo(player.pos));const v=nearest.position.clone().sub(player.pos);const bearing=Math.atan2(v.x,v.z)-player.yaw;const dir=Math.abs(Math.sin(bearing))<.45?'AHEAD':Math.sin(bearing)>0?'RIGHT':'LEFT';ui.nearest.textContent=`${d}m · ${dir}`;} else ui.nearest.textContent='CLEAR';
}
function collides(pos){const r=.38,feet=new THREE.Box3(new THREE.Vector3(pos.x-r,.05,pos.z-r),new THREE.Vector3(pos.x+r,1.82,pos.z+r));return colliders.some(b=>feet.intersectsBox(b))}
function addTracer(a,b,color=0xffe4a6){const geo=new THREE.BufferGeometry().setFromPoints([a,b]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.9}));scene.add(line);tracers.push({obj:line,life:.06})}
function impact(point){const spark=new THREE.Mesh(new THREE.SphereGeometry(.045,6,6),new THREE.MeshBasicMaterial({color:0xffd08a}));spark.position.copy(point);scene.add(spark);effects.push({obj:spark,life:.15})}
function showHit(){ui.hit.classList.add('show');setTimeout(()=>ui.hit.classList.remove('show'),90)}
function playTone(freq,dur,vol=.04,type='square'){try{const ctx=playTone.ctx||(playTone.ctx=new (window.AudioContext||window.webkitAudioContext)());const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);o.connect(g).connect(ctx.destination);o.start();o.stop(ctx.currentTime+dur)}catch(e){}}
function shoot(){
  if(!locked||!player.alive||player.reloading||player.fireCooldown>0)return;if(player.mag<=0){playTone(80,.08,.025);startReload();return}
  player.mag--;player.shots++;player.fireCooldown=.105;player.pitch=Math.min(1.15,player.pitch+.011+Math.random()*.007);muzzle.intensity=5;setTimeout(()=>muzzle.intensity=0,35);playTone(88,.045,.05,'sawtooth');
  const origin=camera.getWorldPosition(new THREE.Vector3()),dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);dir.x+=(Math.random()-.5)*(player.ads?.005:.014);dir.y+=(Math.random()-.5)*(player.ads?.005:.014);dir.normalize();raycaster.set(origin,dir);raycaster.far=140;
  const hitables=[];enemies.forEach(e=>{if(e.userData.alive)e.traverse(o=>{if(o.isMesh)hitables.push(o)})});world.traverse(o=>{if(o.isMesh&&o!==avatarGun&&!avatar.children.includes(o))hitables.push(o)});
  const hits=raycaster.intersectObjects(hitables,false);let end=origin.clone().add(dir.clone().multiplyScalar(120));
  if(hits.length){const h=hits[0];end.copy(h.point);const eg=h.object.userData.enemyGroup;if(eg&&eg.userData.alive){let dmg=36;if(h.point.y-eg.position.y>2.02)dmg=100;eg.userData.health-=dmg;player.hits++;showHit();if(eg.userData.health<=0)killEnemy(eg,dmg>=100)}else impact(h.point)}addTracer(origin.clone().add(dir.clone().multiplyScalar(.7)),end);updateHUD();
}
function killEnemy(e,headshot){if(!e.userData.alive)return;e.userData.alive=false;player.kills++;player.score+=headshot?250:150;e.rotation.z=(Math.random()>.5?1:-1)*1.35;e.position.y=.15;setTimeout(()=>{if(e.parent)e.parent.remove(e)},1300);updateHUD()}
function startReload(){if(player.reloading||player.mag===player.maxMag||player.reserve<=0||!player.alive)return;player.reloading=true;player.reloadTimer=1.5;updateHUD()}
function finishReload(){const need=player.maxMag-player.mag,take=Math.min(need,player.reserve);player.mag+=take;player.reserve-=take;player.reloading=false;updateHUD()}
function enemyShoot(e){if(!player.alive)return;const from=e.position.clone().add(new THREE.Vector3(0,1.5,0)),to=player.pos.clone(),dist=from.distanceTo(to),accuracy=Math.max(.32,.88-dist/80),miss=new THREE.Vector3((Math.random()-.5)*(1-accuracy)*5,(Math.random()-.5)*(1-accuracy)*3,(Math.random()-.5)*(1-accuracy)*5),aim=to.clone().add(miss);addTracer(from,aim,0xff735d);if(Math.random()<accuracy*.64)damagePlayer(6+(e.userData.level-1)*3)}
function damagePlayer(n){if(!player.alive)return;player.health-=n;lastDamage=elapsed;ui.dmg.classList.add('show');setTimeout(()=>ui.dmg.classList.remove('show'),120);updateHUD();if(player.health<=0)endGame(false)}
function updateEnemies(dt){const alive=enemies.filter(e=>e.userData.alive);alive.forEach(e=>{const d=e.position.distanceTo(player.pos),toP=player.pos.clone().sub(e.position);toP.y=0;e.rotation.y=Math.atan2(toP.x,toP.z);if(d>10){const step=toP.normalize().multiplyScalar(e.userData.speed*dt),np=e.position.clone().add(step);if(!collides(new THREE.Vector3(np.x,1.7,np.z)))e.position.copy(np)}if(d<43){e.userData.cooldown-=dt;if(e.userData.cooldown<=0){enemyShoot(e);e.userData.cooldown=(e.userData.level>1?.95:1.25)+Math.random()*.7}}});if(alive.length===0&&!gameEnded){if(wave===1){wave=2;waveDelay+=dt;if(waveDelay>2.2){spawnWave(2);waveDelay=0}}else endGame(true)}}

function setView(mode){player.view=mode;const first=mode==='first';gun.visible=first;avatar.visible=!first;ui.first.classList.toggle('active',first);ui.third.classList.toggle('active',!first);ui.menuFirst.classList.toggle('active',first);ui.menuThird.classList.toggle('active',!first)}
function toggleView(){setView(player.view==='first'?'third':'first')}
setView('first');

function updatePlayer(dt){
  if(!locked||!player.alive)return;
  const forward=new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw)).normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).negate();
  let move=new THREE.Vector3();if(keys.ArrowUp)move.add(forward);if(keys.ArrowDown)move.sub(forward);if(keys.ArrowRight)move.add(right);if(keys.ArrowLeft)move.sub(right);const moving=move.lengthSq()>0;if(moving)move.normalize();
  player.sprint=!!(keys.ShiftLeft||keys.ShiftRight)&&moving&&!player.ads;const speed=player.sprint?8.2:5.45,desired=move.multiplyScalar(speed);player.vel.x=THREE.MathUtils.lerp(player.vel.x,desired.x,1-Math.pow(.001,dt));player.vel.z=THREE.MathUtils.lerp(player.vel.z,desired.z,1-Math.pow(.001,dt));
  if(keys.Space&&player.grounded){player.vel.y=5.4;player.grounded=false}player.vel.y-=13*dt;
  let next=player.pos.clone();next.x+=player.vel.x*dt;if(!collides(next))player.pos.x=next.x;else player.vel.x=0;next.copy(player.pos);next.z+=player.vel.z*dt;if(!collides(next))player.pos.z=next.z;else player.vel.z=0;player.pos.y+=player.vel.y*dt;if(player.pos.y<=1.72){player.pos.y=1.72;player.vel.y=0;player.grounded=true}
  player.pos.x=THREE.MathUtils.clamp(player.pos.x,-69,69);player.pos.z=THREE.MathUtils.clamp(player.pos.z,-82,58);
  avatar.position.set(player.pos.x,0,player.pos.z);avatar.rotation.y=player.yaw;
  if(moving&&player.grounded)player.bob+=dt*(player.sprint?13:9);const bob=Math.sin(player.bob)*.016*(player.ads?.3:1);
  if(player.view==='first'){
    camera.position.copy(player.pos);camera.rotation.order='YXZ';camera.rotation.y=player.yaw;camera.rotation.x=player.pitch;
    receiver.position.y=-.27+bob;gun.position.x=0;
  } else {
    const aimQuat=new THREE.Quaternion().setFromEuler(new THREE.Euler(player.pitch,player.yaw,0,'YXZ'));const back=new THREE.Vector3(0,1.25,4.7).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),player.yaw));const target=player.pos.clone().add(new THREE.Vector3(0,.45,0));camera.position.copy(target).add(back);camera.quaternion.copy(aimQuat);avatar.visible=true;
  }
  player.fireCooldown=Math.max(0,player.fireCooldown-dt);if(player.reloading){player.reloadTimer-=dt;gun.rotation.z=Math.sin((1.5-player.reloadTimer)*4)*.15;if(player.reloadTimer<=0){gun.rotation.z=0;finishReload()}}else gun.rotation.z=THREE.MathUtils.lerp(gun.rotation.z,0,dt*8);if(player.health<100&&elapsed-lastDamage>5)player.health=Math.min(100,player.health+3*dt);
}

function endGame(win){if(gameEnded)return;gameEnded=true;player.alive=false;document.exitPointerLock?.();ui.hud.classList.add('hidden');ui.end.classList.remove('hidden');ui.endEyebrow.textContent=win?'MISSION COMPLETE':'MISSION FAILED';ui.endTitle.textContent=win?'The palace is secure.':'You were overrun.';const acc=player.shots?Math.round(player.hits/player.shots*100):0,final=Math.round(player.score+Math.max(0,player.health)*8+Math.max(0,300-Math.floor(elapsed))*3);ui.endStats.textContent=`Kills ${player.kills} · Accuracy ${acc}% · Time ${Math.floor(elapsed)}s · Score ${final}`;ui.scoreInput.value=final}
function resize(){const w=ui.wrap.clientWidth,h=ui.wrap.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}window.addEventListener('resize',resize);resize();

document.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyR')startReload();if(e.code==='KeyV')toggleView()});document.addEventListener('keyup',e=>keys[e.code]=false);
document.addEventListener('mousemove',e=>{if(!locked||!player.alive)return;const sens=.0017*(player.ads?.58:1);player.yaw-=e.movementX*sens;player.pitch-=e.movementY*sens;player.pitch=THREE.MathUtils.clamp(player.pitch,-1.15,1.15)});
renderer.domElement.addEventListener('mousedown',e=>{if(!started||gameEnded)return;if(!locked){renderer.domElement.requestPointerLock();return}if(e.button===0){firing=true;shoot()}if(e.button===2)player.ads=true});renderer.domElement.addEventListener('mouseup',e=>{if(e.button===0)firing=false;if(e.button===2)player.ads=false});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('mouseup',e=>{if(e.button===0)firing=false;if(e.button===2)player.ads=false});
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(started&&!gameEnded){ui.pause.classList.toggle('hidden',locked);if(locked)ui.hud.classList.remove('hidden')}});
ui.first.addEventListener('click',e=>{e.stopPropagation();setView('first')});ui.third.addEventListener('click',e=>{e.stopPropagation();setView('third')});ui.menuFirst.addEventListener('click',()=>setView('first'));ui.menuThird.addEventListener('click',()=>setView('third'));
ui.start.addEventListener('click',()=>{started=true;ui.menu.classList.add('hidden');ui.hud.classList.remove('hidden');renderer.domElement.requestPointerLock()});ui.restart.addEventListener('click',()=>location.reload());

function animate(){requestAnimationFrame(animate);const dt=Math.min(.033,clock.getDelta());if(started&&!gameEnded&&locked){elapsed+=dt;updatePlayer(dt);updateEnemies(dt);if(firing)shoot();updateHUD()}for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0){scene.remove(tracers[i].obj);tracers[i].obj.geometry.dispose();tracers[i].obj.material.dispose();tracers.splice(i,1)}}for(let i=effects.length-1;i>=0;i--){effects[i].life-=dt;if(effects[i].life<=0){scene.remove(effects[i].obj);effects.splice(i,1)}}renderer.render(scene,camera)}
animate();
})();
