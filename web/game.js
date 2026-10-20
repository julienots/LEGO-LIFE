/* LEGO POWERS — prototype : un personnage, on le bouge. */
(function () {
  'use strict';

  // ---------- Couleurs LEGO ----------
  const C = {
    darkBlue: 0x0a2c5a,
    flesh: 0xf6d7b3,
    hair: 0x3b2314,
    pearlGold: 0xd3a24c,
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

  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a6a3a, 1.05));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
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

  // Environnement pour les reflets (plastique brillant, or perlé)
  {
    const envScene = new THREE.Scene();
    const sky = canvasTex(16, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#9cc8f0'); grd.addColorStop(0.48, '#ffffff'); grd.addColorStop(0.52, '#8fae7a'); grd.addColorStop(1, '#3d6a30');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide })));
    const panel = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(5) });
    for (const [x, y, z] of [[5, 6, 4], [-6, 4, -3]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), panel);
      m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
    }
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
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
  // Visage (u = 0.5 = devant). Repère : x en unités depuis le centre, y depuis le bas de la tête (0..0.86).
  const FACE_S = 338, FACE_W = 1024, FACE_H = 291;
  const fx = x => FACE_W / 2 + x * FACE_S, fy = y => FACE_H - y * FACE_S;
  const faceTex = canvasTex(FACE_W, FACE_H, (g) => {
    g.fillStyle = '#f6d7b3'; g.fillRect(0, 0, FACE_W, FACE_H);
    const beard = '#3a2a22';
    // barbe courte : pattes, joues, mâchoire, menton
    g.fillStyle = beard;
    g.beginPath();
    g.moveTo(fx(-0.47), fy(0.45));
    g.lineTo(fx(-0.41), fy(0.42));
    g.quadraticCurveTo(fx(-0.36), fy(0.24), fx(-0.2), fy(0.2));
    g.quadraticCurveTo(fx(-0.15), fy(0.295), fx(0), fy(0.295));
    g.quadraticCurveTo(fx(0.15), fy(0.295), fx(0.2), fy(0.2));
    g.quadraticCurveTo(fx(0.36), fy(0.24), fx(0.41), fy(0.42));
    g.lineTo(fx(0.47), fy(0.45));
    g.lineTo(fx(0.47), fy(0.12));
    g.quadraticCurveTo(fx(0.30), fy(0.02), fx(0), fy(0.02));
    g.quadraticCurveTo(fx(-0.30), fy(0.02), fx(-0.47), fy(0.12));
    g.closePath(); g.fill();
    // bouche : trait sombre + lèvre inférieure claire, dans la barbe
    g.fillStyle = '#f2c9a2';
    g.beginPath(); g.ellipse(fx(0), fy(0.225), 0.115 * FACE_S, 0.032 * FACE_S, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e9e2d6';
    g.beginPath(); g.ellipse(fx(0), fy(0.245), 0.09 * FACE_S, 0.014 * FACE_S, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1c120c'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(fx(-0.1), fy(0.255)); g.quadraticCurveTo(fx(0), fy(0.27), fx(0.1), fy(0.255)); g.stroke();
    // yeux noirs + reflet
    for (const s of [-1, 1]) {
      g.fillStyle = '#111';
      g.beginPath(); g.ellipse(fx(s * 0.165), fy(0.49), 0.036 * FACE_S, 0.045 * FACE_S, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(fx(s * 0.165 + 0.014), fy(0.505), 0.013 * FACE_S, 0, Math.PI * 2); g.fill();
    }
    // sourcils épais, légèrement froncés
    g.fillStyle = '#2e1f18';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(fx(s * 0.07), fy(0.575));
      g.quadraticCurveTo(fx(s * 0.17), fy(0.625), fx(s * 0.28), fy(0.6));
      g.lineTo(fx(s * 0.275), fy(0.575));
      g.quadraticCurveTo(fx(s * 0.17), fy(0.59), fx(s * 0.075), fy(0.548));
      g.closePath(); g.fill();
    }
    // rides : front, entre les sourcils, joues
    g.strokeStyle = '#c98c62'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(fx(-0.04), fy(0.6)); g.lineTo(fx(-0.025), fy(0.56)); g.stroke();
    g.beginPath(); g.moveTo(fx(0.04), fy(0.6)); g.lineTo(fx(0.025), fy(0.56)); g.stroke();
    g.beginPath(); g.moveTo(fx(-0.22), fy(0.7)); g.quadraticCurveTo(fx(-0.15), fy(0.72), fx(-0.08), fy(0.69)); g.stroke();
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(fx(s * 0.25), fy(0.44)); g.quadraticCurveTo(fx(s * 0.29), fy(0.41), fx(s * 0.3), fy(0.37)); g.stroke();
      g.beginPath(); g.moveTo(fx(s * 0.215), fy(0.43)); g.lineTo(fx(s * 0.235), fy(0.41)); g.stroke();
    }
  });

  // Torse avant : combinaison bleu foncé, motif argenté en ailes autour d'un médaillon or (bas du torse)
  const torsoFrontTex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#0a2c5a'; g.fillRect(0, 0, w, h);
    const cy = 204, S = '#b9c2cc';
    g.fillStyle = '#071f42';  // V plus sombre au centre
    g.beginPath(); g.moveTo(40, 150); g.quadraticCurveTo(128, 214, 216, 150); g.lineTo(128, 196); g.closePath(); g.fill();
    for (const s of [-1, 1]) {
      const X = x => 128 + s * x;
      g.fillStyle = S;
      // grande aile effilée : du coin haut jusqu'au médaillon
      g.beginPath();
      g.moveTo(X(122), 142); g.lineTo(X(104), 142);
      g.quadraticCurveTo(X(58), 168, X(20), cy - 7);
      g.lineTo(X(18), cy + 2);
      g.quadraticCurveTo(X(66), 186, X(122), 162);
      g.closePath(); g.fill();
      // trait fin qui part du médaillon vers le bas/l'extérieur
      g.beginPath();
      g.moveTo(X(16), cy + 4); g.quadraticCurveTo(X(60), cy + 8, X(118), cy + 30);
      g.lineTo(X(118), cy + 40); g.quadraticCurveTo(X(60), cy + 17, X(16), cy + 10);
      g.closePath(); g.fill();
      // plumes : groupe du haut et groupe du bas, sur les côtés
      g.strokeStyle = S; g.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        g.lineWidth = 9 - k;
        g.beginPath(); g.moveTo(X(118 - k * 4), 168 + k * 11); g.lineTo(X(80 - k * 2), 160 + k * 13); g.stroke();
      }
      for (let k = 0; k < 2; k++) {
        g.lineWidth = 8;
        g.beginPath(); g.moveTo(X(118), 222 + k * 11); g.lineTo(X(84 + k * 6), 214 + k * 12); g.stroke();
      }
    }
    g.fillStyle = '#d9c27e';
    g.beginPath(); g.ellipse(128, cy, 19, 11, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#8a7440'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#082448'; g.fillRect(0, 246, 256, 10);
  });
  // Jambes avant : bande argentée sur le bord extérieur, qui rentre vers l'intérieur en bas
  function legTex(side) {
    return canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#0a2c5a'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(160,170,185,.12)';
      for (let i = 0; i < 40; i++) g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 6, 1);
      g.strokeStyle = '#b9c2cc'; g.lineWidth = 8; g.lineCap = 'round';
      const X = x => (side < 0 ? x : w - x);
      g.beginPath(); g.moveTo(X(14), 0); g.lineTo(X(14), 85); g.quadraticCurveTo(X(16), 125, X(40), 140); g.stroke();
    });
  }
  // Cheveux : mèches verticales
  const hairTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = '#3d2416'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 14) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,.16)' : 'rgba(120,80,55,.12)';
      g.fillRect(x, 0, 2 + rnd() * 2, h);
    }
  });
  // Cape : tissu sergé
  const capeTex = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#4a2413'; g.fillRect(0, 0, w, h);
    g.lineWidth = 1.2;
    for (let i = -h; i < w; i += 4) {
      g.strokeStyle = 'rgba(0,0,0,.22)';
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
      g.strokeStyle = 'rgba(190,120,80,.12)';
      g.beginPath(); g.moveTo(i + 2, h); g.lineTo(i + 2 + h, 0); g.stroke();
    }
  });
  capeTex.wrapS = capeTex.wrapT = THREE.RepeatWrapping; capeTex.repeat.set(5, 5);

  // ---------- Auras de pouvoir (communes) ----------
  const glowTex = canvasTex(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,.75)');
    grd.addColorStop(0.6, 'rgba(255,255,255,.2)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
  glowTex.colorSpace = THREE.NoColorSpace;
  // Ajoute halo + lumière sur chaque point d'aura ; renvoie une fonction d'animation
  function addAuras(anchors, color, lightAnchors, extraLight) {
    const mat = new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const glows = anchors.map(a => { const s = new THREE.Sprite(mat); a.add(s); return s; });
    const lights = lightAnchors.map(a => { const l = new THREE.PointLight(color, 1.5, 3.5, 2); a.add(l); return l; });
    return (pulse) => {
      glows.forEach(g => g.scale.setScalar(1.05 * pulse));
      lights.forEach(l => (l.intensity = 1.3 * pulse));
      if (extraLight) extraLight.intensity = 1.8 * pulse;
    };
  }

  // Bras de minifig : attaché sur le côté du torse (pas dedans), incliné vers l'extérieur comme le torse,
  // coude plié vers l'avant, main en C ouverte vers l'avant. Renvoie le pivot d'épaule et le centre de la main.
  function buildArm(s, parent, neckY, armMat, handMat) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.83, neckY - 0.2, 0);
    pivot.rotation.z = s * 0.16;
    parent.add(pivot);
    const sh = mesh(new THREE.SphereGeometry(0.24, 20, 14), armMat, pivot, 0, 0, 0); // épaule arrondie
    sh.scale.set(0.95, 1, 1.05);
    const upper = mesh(new THREE.CapsuleGeometry(0.215, 0.42, 6, 18), armMat, pivot, 0, -0.3, 0);
    upper.scale.set(0.92, 1, 1);
    const fore = new THREE.Group();
    fore.position.y = -0.58;
    fore.rotation.x = -0.55;                      // coude vers l'avant
    pivot.add(fore);
    mesh(new THREE.CapsuleGeometry(0.195, 0.34, 6, 18), armMat, fore, 0, -0.2, 0).scale.set(0.92, 1, 1);
    const wrist = new THREE.Group();
    wrist.position.y = -0.46;
    wrist.rotation.set(0.55, 0, 0);               // main remise droite
    fore.add(wrist);
    const wristRoll = new THREE.Group();
    wristRoll.rotation.z = -s * 0.16;             // annule l'inclinaison du bras
    wrist.add(wristRoll);
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 14), handMat, wristRoll, 0, 0, 0);
    const handC = new THREE.Group();
    handC.position.set(0, -0.2, 0.02);
    wristRoll.add(handC);
    // C vu de face (axe de la pince vers l'avant), ouverture vers le bas/l'extérieur
    const gap = s > 0 ? -Math.PI / 4 : -3 * Math.PI / 4;
    const c = mesh(new THREE.TorusGeometry(0.15, 0.07, 12, 24, Math.PI * 1.6), handMat, handC, 0, 0, 0);
    c.rotation.z = gap - 1.8 * Math.PI;
    c.scale.z = 1.25;
    return { pivot, handC };
  }

  // ---------- Perso 1 : Jor-El (auras rouges mains + pieds) ----------
  function buildJorEl() {
    const player = new THREE.Group();
    const body = new THREE.Group();
    player.add(body);

    const blue = plastic(C.darkBlue, { roughness: 0.3 });
    const flesh = plastic(C.flesh);
    const gold = plastic(C.pearlGold, { metalness: 0.75, roughness: 0.28 });

    const LEG_H = 1.0, HIP_H = 0.32, TORSO_H = 1.28;
    const FOOT = 0.22; // plaques rondes rouges sous les pieds
    const hipY = FOOT + LEG_H;
    const torsoY = hipY + HIP_H;
    const neckY = torsoY + TORSO_H;

    const transRed = new THREE.MeshStandardMaterial({
      color: C.transRed, emissive: 0xff1100, emissiveIntensity: 1.2, roughness: 0.08,
      transparent: true, opacity: 0.82,
    });
    const transRedDeep = new THREE.MeshStandardMaterial({ color: 0x8a0a00, emissive: 0xaa1000, transparent: true, opacity: 0.9 });
    const auraAnchors = [];

    // Jambes (pivot à la hanche)
    const legs = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.39, hipY + 0.1, 0);
      body.add(pivot);
      const mats = [blue, blue, blue, blue, plastic(0xffffff, { roughness: 0.3, map: legTex(s) }), blue];
      mesh(new THREE.BoxGeometry(0.74, LEG_H, 0.76), mats, pivot, 0, -LEG_H / 2 - 0.1, 0.02);
      // plaque ronde 1x1 rouge sous le pied
      const f = new THREE.Group();
      f.position.set(0, -LEG_H - 0.1 - FOOT / 2, 0.06);
      pivot.add(f);
      mesh(new THREE.CylinderGeometry(0.37, 0.37, FOOT * 0.75, 28), transRed, f, 0, -FOOT * 0.125, 0).castShadow = false;
      mesh(new THREE.CylinderGeometry(0.24, 0.24, FOOT * 0.25, 20), transRed, f, 0, FOOT * 0.375, 0).castShadow = false;
      auraAnchors.push(f);
      legs.push(pivot);
    }
    mesh(new THREE.BoxGeometry(1.56, HIP_H, 0.7), blue, body, 0, hipY + HIP_H / 2, 0);
    mesh(new THREE.BoxGeometry(0.04, HIP_H * 0.8, 0.02), plastic(0x061c3a), body, 0, hipY + HIP_H * 0.45, 0.355);

    // Torse trapézoïdal
    const torsoGeo = new THREE.BoxGeometry(1.56, TORSO_H, 0.8);
    {
      const p = torsoGeo.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.78);
      torsoGeo.computeVertexNormals();
    }
    mesh(torsoGeo, [blue, blue, blue, blue, plastic(0xffffff, { roughness: 0.3, map: torsoFrontTex }), blue], body, 0, torsoY + TORSO_H / 2, 0);

    // Bras coudés + mains qui tiennent les plaques rouges (auras)
    const arms = [];
    const discGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.13, 28);
    const discStudGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.1, 24);
    const discHoleGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.02, 16);
    for (const s of [-1, 1]) {
      const { pivot, handC } = buildArm(s, body, neckY, blue, flesh);
      const disc = new THREE.Group();          // plaque ronde 1x1 tenue face vers l'avant
      disc.position.set(0, 0, 0.16);
      disc.rotation.x = Math.PI / 2;
      handC.add(disc);
      mesh(discGeo, transRed, disc, 0, 0, 0).castShadow = false;
      mesh(discStudGeo, transRed, disc, 0, 0.115, 0).castShadow = false;
      mesh(discHoleGeo, transRedDeep, disc, 0, 0.17, 0).castShadow = false;
      arms.push(pivot);
      auraAnchors.unshift(disc); // mains d'abord (indices 0 et 1)
    }

    // Tête
    const head = new THREE.Group();
    head.position.y = neckY;
    body.add(head);
    mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16), flesh, head, 0, 0.07, 0);
    mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.86, 48, 1, false, Math.PI, Math.PI * 2),
      [plastic(0xffffff, { map: faceTex }), flesh, flesh], head, 0, 0.14 + 0.43, 0);

    // Cheveux brun foncé : très volumineux sur le dessus, plus larges que la tête,
    // mèche balayée devant, côtés qui retombent jusqu'aux yeux, arrière jusqu'à la nuque
    const hairMat = plastic(0xffffff, { map: hairTex, roughness: 0.3, envMapIntensity: 0.55, side: THREE.DoubleSide });
    const HB = 0.14; // bas de la tête
    const HR = 0.6; // rayon des cheveux
    const dome = mesh(new THREE.SphereGeometry(HR, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), hairMat, head, 0, 0.94, -0.03);
    dome.scale.set(1.0, 0.8, 1.05);
    {
      const OPEN = 0.86; // demi-ouverture du visage (rad)
      const geo = new THREE.CylinderGeometry(HR, HR, 1, 56, 8, true, OPEN, Math.PI * 2 - 2 * OPEN);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), y = p.getY(i) + 0.5;   // 0 bas .. 1 haut
        const back = Math.max(0, -z / HR);                          // 1 derrière
        const bottom = 0.58 - back * 0.34;
        p.setY(i, bottom + (0.95 - bottom) * y);
        const flare = 1 + (1 - y) * 0.03 + Math.sin(Math.atan2(x, z) * 9) * 0.015; // mèches
        p.setX(i, x * flare); p.setZ(i, z * flare * 1.02 - 0.03);
      }
      geo.computeVertexNormals();
      mesh(geo, hairMat, head, 0, 0, 0);
      // remplissage entre la tête et les cheveux (évite le vide sur les côtés)
      mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32, 1, true, OPEN + 0.2, Math.PI * 2 - 2 * OPEN - 0.4), hairMat, head, 0, 0.72, -0.02);
      // pointes des pattes qui touchent les joues
      for (const s of [-1, 1]) {
        const tip = mesh(new THREE.ConeGeometry(0.09, 0.22, 10), hairMat, head, s * 0.47, 0.6, 0.3);
        tip.rotation.set(0, 0, Math.PI + s * 0.15);
        tip.scale.z = 0.6;
      }
    }
    // mèche avant balayée en vague
    const swoop1 = mesh(new THREE.SphereGeometry(0.34, 28, 14), hairMat, head, -0.18, 1.0, 0.32);
    swoop1.scale.set(1.15, 0.55, 0.7); swoop1.rotation.z = 0.3;
    const swoop2 = mesh(new THREE.SphereGeometry(0.3, 28, 14), hairMat, head, 0.22, 0.98, 0.34);
    swoop2.scale.set(1.1, 0.5, 0.68); swoop2.rotation.z = -0.25;
    const swoop3 = mesh(new THREE.SphereGeometry(0.22, 20, 12), hairMat, head, 0.02, 0.95, 0.4);
    swoop3.scale.set(1.3, 0.5, 0.6);

    // Armure or perlé : épaulières en V qui montent vers l'extérieur + plastron avec plaque ronde transparente
    const armor = new THREE.Group();
    armor.position.y = neckY;
    body.add(armor);
    const bevel = { bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2, curveSegments: 16 };
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape();
      const pts = [[0.24, 0.02], [0.93, 0.36], [1.05, 0.35], [1.06, 0.21], [0.97, 0.13], [0.6, -0.1], [0.5, -0.3], [0.24, -0.3]];
      sh.moveTo(s * pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) sh.lineTo(s * pts[i][0], pts[i][1]);
      const geo = new THREE.ExtrudeGeometry(sh, Object.assign({ depth: 0.84 }, bevel));
      geo.translate(0, 0, -0.42);
      mesh(geo, gold, armor, 0, 0, 0);
      // arête sur l'épaulière
      const ridge = mesh(new THREE.BoxGeometry(0.6, 0.05, 0.06), gold, armor, s * 0.66, 0.14, 0.47);
      ridge.rotation.z = s * 0.46;
    }
    {
      const sh = new THREE.Shape();
      sh.moveTo(-0.5, 0.0); sh.lineTo(0.5, 0.0); sh.lineTo(0.54, -0.46);
      sh.lineTo(0.42, -0.68); sh.lineTo(-0.42, -0.68); sh.lineTo(-0.54, -0.46); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, Object.assign({ depth: 0.18 }, bevel));
      mesh(geo, gold, armor, 0, 0, 0.36);
      const ring = mesh(new THREE.TorusGeometry(0.3, 0.045, 12, 40), gold, armor, 0, -0.35, 0.6);
    }
    const clear = new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.03, metalness: 0.1, transparent: true, opacity: 0.32 });
    const gem = new THREE.Group();
    gem.position.set(0, -0.35, 0.6);
    gem.rotation.x = Math.PI / 2;
    armor.add(gem);
    mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.1, 32), clear, gem, 0, 0, 0);
    mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 28), clear, gem, 0, 0.09, 0);
    mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 32), clear, gem, 0, 0.135, 0).rotation.x = Math.PI / 2;

    // Cape en tissu marron : étroite au cou, très évasée en bas, descend à mi-jambe
    const CAPE_W = 2, CAPE_H = 2.3, CSX = 20, CSY = 16;
    const capeGeo = new THREE.PlaneGeometry(CAPE_W, CAPE_H, CSX, CSY);
    const capeBase = capeGeo.attributes.position.array.slice();
    const cape = mesh(capeGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, map: capeTex, roughness: 0.95, side: THREE.DoubleSide }), body, 0, 0, 0);
    const capeTopY = neckY + 0.16;
    // col de la cape, visible devant le cou au-dessus de l'armure
    const collar = mesh(new THREE.TorusGeometry(0.36, 0.05, 8, 24, Math.PI), cape.material, body, 0, neckY + 0.07, 0.04);
    collar.rotation.x = -Math.PI / 2 + 0.25;
    function updateCape(t, speed) {
      const p = capeGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const bx = capeBase[i * 3], by = capeBase[i * 3 + 1];
        const v = (CAPE_H / 2 - by) / CAPE_H;   // 0 en haut, 1 en bas
        const u = bx / (CAPE_W / 2);           // -1..1
        const half = 0.95 + (2.1 - 0.95) * Math.pow(v, 0.8) * (1 - speed * 0.35);
        const x = u * half;
        const zc = -0.5 - 0.36 * v;            // centre du dos
        const ze = -0.22 - 0.4 * v;              // bords, ramenés vers l'avant sur les épaules
        let z = zc + (ze - zc) * u * u;
        z += 0.07 * Math.max(0, 1 - v / 0.45) * Math.exp(-u * u * 60); // pli central
        z -= v * v * speed * 1.3 + Math.sin(t * 3 + v * 4 + u * 2) * 0.05 * v * (0.3 + speed);
        p.setXYZ(i, x, capeTopY + 0.26 * u * u * (1 - v) - v * CAPE_H * (1 - speed * 0.12), z);
      }
      p.needsUpdate = true;
      capeGeo.computeVertexNormals();
    }


    const footLight = new THREE.PointLight(0xff2010, 2, 3, 2);
    footLight.position.set(0, 0.2, 0);
    player.add(footLight);
    const auraAnim = addAuras(auraAnchors, 0xff3020, auraAnchors.slice(0, 2), footLight);
    return {
      name: 'Jor-El', group: player, body, legs, arms, head, auraAnchors, sparkColor: 0xff3020,
      update(t, speed, grounded, pulse) {
        updateCape(t, grounded ? speed : 1);
        transRed.emissiveIntensity = 1.1 + Math.sin(t * 6) * 0.4;
        auraAnim(pulse);
      },
    };
  }

  // ---------- Perso 2 : Cyborg à capuche (aura de glace, main droite) ----------
  function buildRobot() {
    const GRAY = '#a3a8ad', WHITE = '#eef1f3', BLUE = '#1f63b8', ORANGE = '#f4a51c', INK = '#15181c';
    const player = new THREE.Group();
    const body = new THREE.Group();
    player.add(body);

    const LEG_H = 1.0, HIP_H = 0.32, TORSO_H = 1.28;
    const hipY = LEG_H, torsoY = hipY + HIP_H, neckY = torsoY + TORSO_H;
    const lightGray = plastic(0xa3a8ad, { roughness: 0.35 });
    const flatSilver = plastic(0x5d6266, { metalness: 0.35, roughness: 0.45 });
    const navy = plastic(0x0a2c5a, { roughness: 0.3 });
    const hoodMat = plastic(0x4a1d0d, { roughness: 0.3, envMapIntensity: 0.6, side: THREE.DoubleSide });
    const tex = (w, h, draw) => plastic(0xffffff, { roughness: 0.32, map: canvasTex(w, h, draw) });

    // Contour noir + remplissage
    function poly(g, pts, fill, stroke, lw) {
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); }
    }

    // --- Torse avant : plaques blanches/argent, abdos segmentés, bleu sur les côtés, circuits orange ---
    const torsoFront = tex(256, 256, (g, w, h) => {
      g.fillStyle = GRAY; g.fillRect(0, 0, w, h);
      // emblème flocon (glace) dans le col en V
      poly(g, [[96, 0], [160, 0], [128, 46]], BLUE, INK, 2);
      g.strokeStyle = '#cfe6ff'; g.lineWidth = 3;
      for (let k = 0; k < 6; k++) {
        const a = k * Math.PI / 3;
        g.beginPath(); g.moveTo(128, 16); g.lineTo(128 + Math.cos(a) * 13, 16 + Math.sin(a) * 13); g.stroke();
      }
      for (const s of [-1, 1]) {
        const X = x => 128 + s * x;
        // pectoraux blancs
        poly(g, [[X(6), 34], [X(34), 4], [X(96), 4], [X(110), 70], [X(92), 118], [X(66), 160], [X(30), 120], [X(6), 96]], WHITE, INK, 2.5);
        // côtés bleus avec tirets orange
        poly(g, [[X(92), 118], [X(110), 70], [X(126), 80], [X(126), 196], [X(76), 196], [X(66), 160]], BLUE, INK, 2.5);
        g.fillStyle = ORANGE;
        g.fillRect(s > 0 ? X(92) : X(110), 132, 18, 8);
        g.fillRect(s > 0 ? X(98) : X(116), 150, 18, 8);
        g.fillRect(s > 0 ? X(80) : X(96), 168, 16, 7);
        // circuits orange le long des pectoraux
        g.strokeStyle = ORANGE; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(X(48), 4); g.lineTo(X(70), 30); g.lineTo(X(70), 70); g.lineTo(X(86), 88); g.stroke();
        g.beginPath(); g.moveTo(X(62), 4); g.lineTo(X(82), 26); g.lineTo(X(82), 52); g.stroke();
        g.fillStyle = ORANGE; g.beginPath(); g.arc(X(86), 92, 5, 0, Math.PI * 2); g.fill();
        // abdos segmentés
        for (let r = 0; r < 4; r++) {
          const y0 = 112 + r * 21;
          poly(g, [[X(3), y0], [X(30 - r * 2), y0 - 2], [X(36 - r * 3), y0 + 18], [X(3), y0 + 19]], WHITE, INK, 2);
        }
        // traits en éventail en bas
        g.strokeStyle = INK; g.lineWidth = 2;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(X(40 + k * 6), 196); g.lineTo(X(58 + k * 10), 180); g.stroke(); }
      }
      g.strokeStyle = INK; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(128, 46); g.lineTo(128, 196); g.stroke();
      // ceinture bleue avec tirets orange
      poly(g, [[0, 200], [256, 200], [256, 240], [0, 240]], BLUE, INK, 3);
      g.fillStyle = '#c9cfd4'; g.fillRect(0, 204, 256, 6);
      g.fillStyle = ORANGE; g.fillRect(84, 216, 36, 9); g.fillRect(136, 216, 36, 9);
      g.fillStyle = GRAY; g.fillRect(0, 240, 256, 16);
    });
    // --- Torse arrière ---
    const torsoBack = tex(256, 256, (g, w, h) => {
      g.fillStyle = GRAY; g.fillRect(0, 0, w, h);
      poly(g, [[40, 10], [216, 10], [210, 120], [128, 190], [46, 120]], WHITE, INK, 2.5);
      for (const s of [-1, 1]) {
        const X = x => 128 + s * x;
        poly(g, [[X(80), 118], [X(122), 70], [X(124), 200], [X(20), 200]], BLUE, INK, 2.5);
        g.strokeStyle = ORANGE; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.arc(X(70), 50, 16, s > 0 ? Math.PI : -Math.PI / 2, s > 0 ? Math.PI * 1.5 : 0); g.stroke();
        g.fillStyle = ORANGE; g.fillRect(s > 0 ? X(84) : X(58), 108, 26, 7);
        g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.moveTo(X(4), 10); g.lineTo(X(30), 120); g.stroke();
      }
      g.fillStyle = '#d8dde1'; poly(g, [[118, 150], [138, 150], [138, 160], [118, 160]], '#d8dde1', INK, 1.5);
      g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(128, 10); g.lineTo(128, 150); g.stroke();
      poly(g, [[0, 200], [256, 200], [256, 240], [0, 240]], '#123c78', INK, 3);
    });

    const torsoGeo = new THREE.BoxGeometry(1.56, TORSO_H, 0.8);
    {
      const p = torsoGeo.attributes.position;
      for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setX(i, p.getX(i) * 0.78);
      torsoGeo.computeVertexNormals();
    }
    mesh(torsoGeo, [lightGray, lightGray, lightGray, lightGray, torsoFront, torsoBack], body, 0, torsoY + TORSO_H / 2, 0);

    // --- Hanches + jambes imprimées (cuisses, genouillères hexagonales bleues, pieds) ---
    const hipFront = tex(256, 64, (g, w, h) => {
      g.fillStyle = GRAY; g.fillRect(0, 0, w, h);
      for (const s of [-1, 1]) {
        const X = x => 128 + s * x;
        poly(g, [[X(14), 0], [X(110), 0], [X(96), 64], [X(14), 64]], WHITE, INK, 2);
        poly(g, [[X(14), 6], [X(60), 6], [X(50), 64], [X(14), 64]], BLUE, INK, 2);
        g.strokeStyle = ORANGE; g.lineWidth = 4;
        g.beginPath(); g.moveTo(X(70), 10); g.lineTo(X(86), 60); g.stroke();
      }
    });
    mesh(new THREE.BoxGeometry(1.56, HIP_H, 0.7), [lightGray, lightGray, lightGray, lightGray, hipFront, lightGray],
      body, 0, hipY + HIP_H / 2, 0);
    mesh(new THREE.BoxGeometry(0.2, HIP_H + 0.02, 0.74), navy, body, 0, hipY + HIP_H / 2, 0); // attache centrale bleu foncé

    function legFront(side) {
      return tex(128, 192, (g, w, h) => {
        g.fillStyle = GRAY; g.fillRect(0, 0, w, h);
        const X = x => (side < 0 ? x : w - x);
        // cuisse
        poly(g, [[X(8), 0], [X(120), 0], [X(116), 30], [X(8), 36]], WHITE, INK, 2);
        poly(g, [[X(70), 4], [X(118), 4], [X(114), 30], [X(80), 32]], BLUE, INK, 2);
        // genouillère hexagonale
        const hx = 64, hy = 70;
        const hex = r => [[hx - r, hy - r * 0.5], [hx, hy - r * 0.9], [hx + r, hy - r * 0.5], [hx + r, hy + r * 0.5], [hx, hy + r * 0.9], [hx - r, hy + r * 0.5]];
        poly(g, hex(50), WHITE, INK, 3);
        poly(g, hex(42), BLUE, INK, 2);
        g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.moveTo(hx - 42, hy); g.lineTo(hx + 42, hy); g.moveTo(hx, hy - 38); g.lineTo(hx, hy + 38); g.stroke();
        // traits orange sous le genou
        g.strokeStyle = ORANGE; g.lineWidth = 4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(hx - 30, 118); g.lineTo(hx - 40, 140); g.moveTo(hx + 30, 118); g.lineTo(hx + 40, 140); g.stroke();
        g.beginPath(); g.moveTo(X(30), 34); g.lineTo(X(20), 26); g.moveTo(X(98), 34); g.lineTo(X(108), 26); g.stroke();
        // pied : forme bleue + traits noirs
        poly(g, [[22, 192], [32, 170], [96, 170], [106, 192]], BLUE, INK, 2);
        g.strokeStyle = INK; g.lineWidth = 2;
        g.beginPath(); g.moveTo(10, 160); g.lineTo(32, 172); g.moveTo(118, 160); g.lineTo(96, 172);
        g.moveTo(64, 172); g.lineTo(64, 192); g.stroke();
      });
    }
    const legs = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.39, hipY + 0.1, 0);
      body.add(pivot);
      mesh(new THREE.BoxGeometry(0.74, LEG_H, 0.76), [lightGray, lightGray, lightGray, lightGray, legFront(s), lightGray],
        pivot, 0, -LEG_H / 2 - 0.1, 0.02);
      legs.push(pivot);
    }

    // --- Bras argent mat, mains bleu foncé ; main droite tient la plaque transparente ---
    const arms = [];
    const auraAnchors = [];
    const transClear = new THREE.MeshStandardMaterial({ color: 0xe8f6ff, emissive: 0x6fb8ff, emissiveIntensity: 0.6, roughness: 0.03, transparent: true, opacity: 0.45 });
    for (const s of [-1, 1]) {
      const { pivot, handC } = buildArm(s, body, neckY, flatSilver, navy);
      if (s < 0) {
        const disc = new THREE.Group();
        disc.position.set(0, 0, 0.16);
        disc.rotation.x = Math.PI / 2;
        handC.add(disc);
        mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.13, 28), transClear, disc, 0, 0, 0).castShadow = false;
        mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.1, 24), transClear, disc, 0, 0.115, 0).castShadow = false;
        mesh(new THREE.TorusGeometry(0.3, 0.012, 8, 32), transClear, disc, 0, 0.066, 0).rotation.x = Math.PI / 2;
        auraAnchors.push(disc);
      }
      arms.push(pivot);
    }

    // --- Tête robot argent : visière rouge, grille de dents ---
    const FW = 1024, FH = 291, FS = 338;
    const fx = x => FW / 2 + x * FS, fy = y => FH - y * FS;
    const faceMat = tex(FW, FH, (g) => {
      const grd = g.createLinearGradient(0, 0, FW, 0);
      grd.addColorStop(0, '#6d7277'); grd.addColorStop(0.5, '#c4c9cd'); grd.addColorStop(1, '#6d7277');
      g.fillStyle = grd; g.fillRect(0, 0, FW, FH);
      // visière rouge
      poly(g, [[fx(-0.34), fy(0.64)], [fx(0.34), fy(0.64)], [fx(0.34), fy(0.5)], [fx(-0.34), fy(0.5)]], '#b3141a', INK, 4);
      g.fillStyle = '#ff5a3c'; g.fillRect(fx(-0.32), fy(0.625), 0.64 * FS, 0.04 * FS);
      g.fillStyle = '#e8eef2'; g.fillRect(fx(-0.34), fy(0.69), 0.68 * FS, 0.035 * FS);
      // grille de la bouche
      poly(g, [[fx(-0.17), fy(0.37)], [fx(0.17), fy(0.37)], [fx(0.19), fy(0.3)], [fx(0.17), fy(0.24)], [fx(-0.17), fy(0.24)], [fx(-0.19), fy(0.3)]], '#f2f2ee', INK, 5);
      g.strokeStyle = INK; g.lineWidth = 5;
      for (const x of [-0.085, 0, 0.085]) { g.beginPath(); g.moveTo(fx(x), fy(0.37)); g.lineTo(fx(x), fy(0.24)); g.stroke(); }
      // lignes de panneaux
      g.lineWidth = 3;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(fx(s * 0.3), fy(0.5)); g.lineTo(fx(s * 0.22), fy(0.2)); g.lineTo(fx(s * 0.1), fy(0.06)); g.stroke();
        g.beginPath(); g.moveTo(fx(s * 0.34), fy(0.64)); g.lineTo(fx(s * 0.4), fy(0.78)); g.stroke();
      }
    });
    faceMat.metalness = 0.6; faceMat.roughness = 0.3;
    const head = new THREE.Group();
    head.position.y = neckY;
    body.add(head);
    mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.14, 16), flatSilver, head, 0, 0.07, 0);
    mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.86, 48, 1, false, Math.PI, Math.PI * 2), [faceMat, flatSilver, flatSilver], head, 0, 0.57, 0);

    // --- Capuche marron : grosse coque arrondie plus haute que la tête, plus longue derrière,
    //     ouverture en arche pour le visage, col épais qui retombe sur les épaules avec un rabat devant ---
    const hood = new THREE.Group();
    head.add(hood);
    {
      const T_LOW = 0.43 * Math.PI;
      // position d'un point de la capuche : theta (0 = sommet) et a (angle autour, 0 = devant)
      const hoodPoint = (theta, a) => {
        const dx = Math.sin(a), dz = Math.cos(a);
        let y, r, t = 0;
        if (theta <= Math.PI / 2) { y = 0.66 + 0.6 * Math.cos(theta) + 0.07 * Math.pow(Math.cos(theta), 4); r = Math.sin(theta); }
        else { t = (theta - Math.PI / 2) / T_LOW; y = 0.66 - t * 0.74; r = 1 + 0.14 * t * t; }
        const rx = 0.64 * r * (1 + 0.1 * t * t);
        const rz = (dz < 0 ? 0.76 : 0.64) * r * (1 - 0.12 * t);
        y -= 0.28 * t * t * t * Math.pow(Math.max(0, dz), 4);     // rabat devant sur la poitrine
        y += 0.06 * Math.max(0, -dz) * (1 - t) * Math.min(1, theta / 0.8); // arrière un peu plus haut
        return new THREE.Vector3(dx * rx, y, dz * rz - 0.05);
      };
      const thetaAtY = (y) => y >= 0.66 ? Math.acos(Math.min(1, (y - 0.66) / 0.62)) : Math.PI / 2 + T_LOW * (0.66 - y) / 0.74;
      const OPEN_BOT = 0.17, OPEN_TOP = 0.98;
      const openA = (y) => y < 0.74 ? 0.6 : 0.6 * Math.sqrt(Math.max(0, 1 - ((y - 0.74) / (OPEN_TOP - 0.74)) ** 2));

      const base = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2 + T_LOW).toNonIndexed();
      const src = base.attributes.position;
      const out = [];
      const tri = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
      for (let i = 0; i < src.count; i += 3) {
        for (let k = 0; k < 3; k++) {
          const ux = src.getX(i + k), uy = src.getY(i + k), uz = src.getZ(i + k);
          tri[k].copy(hoodPoint(Math.acos(Math.max(-1, Math.min(1, uy))), Math.atan2(ux, uz)));
        }
        const cx = (tri[0].x + tri[1].x + tri[2].x) / 3, cy = (tri[0].y + tri[1].y + tri[2].y) / 3, cz = (tri[0].z + tri[1].z + tri[2].z) / 3;
        const a = Math.atan2(cx, cz + 0.05);
        if (cy > OPEN_BOT && cy < OPEN_TOP && Math.abs(a) < openA(cy)) continue; // ouverture du visage
        for (const v of tri) out.push(v.x, v.y, v.z);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
      geo.computeVertexNormals();
      mesh(geo, hoodMat, hood, 0, 0, 0);

      // bord épais tout autour de l'ouverture
      const pts = [];
      const N = 24;
      for (let i = 0; i <= N; i++) {            // côté droit de bas en haut, arche, côté gauche
        const y = OPEN_BOT + (OPEN_TOP - OPEN_BOT) * Math.sin((i / N) * Math.PI / 2);
        pts.push(hoodPoint(thetaAtY(y), -openA(y)));
      }
      for (let i = N - 1; i >= 0; i--) {
        const y = OPEN_BOT + (OPEN_TOP - OPEN_BOT) * Math.sin((i / N) * Math.PI / 2);
        pts.push(hoodPoint(thetaAtY(y), openA(y)));
      }
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.055, 8, false), hoodMat, hood, 0, 0, 0);
    }

    const auraAnim = addAuras(auraAnchors, 0x9fdcff, auraAnchors, null);
    return {
      name: 'Cyborg', group: player, body, legs, arms, head, auraAnchors, sparkColor: 0xbfe8ff,
      update(t, speed, grounded, pulse) {
        transClear.emissiveIntensity = 0.5 + Math.sin(t * 5) * 0.25;
        auraAnim(pulse);
      },
    };
  }

  // ---------- Roster ----------
  const roster = [buildJorEl(), buildRobot()];
  roster.forEach(r => { r.group.visible = false; scene.add(r.group); });
  let ch = roster[0];
  let player = ch.group;
  player.visible = true;
  function selectChar(i) {
    const pos = player.position.clone(), rot = player.rotation.y;
    ch.group.visible = false;
    ch = roster[i]; player = ch.group;
    player.visible = true;
    player.position.copy(pos); player.rotation.y = rot;
  }

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
    const anchor = ch.auraAnchors[Math.floor(Math.random() * ch.auraAnchors.length)];
    const sp = sparks[sparkIdx++ % sparks.length];
    anchor.getWorldPosition(tmpV);
    sp.s.position.copy(tmpV).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.4));
    sp.v.set((Math.random() - 0.5) * 0.4, 0.6 + Math.random() * 0.8, (Math.random() - 0.5) * 0.4);
    sp.life = sp.max = 0.5 + Math.random() * 0.6;
    sp.s.material.color.setHex(ch.sparkColor);
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
    if (mode !== 'play') return;
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
    let ix = mode === 'play' ? input.x : 0, iy = mode === 'play' ? input.y : 0;
    if (mode === 'select') { keys.KeyW = keys.ArrowUp = keys.KeyZ = keys.KeyS = keys.ArrowDown = keys.KeyA = keys.ArrowLeft = keys.KeyQ = keys.KeyD = keys.ArrowRight = false; input.jump = false; }
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
      ch.legs[0].rotation.x = sw; ch.legs[1].rotation.x = -sw;
      ch.arms[0].rotation.x = -sw * 0.8; ch.arms[1].rotation.x = sw * 0.8;
      ch.body.position.y = Math.abs(Math.cos(state.walk)) * 0.06 * state.speed;
    } else {
      ch.legs[0].rotation.x = -0.5; ch.legs[1].rotation.x = 0.3;
      ch.arms[0].rotation.x = ch.arms[1].rotation.x = -2.6; // bras levés : envol de puissance
      ch.body.position.y = 0;
    }
    ch.head.rotation.y = Math.sin(t * 0.7) * 0.08 * (1 - state.speed);

    // Auras
    const pulse = 1 + Math.sin(t * 6) * 0.15 + Math.sin(t * 17) * 0.05;
    ch.update(t, state.speed, state.grounded, pulse);
    sparkAcc += dt * (25 + state.speed * 30) * Math.min(1, ch.auraAnchors.length / 3);
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

    // Caméra 3e personne (présentation tournante sur l'écran de choix)
    if (mode === 'select') { camYaw = state.facing + Math.sin(t * 0.6) * 0.7; camPitch = 0.12; camDist = 7.5; }
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

  // ---------- Écran de choix des persos ----------
  let mode = 'select', selIdx = 0;
  const cardsEl = document.getElementById('cards');
  function thumbnail(r) {
    roster.forEach(o => (o.group.visible = o === r));
    r.group.position.set(0, 0, 0); r.group.rotation.y = 0;
    const w = renderer.domElement.width, h = renderer.domElement.height;
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.set(0, 2.6, 6.2); camera.lookAt(0, 2.2, 0);
    r.update(0, 0, true, 1);
    renderer.render(scene, camera);
    // recadre en carré au centre
    const c = document.createElement('canvas'); c.width = c.height = 208;
    const side = Math.min(w, h) * 0.8;
    c.getContext('2d').drawImage(renderer.domElement, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 208, 208);
    return c.toDataURL();
  }
  roster.forEach((r, i) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<img src="${thumbnail(r)}"><div>${r.name}</div>`;
    const pick = e => { e.preventDefault(); e.stopPropagation(); selIdx = i; selectChar(i); refreshCards(); };
    card.addEventListener('touchstart', pick, { passive: false });
    card.addEventListener('mousedown', pick);
    cardsEl.appendChild(card);
  });
  function refreshCards() { [...cardsEl.children].forEach((c, i) => c.classList.toggle('on', i === selIdx)); }
  roster.forEach(o => (o.group.visible = o === ch));
  refreshCards();
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  function setMode(m) {
    mode = m;
    document.body.classList.toggle('playing', m === 'play');
    input.x = input.y = 0; input.jump = false;
    if (m === 'play') { camYaw = state.facing + Math.PI; camPitch = 0.25; camDist = 9; }
  }
  const onBtn = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.stopPropagation(); fn(); });
  };
  onBtn('play', () => setMode('play'));
  onBtn('persos', () => setMode('select'));

  function loop() {
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    step(dt, t);
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  camYaw = 0; // vue de face au lancement, comme la photo
  loop();
  window.__game = { get player() { return player; }, selectChar, setMode, camera, setYaw: y => (camYaw = y), setPitch: p => (camPitch = p), setDist: d => (camDist = d) };
})();
