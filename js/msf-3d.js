// ==========================================================================
// MSF — interactive 3D model (Three.js r128, UMD build)
// Stylized multi-stage flash train: recognizable & correctly labeled,
// not a certified engineering drawing.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initReveal('.reveal');
  buildMsfComponentList();
  buildMsfComponentGrid();

  if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined'){
    const loading = document.getElementById('msfViewerLoading');
    if (loading){
      loading.innerHTML = '<span>⚠️ تعذّر تحميل مكتبة Three.js من الشبكة. تصفّح مكوّنات النموذج عبر القائمة أدناه أو بطاقات المرجع الكاملة أسفل الصفحة.</span>';
    }
    return;
  }
  initMsfViewer();
});

/* ---------------------------------------------------------------- Panel & lists --- */
function selectMsf3d(id){
  const data = MSF_3D_COMPONENTS.find(c => c.id === id);
  if (!data) return;

  document.getElementById('msfPanelEmpty').style.display = 'none';
  const content = document.getElementById('msfPanelContent');
  content.style.display = 'block';
  document.getElementById('msfPanelTitle').textContent = data.nameAr;
  document.getElementById('msfPanelEn').textContent = data.nameEn;
  document.getElementById('msfPanelDesc').textContent = data.desc;

  document.querySelectorAll('#msfComponentButtonList .component-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.id === id);
  });

  if (window.__msfHighlight) window.__msfHighlight(id);
}

function buildMsfComponentList(){
  const host = document.getElementById('msfComponentButtonList');
  if (!host) return;
  MSF_3D_COMPONENTS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'component-btn';
    btn.type = 'button';
    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="component-dot" style="background:${c.color}"></span><span>${c.nameAr}</span>`;
    btn.addEventListener('click', () => selectMsf3d(c.id));
    host.appendChild(btn);
  });
}

function buildMsfComponentGrid(){
  const host = document.getElementById('msfComponentGrid');
  if (!host) return;
  MSF_3D_COMPONENTS.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'component-card card reveal';
    card.innerHTML = `
      <span class="component-card-num">${String(i + 1).padStart(2, '0')}</span>
      <div>
        <h4 style="color:${c.color}">${c.nameAr}</h4>
        <span class="cc-en">${c.nameEn}</span>
        <p>${c.desc}</p>
      </div>`;
    card.addEventListener('click', () => {
      selectMsf3d(c.id);
      document.getElementById('msf-model').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    host.appendChild(card);
  });
  initReveal('.component-card');
}

/* ---------------------------------------------------------------- 3D viewer --- */
function initMsfViewer(){
  const stage = document.getElementById('msfViewerStage');
  const loading = document.getElementById('msfViewerLoading');

  const N = 6; // flash stages
  const spacing = 1.6;
  const stageX = (i) => -4 + i * spacing; // -4 .. 4
  const heaterX = stageX(0) - 2.2;        // -6.2, hot end
  const outX = stageX(N - 1) + 2.0;       // 6.0, cold end

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 200);
  camera.position.set(2, 5.5, 10.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  stage.insertBefore(renderer.domElement, stage.firstChild);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 18;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  controls.target.set(0, 0, 0);

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0x8fa8bd, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(6, 9, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xffab7a, 1.3, 24);
  rim.position.set(-6, 2, -4);
  scene.add(rim);
  const heaterGlow = new THREE.PointLight(0xff7a45, 2.2, 8);
  heaterGlow.position.set(heaterX, 0.5, 0);
  scene.add(heaterGlow);

  const root = new THREE.Group();
  scene.add(root);

  const meshesById = {};
  const pickable = [];
  const register = (id, mesh, opts) => {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  };
  const colorOf = (id) => new THREE.Color(MSF_3D_COMPONENTS.find(c => c.id === id).color);

  // ================================================================ Brine heater
  const heaterMat = new THREE.MeshStandardMaterial({ color: colorOf('brine-heater'), emissive: colorOf('brine-heater'), emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.3 });
  const heater = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.0, 24), heaterMat);
  heater.position.set(heaterX, 0.1, 0);
  register('brine-heater', heater);
  root.add(heater);
  // steam-in arrow (cone) indicating heat input from SMART100
  const steamInMat = new THREE.MeshStandardMaterial({ color: 0xffdd6b, emissive: 0xffdd6b, emissiveIntensity: 0.6 });
  const steamArrow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 12), steamInMat);
  steamArrow.rotation.z = Math.PI / 2;
  steamArrow.position.set(heaterX, 1.5, 0);
  register('brine-heater', steamArrow);
  root.add(steamArrow);
  const heaterPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 10), steamInMat);
  heaterPipe.position.set(heaterX, 1.1, 0);
  register('brine-heater', heaterPipe);
  root.add(heaterPipe);

  // ================================================================ Flash chambers (visual shells)
  const chamberMat = new THREE.MeshPhysicalMaterial({
    color: 0x5b6b78, transparent: true, opacity: 0.16, roughness: 0.2,
    metalness: 0.3, side: THREE.DoubleSide, depthWrite: false
  });
  const chamberFrameMat = new THREE.MeshStandardMaterial({ color: colorOf('flash-chambers'), roughness: 0.4, metalness: 0.4 });
  for (let i = 0; i < N; i++){
    const x = stageX(i);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.9, 1.5), chamberMat);
    shell.position.set(x, 0.1, 0);
    register('flash-chambers', shell, { visualOnly: true });
    root.add(shell);
    // top frame ring (bold, readable, doubles as a pickable proxy for the chamber)
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 4), chamberFrameMat);
    frame.rotation.x = Math.PI / 2;
    frame.scale.set(1, 1.05, 1);
    frame.position.set(x, 1.05, 0);
    register('flash-chambers', frame);
    root.add(frame);
  }

  // ================================================================ Heat-recovery tube bundles
  const tubeMat = new THREE.MeshStandardMaterial({ color: colorOf('heat-recovery'), roughness: 0.35, metalness: 0.4 });
  for (let i = 0; i < N; i++){
    const x = stageX(i);
    for (let t = 0; t < 5; t++){
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 8), tubeMat);
      tube.rotation.x = Math.PI / 2;
      tube.position.set(x, 0.58, -0.5 + t * 0.25);
      register('heat-recovery', tube);
      root.add(tube);
    }
  }
  // connecting pipe carrying seawater feed from cold end (outX) through every
  // stage's tube bundle up to the brine heater — countercurrent to the brine.
  const feedPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, (outX - heaterX), 10), tubeMat);
  feedPipe.rotation.z = Math.PI / 2;
  feedPipe.position.set((heaterX + outX) / 2, 0.58, 0.85);
  register('heat-recovery', feedPipe);
  root.add(feedPipe);

  // ================================================================ Brine path (pools + inter-stage connectors)
  const brineMat = new THREE.MeshPhysicalMaterial({ color: colorOf('brine-path'), transparent: true, opacity: 0.55, roughness: 0.3 });
  for (let i = 0; i < N; i++){
    const x = stageX(i);
    const pool = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.3), brineMat);
    pool.position.set(x, -0.75, 0);
    register('brine-path', pool);
    root.add(pool);
  }
  // brine header from heater into stage 0, and connectors between consecutive stages
  const brineConnMat = new THREE.MeshStandardMaterial({ color: colorOf('brine-path'), roughness: 0.4, metalness: 0.3 });
  const heaterToStage0 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, (stageX(0) - heaterX), 10), brineConnMat);
  heaterToStage0.rotation.z = Math.PI / 2;
  heaterToStage0.position.set((heaterX + stageX(0)) / 2, -0.75, 0.55);
  register('brine-path', heaterToStage0);
  root.add(heaterToStage0);
  for (let i = 0; i < N - 1; i++){
    const conn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, spacing, 10), brineConnMat);
    conn.rotation.z = Math.PI / 2;
    conn.position.set((stageX(i) + stageX(i + 1)) / 2, -0.75, 0.55);
    register('brine-path', conn);
    root.add(conn);
  }

  // ================================================================ Distillate trays + header
  const distMat = new THREE.MeshStandardMaterial({ color: colorOf('distillate'), roughness: 0.35, metalness: 0.2 });
  for (let i = 0; i < N; i++){
    const x = stageX(i);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 1.2), distMat);
    tray.position.set(x, -0.05, 0.05);
    register('distillate', tray);
    root.add(tray);
  }
  const distHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, (outX - stageX(0)) + 0.6, 10), distMat);
  distHeader.rotation.z = Math.PI / 2;
  distHeader.position.set((stageX(0) + outX) / 2, -0.05, -0.55);
  register('distillate', distHeader);
  root.add(distHeader);
  const productOutlet = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 12), distMat);
  productOutlet.rotation.z = -Math.PI / 2;
  productOutlet.position.set(outX + 0.5, -0.05, -0.55);
  register('distillate', productOutlet);
  root.add(productOutlet);

  // ================================================================ Seawater feed intake
  const seaMat = new THREE.MeshStandardMaterial({ color: colorOf('seawater-in'), roughness: 0.3, metalness: 0.3 });
  const seaInlet = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 12), seaMat);
  seaInlet.rotation.z = Math.PI / 2;
  seaInlet.position.set(outX + 0.6, 0.58, 0.85);
  register('seawater-in', seaInlet);
  root.add(seaInlet);
  const seaCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 12), seaMat);
  seaCone.rotation.z = -Math.PI / 2;
  seaCone.position.set(outX + 1.15, 0.58, 0.85);
  register('seawater-in', seaCone);
  root.add(seaCone);

  // ================================================================ Brine reject outlet
  const outMat = new THREE.MeshStandardMaterial({ color: colorOf('brine-out'), roughness: 0.3, metalness: 0.35, emissive: colorOf('brine-out'), emissiveIntensity: 0.25 });
  const brineOutPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 10), outMat);
  brineOutPipe.rotation.z = Math.PI / 2;
  brineOutPipe.position.set(outX + 0.35, -0.75, 0.55);
  register('brine-out', brineOutPipe);
  root.add(brineOutPipe);
  const brineOutCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 12), outMat);
  brineOutCone.rotation.z = -Math.PI / 2;
  brineOutCone.position.set(outX + 0.85, -0.75, 0.55);
  register('brine-out', brineOutCone);
  root.add(brineOutCone);

  // ---- ground disc for depth cue ----
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a121a, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.9;
  scene.add(ground);

  /* ---- particle animations (feedwater / vapor / brine / distillate) ---- */
  const feedParticles = [];
  const feedGroup = new THREE.Group();
  const feedPMat = new THREE.MeshBasicMaterial({ color: colorOf('seawater-in') });
  for (let i = 0; i < 8; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), feedPMat);
    p.userData.offset = i / 8;
    feedGroup.add(p);
    feedParticles.push(p);
  }
  root.add(feedGroup);

  const brineParticles = [];
  const brineGroup = new THREE.Group();
  const brinePMat = new THREE.MeshBasicMaterial({ color: colorOf('brine-path') });
  for (let i = 0; i < 8; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), brinePMat);
    p.userData.offset = i / 8;
    brineGroup.add(p);
    brineParticles.push(p);
  }
  root.add(brineGroup);

  const distParticles = [];
  const distGroup = new THREE.Group();
  const distPMat = new THREE.MeshBasicMaterial({ color: colorOf('distillate') });
  for (let i = 0; i < 8; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), distPMat);
    p.userData.offset = i / 8;
    distGroup.add(p);
    distParticles.push(p);
  }
  root.add(distGroup);

  // vapor flash puffs — one small rising cluster per chamber
  const vaporParticles = [];
  const vaporGroup = new THREE.Group();
  const vaporPMat = new THREE.MeshBasicMaterial({ color: colorOf('flash-chambers'), transparent: true, opacity: 0.75 });
  for (let i = 0; i < N; i++){
    for (let v = 0; v < 3; v++){
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), vaporPMat);
      p.userData.stage = i;
      p.userData.phase = v / 3 + Math.random() * 0.2;
      register('flash-chambers', p);
      vaporGroup.add(p);
      vaporParticles.push(p);
    }
  }
  root.add(vaporGroup);

  const railX0 = heaterX, railX1 = outX + 0.6;
  const railLen = railX1 - railX0;

  /* ---- highlight / selection ---- */
  const allMeshes = Object.values(meshesById).flat();
  window.__msfHighlight = (id) => {
    allMeshes.forEach(m => {
      const isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.16 : 1);
      if (m.material && 'emissiveIntensity' in m.material){
        const base = (m.userData.componentId === 'brine-heater') ? 0.55 : (m.userData.componentId === 'brine-out' ? 0.25 : 0);
        m.material.emissiveIntensity = isSel ? 0.9 : base;
      }
    });
  };

  /* ---- raycasting: hover + click ---- */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const canvas = renderer.domElement;
  canvas.style.cursor = 'grab';

  function pick(clientX, clientY){
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pickable, false);
    return hits.length ? hits[0].object : null;
  }

  let downPos = null;
  canvas.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointerup', (e) => {
    canvas.style.cursor = 'grab';
    if (!downPos) return;
    const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > 6) return;
    const hit = pick(e.clientX, e.clientY);
    if (hit) selectMsf3d(hit.userData.componentId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  });

  /* ---- toolbar buttons ---- */
  const btnAuto = document.getElementById('msfBtnAutoRotate');
  btnAuto.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAuto.textContent = controls.autoRotate ? '⏸ إيقاف الدوران التلقائي' : '▶ تشغيل الدوران التلقائي';
    btnAuto.classList.toggle('is-active', controls.autoRotate);
  });
  document.getElementById('msfBtnReset').addEventListener('click', () => {
    camera.position.set(2, 5.5, 10.5);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  let flowSpeed = 1;
  const btnFlow = document.getElementById('msfBtnFlow');
  if (btnFlow){
    btnFlow.addEventListener('click', () => {
      flowSpeed = flowSpeed > 0 ? 0 : 1;
      btnFlow.textContent = flowSpeed > 0 ? '⏸ إيقاف حركة الدورة' : '▶ تشغيل حركة الدورة';
      btnFlow.classList.toggle('is-active', flowSpeed > 0);
    });
  }

  /* ---- resize ---- */
  const resize = () => {
    const w = stage.clientWidth, h = stage.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);

  /* ---- render loop ---- */
  const clock = new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = flowSpeed * t * 0.15;

    // seawater feed: flows from cold end (outX) toward the heater (heaterX)
    feedParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      p.position.set(railX1 - u * railLen, 0.58, 0.85);
    });
    // brine: flows from the heater toward the cold end, opposite the feed
    brineParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      p.position.set(railX0 + u * (outX - heaterX + 0.35), -0.75, 0.55);
    });
    // distillate: cascades in the same direction as brine, from stage 0 to the outlet
    distParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      p.position.set(stageX(0) + u * (outX + 0.5 - stageX(0)), -0.02, -0.55);
    });
    // vapor: rises and fades within each chamber, looping
    vaporParticles.forEach(p => {
      const cx = stageX(p.userData.stage);
      const u = (p.userData.phase + t * 0.5) % 1;
      p.position.set(cx + (Math.sin(u * Math.PI * 4) * 0.15), -0.4 + u * 1.0, (Math.random() - 0.5) * 0.1 + 0.1);
      p.material.opacity = 0.75 * (1 - u);
      p.scale.setScalar(0.6 + u * 0.8);
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  requestAnimationFrame(() => {
    if (loading){ loading.style.opacity = '0'; setTimeout(() => loading.remove(), 400); }
  });
}
