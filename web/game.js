/* LEGO POWERS — prototype : un personnage, on le bouge. */
(function () {
  'use strict';

  // ---------- Couleurs LEGO ----------
  const C = {
    darkBlue: 0x0a2c5a,
    flesh: 0xf6d7b3,
    hair: 0x3b2314,
    pearlGold: 0xc9a046,
    cape: 0x5c2a14,
    transRed: 0xff2a14,
    silver: 0xa9b4c0,
  };

  // ---------- Scène ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b9e8);
  scene.fog = new THREE.Fog(0x87b9e8, 30, 90);

  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6a3a, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 40;
  scene.add(sun, sun.target);

  // ---------- Utilitaires ----------
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  const plastic = (color, extra) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.35, metalness: 0.0 }, extra));
  function mesh(geo, mat, parent, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }

  // ---------- Sol : plaque de base verte ----------
  const studTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#2f8a3a'; g.fillRect(0, 0, w, h);
    const grd = g.createRadialGradient(56, 56, 6, 64, 64, 36);
    grd.addColorStop(0, '#4fb35a'); grd.addColorStop(0.8, '#2f8a3a'); grd.addColorStop(1, '#1f6a2a');
    g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 36, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.stroke();
  });
  studTex.wrapS = studTex.wrapT = THREE.RepeatWrapping;
  studTex.repeat.set(250, 250);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ map: studTex, roughness: 0.6 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Quelques briques décoratives (avec collision simple)
  const obstacles = [];
  const brickColors = [0xc91a09, 0x0055bf, 0xf2cd37, 0xffffff, 0x237841, 0xfe8a18];
  const studGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.17, 16);
  function brick(x, z, sw, sd, layers, color) {
    const w = sw * 0.8, d = sd * 0.8, hgt = layers * 0.96;
    const mat = plastic(color);
    const g = new THREE.Group();
    mesh(new THREE.BoxGeometry(w, hgt, d), mat, g, 0, hgt / 2, 0);
    for (let i = 0; i < sw; i++) for (let j = 0; j < sd; j++)
      mesh(studGeo, mat, g, -w / 2 + 0.4 + i * 0.8, hgt + 0.085, -d / 2 + 0.4 + j * 0.8);
    g.position.set(x, 0, z);
    scene.add(g);
    obstacles.push({ x, z, hw: w / 2, hd: d / 2, h: hgt });
  }
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 28; i++) {
    const a = rnd() * Math.PI * 2, r = 6 + rnd() * 30;
    brick(Math.cos(a) * r, Math.sin(a) * r, 1 + Math.floor(rnd() * 4), 1 + Math.floor(rnd() * 3),
      1 + Math.floor(rnd() * 3), brickColors[Math.floor(rnd() * brickColors.length)]);
  }

  // ---------- Textures du personnage ----------
  // Visage : sourcils froncés, barbe brune, grimace (u = 0.5 = devant)
  const faceTex = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#f6d7b3'; g.fillRect(0, 0, w, h);
    const cx = w / 2;
    // barbe + moustache
    g.fillStyle = '#3b2314';
    g.beginPath();
    g.moveTo(cx - 92, 128);
    g.quadraticCurveTo(cx - 98, 236, cx, 244);
    g.quadraticCurveTo(cx + 98, 236, cx + 92, 128);
    g.lineTo(cx + 80, 132);
    g.quadraticCurveTo(cx + 74, 196, cx + 40, 206);
    g.lineTo(cx - 40, 206);
    g.quadraticCurveTo(cx - 74, 196, cx - 80, 132);
    g.closePath(); g.fill();
    // moustache
    g.beginPath();
    g.moveTo(cx - 52, 182); g.quadraticCurveTo(cx, 158, cx + 52, 182);
    g.quadraticCurveTo(cx, 172, cx - 52, 182); g.fill();
    g.fillRect(cx - 48, 176, 96, 9);
    // bouche (grimace, dents)
    g.fillStyle = '#ffffff';
    g.beginPath(); g.moveTo(cx - 34, 190); g.lineTo(cx + 34, 190); g.lineTo(cx + 28, 204); g.lineTo(cx - 28, 204); g.closePath(); g.fill();
    g.strokeStyle = '#2a170c'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.moveTo(cx - 30, 197); g.lineTo(cx + 30, 197); g.stroke();
    // yeux
    g.fillStyle = '#111';
    g.beginPath(); g.ellipse(cx - 38, 118, 11, 14, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx + 38, 118, 11, 14, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(cx - 34, 113, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 42, 113, 4, 0, Math.PI * 2); g.fill();
    // sourcils froncés
    g.fillStyle = '#3b2314';
    g.beginPath(); g.moveTo(cx - 66, 86); g.lineTo(cx - 14, 98); g.lineTo(cx - 16, 108); g.lineTo(cx - 64, 96); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx + 66, 86); g.lineTo(cx + 14, 98); g.lineTo(cx + 16, 108); g.lineTo(cx + 64, 96); g.closePath(); g.fill();
    // rides / pommettes
    g.strokeStyle = '#c99f7a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx - 8, 92); g.lineTo(cx - 4, 102); g.moveTo(cx + 8, 92); g.lineTo(cx + 4, 102); g.stroke();
    g.beginPath(); g.moveTo(cx - 58, 140); g.quadraticCurveTo(cx - 50, 150, cx - 40, 150); g.stroke();
    g.beginPath(); g.moveTo(cx + 58, 140); g.quadraticCurveTo(cx + 50, 150, cx + 40, 150); g.stroke();
    g.beginPath(); g.moveTo(cx - 6, 150); g.quadraticCurveTo(cx, 156, cx + 6, 150); g.stroke();
  });

  // Torse avant : combinaison bleu foncé avec motifs argentés en ailes + médaillon
  const torsoFrontTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0a2c5a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#a9b4c0';
    for (const s of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        const y0 = 130 + k * 26;
        g.moveTo(128 + s * 14, y0 + 30);
        g.quadraticCurveTo(128 + s * 60, y0 - 8, 128 + s * (108 - k * 8), y0 - 14 + k * 4);
        g.quadraticCurveTo(128 + s * 70, y0 + 6, 128 + s * 18, y0 + 40);
        g.closePath(); g.fill();
      }
    }
    g.strokeStyle = '#7d8894'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(128, 120); g.lineTo(128, 256); g.stroke();
    g.fillStyle = '#d8c48a';
    g.beginPath(); g.arc(128, 214, 14, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a7440'; g.lineWidth = 3; g.stroke();
  });
  // Jambes avant : ligne argentée courbe
  function legTex(side) {
    return canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#0a2c5a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a9b4c0'; g.lineWidth = 7; g.lineCap = 'round';
      const x = side < 0 ? 34 : 94;
      g.beginPath(); g.moveTo(64, 6); g.quadraticCurveTo(x, 80, x, 200); g.stroke();
    });
  }

  // ---------- Le personnage (Jor-El IRL) ----------
  const player = new THREE.Group();
  scene.add(player);
  const body = new THREE.Group();   // tout sauf la position au sol
  player.add(body);

  const blue = plastic(C.darkBlue);
  const flesh = plastic(C.flesh);
  const gold = plastic(C.pearlGold, { metalness: 0.55, roughness: 0.3, emissive: 0x2a1c00 });

  const LEG_H = 1.2, HIP_H = 0.32, TORSO_H = 1.28;
  const FOOT = 0.18; // hauteur des plaques rondes sous les pieds
  const hipY = FOOT + LEG_H;
  const torsoY = hipY + HIP_H;
  const neckY = torsoY + TORSO_H;

  // Jambes (pivot à la hanche)
  const legs = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.39, hipY + 0.1, 0);
    body.add(pivot);
    const mats = [blue, blue, blue, blue, plastic(C.darkBlue, { map: legTex(s) }), blue];
    mesh(new THREE.BoxGeometry(0.74, LEG_H, 0.62), mats, pivot, 0, -LEG_H / 2 - 0.1, 0.0);
    mesh(new THREE.BoxGeometry(0.74, 0.3, 0.3), blue, pivot, 0, -LEG_H - 0.1 + 0.15, 0.38); // pointe du pied
    legs.push(pivot);
  }
  mesh(new THREE.BoxGeometry(1.56, HIP_H, 0.72), blue, body, 0, hipY + HIP_H / 2, 0);

  // Torse trapézoïdal
  const torsoGeo = new THREE.BoxGeometry(1.56, TORSO_H, 0.8);
  {
    const p = torsoGeo.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.78);
    torsoGeo.computeVertexNormals();
  }
  mesh(torsoGeo, [blue, blue, blue, blue, plastic(C.darkBlue, { map: torsoFrontTex }), blue], body, 0, torsoY + TORSO_H / 2, 0);

  // Bras + mains + auras rouges
  const arms = [];
  const auraAnchors = [];
  const transRed = new THREE.MeshStandardMaterial({
    color: C.transRed, emissive: 0xff1100, emissiveIntensity: 1.2, roughness: 0.1,
    transparent: true, opacity: 0.8,
  });
  const discGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.16, 24);
  const discStudGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.1, 20);
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.66, neckY - 0.22, 0);
    pivot.rotation.z = s * 0.12;
    body.add(pivot);
    const arm = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 16), blue, pivot, 0, -0.42, 0);
    arm.rotation.x = 0.1;
    mesh(new THREE.SphereGeometry(0.21, 16, 12), blue, pivot, 0, 0, 0);
    const wrist = new THREE.Group();
    wrist.position.set(0, -0.92, 0.12);
    pivot.add(wrist);
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 12), flesh, wrist, 0, 0.06, 0);
    const hand = mesh(new THREE.TorusGeometry(0.16, 0.08, 10, 20, Math.PI * 1.6), flesh, wrist, 0, -0.12, 0.06);
    hand.rotation.set(0, Math.PI / 2, Math.PI * 0.7);
    // plaque ronde 1x1 tenue en main, face vers l'avant
    const disc = new THREE.Group();
    disc.position.set(0, -0.14, 0.24);
    disc.rotation.x = Math.PI / 2;
    wrist.add(disc);
    mesh(discGeo, transRed, disc, 0, 0, 0).castShadow = false;
    mesh(discStudGeo, transRed, disc, 0, 0.13, 0).castShadow = false;
    arms.push(pivot);
    auraAnchors.push(disc);
  }
  // Plaques rondes rouges sous les pieds
  for (const leg of legs) {
    const f = new THREE.Group();
    f.position.set(0, -LEG_H - 0.1 - FOOT / 2, 0.08);
    leg.add(f);
    mesh(new THREE.CylinderGeometry(0.36, 0.36, FOOT, 24), transRed, f, 0, 0, 0).castShadow = false;
    auraAnchors.push(f);
  }

  // Tête
  const head = new THREE.Group();
  head.position.y = neckY;
  body.add(head);
  mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16), flesh, head, 0, 0.07, 0);
  const headMesh = mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.86, 40, 1, false, Math.PI, Math.PI * 2),
    [plastic(C.flesh, { map: faceTex }), flesh, flesh], head, 0, 0.14 + 0.43, 0);
  // Cheveux brun foncé, coiffés en arrière
  const hairMat = plastic(C.hair, { roughness: 0.5 });
  const cap = mesh(new THREE.SphereGeometry(0.56, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat, head, 0, 0.82, -0.02);
  cap.scale.set(1, 0.72, 1.06);
  mesh(new THREE.CylinderGeometry(0.55, 0.52, 0.7, 32, 1, true, Math.PI * 0.62, Math.PI * 0.76), hairMat, head, 0, 0.5, -0.03)
    .material = plastic(C.hair, { roughness: 0.5, side: THREE.DoubleSide });
  for (const s of [-1, 1]) { // pattes sur les côtés
    const sb = mesh(new THREE.BoxGeometry(0.1, 0.42, 0.34), hairMat, head, s * 0.5, 0.66, -0.06);
    sb.rotation.z = s * -0.05;
  }
  const fringe = mesh(new THREE.BoxGeometry(0.86, 0.16, 0.3), hairMat, head, 0.04, 1.0, 0.3);
  fringe.rotation.set(-0.35, 0, -0.06);

  // Armure en or perlé : col avec pointes aux épaules + plastron avec rond transparent
  const armor = new THREE.Group();
  armor.position.y = neckY;
  body.add(armor);
  mesh(new THREE.BoxGeometry(1.5, 0.14, 0.92), gold, armor, 0, 0.02, 0);
  for (const s of [-1, 1]) {
    const horn = mesh(new THREE.BoxGeometry(0.5, 0.12, 0.42), gold, armor, s * 0.86, 0.12, 0.08);
    horn.rotation.z = s * 0.5;
    const tip = mesh(new THREE.ConeGeometry(0.1, 0.32, 8), gold, armor, s * 1.12, 0.3, 0.12);
    tip.rotation.z = s * -0.7;
    const strap = mesh(new THREE.BoxGeometry(0.2, 0.42, 0.12), gold, armor, s * 0.44, -0.2, 0.44);
    strap.rotation.z = s * 0.35;
  }
  mesh(new THREE.BoxGeometry(0.78, 0.62, 0.2), gold, armor, 0, -0.36, 0.48);
  mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 24), gold, armor, 0, -0.36, 0.58).rotation.x = Math.PI / 2;
  const clear = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.55, emissive: 0x332a20 });
  const gem = new THREE.Group();
  gem.position.set(0, -0.36, 0.64);
  gem.rotation.x = Math.PI / 2;
  armor.add(gem);
  mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 24), clear, gem, 0, 0, 0);
  mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 20), clear, gem, 0, 0.09, 0);

  // Cape en tissu marron (reddish brown), animée
  const CAPE_W = 2.7, CAPE_H = 1.95, CSX = 14, CSY = 14;
  const capeGeo = new THREE.PlaneGeometry(CAPE_W, CAPE_H, CSX, CSY);
  const capeBase = capeGeo.attributes.position.array.slice();
  const capeTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#5c2a14'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,200,160'},0.06)`;
      g.fillRect(rnd() * w, rnd() * h, 1, 1);
    }
  });
  capeTex.wrapS = capeTex.wrapT = THREE.RepeatWrapping; capeTex.repeat.set(6, 6);
  const cape = mesh(capeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: capeTex, roughness: 0.95, side: THREE.DoubleSide }), body, 0, 0, 0);
  const capeTopY = neckY + 0.22;
  function updateCape(t, speed) {
    const p = capeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const bx = capeBase[i * 3], by = capeBase[i * 3 + 1];
      const v = (CAPE_H / 2 - by) / CAPE_H;   // 0 en haut, 1 en bas
      const u = bx / (CAPE_W / 2);           // -1..1
      const width = 0.58 + 0.42 * Math.min(1, v * 1.4); // étroite aux épaules, évasée en bas
      const x = bx * width;
      let z = -0.5 + 0.5 * u * u * Math.max(0, 1 - v * 1.5);     // enveloppe le dos
      z -= v * v * (0.25 + speed * 1.4) + Math.sin(t * 3 + v * 4 + u) * 0.05 * v * (0.4 + speed);
      p.setXYZ(i, x, capeTopY - v * CAPE_H * (1 - speed * 0.15), z);
    }
    p.needsUpdate = true;
    capeGeo.computeVertexNormals();
  }

  // ---------- Auras de pouvoir rouges ----------
  const glowTex = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,220,200,1)');
    grd.addColorStop(0.25, 'rgba(255,60,30,.9)');
    grd.addColorStop(0.6, 'rgba(255,0,0,.25)');
    grd.addColorStop(1, 'rgba(255,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  glowTex.colorSpace = THREE.NoColorSpace;
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const glows = auraAnchors.map(a => {
    const s = new THREE.Sprite(glowMat);
    s.scale.setScalar(1.3);
    a.add(s);
    return s;
  });
  const handLights = [0, 1].map(i => {
    const l = new THREE.PointLight(0xff2010, 1.5, 3.5, 2);
    auraAnchors[i].add(l);
    return l;
  });
  const footLight = new THREE.PointLight(0xff2010, 2, 3, 2);
  footLight.position.set(0, 0.2, 0);
  player.add(footLight);

  // Particules d'énergie qui montent
  const sparks = [];
  const sparkMat = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  for (let i = 0; i < 70; i++) {
    const s = new THREE.Sprite(sparkMat.clone());
    s.visible = false;
    scene.add(s);
    sparks.push({ s, life: 0, max: 1, v: new THREE.Vector3() });
  }
  const tmpV = new THREE.Vector3();
  let sparkIdx = 0;
  function emitSpark() {
    const anchor = auraAnchors[Math.floor(Math.random() * auraAnchors.length)];
    const sp = sparks[sparkIdx++ % sparks.length];
    anchor.getWorldPosition(tmpV);
    sp.s.position.copy(tmpV).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4));
    sp.v.set((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4);
    sp.life = sp.max = 0.5 + Math.random() * 0.6;
    sp.s.visible = true;
  }

  // ---------- Contrôles ----------
  const input = { x: 0, y: 0, jump: false };
  const keys = {};
  addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space') input.jump = true; });
  addEventListener('keyup', e => { keys[e.code] = false; });

  const joy = document.getElementById('joy'), knob = document.getElementById('knob');
  let joyId = null, joyCx = 0, joyCy = 0;
  let camId = null, camLastX = 0, camLastY = 0;
  let camYaw = 0, camPitch = 0.25, camDist = 9;

  const jumpBtn = document.getElementById('jump');
  jumpBtn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); input.jump = true; }, { passive: false });
  jumpBtn.addEventListener('mousedown', e => { e.stopPropagation(); input.jump = true; });

  function setKnob(dx, dy) {
    const r = 45, len = Math.hypot(dx, dy), k = len > r ? r / len : 1;
    dx *= k; dy *= k;
    knob.style.left = (40 + dx) + 'px'; knob.style.top = (40 + dy) + 'px';
    input.x = dx / r; input.y = dy / r;
  }
  function pointerDown(id, x, y) {
    if (x < innerWidth / 2 && joyId === null) {
      joyId = id; joyCx = x; joyCy = y;
      joy.style.display = 'block'; joy.style.left = (x - 65) + 'px'; joy.style.top = (y - 65) + 'px';
      setKnob(0, 0);
    } else if (camId === null) {
      camId = id; camLastX = x; camLastY = y;
    }
  }
  function pointerMove(id, x, y) {
    if (id === joyId) setKnob(x - joyCx, y - joyCy);
    else if (id === camId) {
      camYaw -= (x - camLastX) * 0.008;
      camPitch = Math.max(-0.1, Math.min(1.1, camPitch + (y - camLastY) * 0.005));
      camLastX = x; camLastY = y;
    }
  }
  function pointerUp(id) {
    if (id === joyId) { joyId = null; joy.style.display = 'none'; input.x = input.y = 0; }
    if (id === camId) camId = null;
  }
  const cv = renderer.domElement;
  cv.addEventListener('touchstart', e => { e.preventDefault(); for (const t of e.changedTouches) pointerDown(t.identifier, t.clientX, t.clientY); }, { passive: false });
  cv.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) pointerMove(t.identifier, t.clientX, t.clientY); }, { passive: false });
  cv.addEventListener('touchend', e => { for (const t of e.changedTouches) pointerUp(t.identifier); });
  cv.addEventListener('touchcancel', e => { for (const t of e.changedTouches) pointerUp(t.identifier); });
  cv.addEventListener('mousedown', e => pointerDown('m', e.clientX, e.clientY));
  addEventListener('mousemove', e => pointerMove('m', e.clientX, e.clientY));
  addEventListener('mouseup', () => pointerUp('m'));
  cv.addEventListener('wheel', e => { camDist = Math.max(3.5, Math.min(14, camDist + e.deltaY * 0.01)); });

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  // ---------- Boucle de jeu ----------
  const state = { vy: 0, grounded: true, walk: 0, speed: 0, facing: 0 };
  const RADIUS = 0.8;
  const clock = new THREE.Clock();
  let sparkAcc = 0;

  function groundHeightAt(x, z) {
    let h = 0;
    for (const o of obstacles)
      if (Math.abs(x - o.x) < o.hw + RADIUS * 0.4 && Math.abs(z - o.z) < o.hd + RADIUS * 0.4) h = Math.max(h, o.h + 0.17);
    return h;
  }

  function step(dt, t) {
    // Entrée -> direction relative à la caméra
    let ix = input.x, iy = input.y;
    if (keys.KeyW || keys.ArrowUp || keys.KeyZ) iy -= 1;
    if (keys.KeyS || keys.ArrowDown) iy += 1;
    if (keys.KeyA || keys.ArrowLeft || keys.KeyQ) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    const mag = Math.min(1, Math.hypot(ix, iy));
    const fx = Math.sin(camYaw + Math.PI), fz = Math.cos(camYaw + Math.PI); // avant caméra
    const rx = -fz, rz = fx;                                                 // droite caméra
    let mx = 0, mz = 0;
    if (mag > 0.05) {
      const n = Math.hypot(ix, iy);
      mx = (fx * -iy + rx * ix) / n * mag;
      mz = (fz * -iy + rz * ix) / n * mag;
      const target = Math.atan2(mx, mz);
      let d = target - state.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      state.facing += d * Math.min(1, dt * 12);
    }
    const SPEED = 6;
    state.speed += (mag - state.speed) * Math.min(1, dt * 10);
    const nx = player.position.x + mx * SPEED * dt, nz = player.position.z + mz * SPEED * dt;

    // Collision avec les briques plus hautes que soi
    const tryMove = (x, z) => {
      for (const o of obstacles) {
        if (player.position.y >= o.h + 0.1) continue;
        const cx = Math.max(o.x - o.hw, Math.min(x, o.x + o.hw)), cz = Math.max(o.z - o.hd, Math.min(z, o.z + o.hd));
        if (Math.hypot(x - cx, z - cz) < RADIUS * 0.6) return false;
      }
      return true;
    };
    if (tryMove(nx, nz)) { player.position.x = nx; player.position.z = nz; }
    else if (tryMove(nx, player.position.z)) player.position.x = nx;
    else if (tryMove(player.position.x, nz)) player.position.z = nz;

    // Saut + gravité
    if (input.jump && state.grounded) { state.vy = 9; state.grounded = false; }
    input.jump = false;
    state.vy -= 24 * dt;
    player.position.y += state.vy * dt;
    const gh = groundHeightAt(player.position.x, player.position.z);
    if (player.position.y <= gh) { player.position.y = gh; state.vy = 0; state.grounded = true; }
    else if (player.position.y > gh + 0.05) state.grounded = false;

    player.rotation.y = state.facing;

    // Animation marche
    state.walk += dt * 11 * state.speed;
    const sw = Math.sin(state.walk) * 0.75 * state.speed;
    if (state.grounded) {
      legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.8; arms[1].rotation.x = sw * 0.8;
      body.position.y = Math.abs(Math.cos(state.walk)) * 0.06 * state.speed;
    } else {
      legs[0].rotation.x = -0.5; legs[1].rotation.x = 0.3;
      arms[0].rotation.x = arms[1].rotation.x = -2.6; // bras levés : envol de puissance
      body.position.y = 0;
    }
    head.rotation.y = Math.sin(t * 0.7) * 0.08 * (1 - state.speed);
    updateCape(t, state.grounded ? state.speed : 1);

    // Auras
    const pulse = 1 + Math.sin(t * 6) * 0.15 + Math.sin(t * 17) * 0.05;
    glows.forEach((g, i) => g.scale.setScalar((i < 2 ? 1.4 : 1.2) * pulse));
    transRed.emissiveIntensity = 1.1 + Math.sin(t * 6) * 0.4;
    handLights.forEach(l => (l.intensity = 1.3 * pulse));
    footLight.intensity = 1.8 * pulse;
    sparkAcc += dt * (25 + state.speed * 30);
    while (sparkAcc > 1) { emitSpark(); sparkAcc -= 1; }
    for (const sp of sparks) {
      if (!sp.s.visible) continue;
      sp.life -= dt;
      if (sp.life <= 0) { sp.s.visible = false; continue; }
      sp.s.position.addScaledVector(sp.v, dt);
      const k = sp.life / sp.max;
      sp.s.material.opacity = k;
      sp.s.scale.setScalar(0.25 * k + 0.05);
    }

    // Caméra 3e personne
    const target = tmpV.set(player.position.x, player.position.y + 2.0, player.position.z);
    camera.position.set(
      target.x + Math.sin(camYaw) * Math.cos(camPitch) * camDist,
      target.y + Math.sin(camPitch) * camDist,
      target.z + Math.cos(camYaw) * Math.cos(camPitch) * camDist
    );
    camera.lookAt(target);
    sun.position.set(player.position.x + 8, 14, player.position.z + 6);
    sun.target.position.copy(player.position);
  }

  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    step(dt, t);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  camYaw = 0; // vue de face au lancement, comme la photo
  loop();
  window.__game = { player, camera, setYaw: y => (camYaw = y), setPitch: p => (camPitch = p), setDist: d => (camDist = d) };
})();
