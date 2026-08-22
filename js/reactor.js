// ==========================================================================
// SMART100 — interactive 3D reactor model (Three.js r128, UMD build)
// Stylized integral-PWR geometry: recognizable & correctly labeled,
// not a certified engineering drawing.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initReveal('.reveal');
  buildComponentList();
  buildComponentGrid();

  if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined'){
    const loading = document.getElementById('viewerLoading');
    if (loading){
      loading.innerHTML = '<span>⚠️ تعذّر تحميل مكتبة Three.js من الشبكة. تصفّح مكوّنات المفاعل عبر القائمة أدناه أو بطاقات المرجع الكاملة أسفل الصفحة.</span>';
    }
    return;
  }
  initViewer();
});

/* ---------------------------------------------------------------- Panel & lists --- */
function selectComponent(id){
  const data = REACTOR_COMPONENTS.find(c => c.id === id);
  if (!data) return;

  document.getElementById('panelEmpty').style.display = 'none';
  const content = document.getElementById('panelContent');
  content.style.display = 'block';
  document.getElementById('panelTitle').textContent = data.nameAr;
  document.getElementById('panelEn').textContent = data.nameEn;
  document.getElementById('panelDesc').textContent = data.desc;

  document.querySelectorAll('.component-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.id === id);
  });

  if (window.__reactorHighlight) window.__reactorHighlight(id);
}

function buildComponentList(){
  const host = document.getElementById('componentButtonList');
  if (!host) return;
  REACTOR_COMPONENTS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'component-btn';
    btn.type = 'button';
    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="component-dot" style="background:${c.color}"></span><span>${c.nameAr}</span>`;
    btn.addEventListener('click', () => selectComponent(c.id));
    host.appendChild(btn);
  });
}

function buildComponentGrid(){
  const host = document.getElementById('componentGrid');
  if (!host) return;
  REACTOR_COMPONENTS.forEach((c, i) => {
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
      selectComponent(c.id);
      document.getElementById('model').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    host.appendChild(card);
  });
  initReveal('.component-card');
}

/* ---------------------------------------------------------------- 3D viewer --- */
function initViewer(){
  const stage = document.getElementById('viewerStage');
  const loading = document.getElementById('viewerLoading');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, stage.clientWidth / stage.clientHeight, 0.1, 100);
  camera.position.set(5.2, 2.6, 5.6);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  stage.insertBefore(renderer.domElement, stage.firstChild);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.2;
  controls.maxDistance = 11;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.target.set(0, -0.2, 0);

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0x8fa8bd, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 0.9);
  key.position.set(6, 8, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0x3f8fd6, 1.4, 20);
  rim.position.set(-4, 1, -3);
  scene.add(rim);
  const coreGlow = new THREE.PointLight(0x6fb6ff, 2.2, 6);
  coreGlow.position.set(0, -1.5, 0);
  scene.add(coreGlow);

  // ---- root group (whole reactor + turbine) ----
  const root = new THREE.Group();
  scene.add(root);

  const meshesById = {}; // id -> [meshes] for highlighting
  const pickable = [];   // flat list of meshes for raycasting
  const register = (id, mesh, opts) => {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    // Large translucent shells (RPV, coolant) fully enclose the internals —
    // if raycastable they'd always be hit first, making core/fuel/etc. unclickable.
    // They stay selectable via the sidebar list, just not by direct 3D click.
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  };
  const colorOf = (id) => new THREE.Color(REACTOR_COMPONENTS.find(c => c.id === id).color);

  // ---- RPV shell (semi-transparent) ----
  const rpvGeo = new THREE.CylinderGeometry(1.3, 1.3, 6, 40, 1, false);
  const rpvMat = new THREE.MeshPhysicalMaterial({
    color: 0x5b6b78, transparent: true, opacity: 0.22, roughness: 0.25,
    metalness: 0.4, side: THREE.DoubleSide, depthWrite: false
  });
  const rpv = new THREE.Mesh(rpvGeo, rpvMat);
  register('rpv', rpv, { visualOnly: true });
  root.add(rpv);
  // vessel head caps (bold rings for readability)
  [3, -3].forEach(y => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.045, 10, 40), new THREE.MeshStandardMaterial({ color: 0x8291a0, metalness: 0.6, roughness: 0.35 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    rpv.add(ring); // decorative, not separately pickable
  });

  // ---- core ----
  const coreMat = new THREE.MeshStandardMaterial({ color: colorOf('core'), emissive: colorOf('core'), emissiveIntensity: 0.5, roughness: 0.35 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.3, 24), coreMat);
  core.position.y = -1.6;
  register('core', core);
  root.add(core);

  // ---- fuel rods (ring inside core) ----
  const fuelGroup = new THREE.Group();
  const fuelMat = new THREE.MeshStandardMaterial({ color: colorOf('fuel'), emissive: colorOf('fuel'), emissiveIntensity: 0.35, roughness: 0.3 });
  for (let i = 0; i < 14; i++){
    const a = (i / 14) * Math.PI * 2;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 8), fuelMat);
    rod.position.set(Math.cos(a) * 0.42, -1.6, Math.sin(a) * 0.42);
    register('fuel', rod);
    fuelGroup.add(rod);
  }
  root.add(fuelGroup);

  // ---- control rod drives (top housings + thin shafts into core) ----
  const crdmGroup = new THREE.Group();
  const crdmMat = new THREE.MeshStandardMaterial({ color: colorOf('control-rods'), metalness: 0.5, roughness: 0.4 });
  for (let i = 0; i < 6; i++){
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.4, z = Math.sin(a) * 0.4;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.6, 8), crdmMat);
    shaft.position.set(x, 0.3, z);
    register('control-rods', shaft);
    crdmGroup.add(shaft);
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 12), crdmMat);
    housing.position.set(x, 3.35, z);
    register('control-rods', housing);
    crdmGroup.add(housing);
  }
  root.add(crdmGroup);

  // ---- steam generator (tube-bundle ring) ----
  const sgGroup = new THREE.Group();
  const sgMat = new THREE.MeshStandardMaterial({ color: colorOf('steam-gen'), roughness: 0.4, metalness: 0.25 });
  for (let i = 0; i < 22; i++){
    const a = (i / 22) * Math.PI * 2;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8), sgMat);
    tube.position.set(Math.cos(a) * 1.02, 0.35, Math.sin(a) * 1.02);
    register('steam-gen', tube);
    sgGroup.add(tube);
  }
  root.add(sgGroup);

  // ---- primary coolant (translucent flow shell + rising particles) ----
  const coolantMat = new THREE.MeshBasicMaterial({ color: colorOf('coolant'), transparent: true, opacity: 0.16, side: THREE.DoubleSide });
  const coolantShell = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 3.6, 32, 1, true), coolantMat);
  coolantShell.position.y = -0.2;
  register('coolant', coolantShell, { visualOnly: true });
  root.add(coolantShell);

  const coolantParticles = new THREE.Group();
  const particleMat = new THREE.MeshBasicMaterial({ color: colorOf('coolant') });
  const particles = [];
  for (let i = 0; i < 10; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), particleMat);
    const a = (i / 10) * Math.PI * 2;
    p.userData.angle = a;
    p.userData.speed = 0.4 + Math.random() * 0.2;
    coolantParticles.add(p);
    particles.push(p);
  }
  root.add(coolantParticles);

  // ---- pressurizer (top dome) ----
  const pzrMat = new THREE.MeshStandardMaterial({ color: colorOf('pressurizer'), roughness: 0.35, metalness: 0.2 });
  const pzr = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.8), pzrMat);
  pzr.position.y = 2.15;
  register('pressurizer', pzr);
  root.add(pzr);

  // ---- safety system valves (small boxes near top exterior) ----
  const safetyGroup = new THREE.Group();
  const safetyMat = new THREE.MeshStandardMaterial({ color: colorOf('safety'), roughness: 0.4, metalness: 0.3 });
  for (let i = 0; i < 4; i++){
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.22), safetyMat);
    valve.position.set(Math.cos(a) * 1.45, 2.55, Math.sin(a) * 1.45);
    register('safety', valve);
    safetyGroup.add(valve);
  }
  root.add(safetyGroup);

  // ---- secondary system pipes (steam + feedwater to turbine) ----
  const secGroup = new THREE.Group();
  const secMat = new THREE.MeshStandardMaterial({ color: colorOf('secondary'), roughness: 0.35, metalness: 0.35 });
  const steamPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 12), secMat);
  steamPipe.rotation.z = Math.PI / 2;
  steamPipe.position.set(2.55, 0.75, 0);
  register('secondary', steamPipe);
  secGroup.add(steamPipe);
  const fwPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 12), secMat);
  fwPipe.rotation.z = Math.PI / 2;
  fwPipe.position.set(2.55, 0.15, 0);
  register('secondary', fwPipe);
  secGroup.add(fwPipe);
  root.add(secGroup);

  // ---- turbine + generator assembly ----
  const turbGroup = new THREE.Group();
  const turbMat = new THREE.MeshStandardMaterial({ color: colorOf('turbine'), roughness: 0.3, metalness: 0.5 });
  const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 1.4, 20), turbMat);
  turbine.rotation.z = Math.PI / 2;
  turbine.position.set(4.3, 0.45, 0);
  register('turbine', turbine);
  turbGroup.add(turbine);
  const generator = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 20), turbMat);
  generator.rotation.z = Math.PI / 2;
  generator.position.set(5.3, 0.45, 0);
  register('turbine', generator);
  turbGroup.add(generator);
  root.add(turbGroup);

  // ---- ground disc for depth cue ----
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a121a, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -3.4;
  scene.add(ground);

  /* ---- highlight / selection ---- */
  const allMeshes = Object.values(meshesById).flat();
  window.__reactorHighlight = (id) => {
    allMeshes.forEach(m => {
      const isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.18 : 1);
      if (m.material && 'emissiveIntensity' in m.material){
        m.material.emissiveIntensity = isSel ? 0.9 : (m.userData.componentId === 'core' || m.userData.componentId === 'fuel' ? 0.4 : 0);
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
    if (Math.sqrt(dx * dx + dy * dy) > 6) return; // was a drag, not a click
    const hit = pick(e.clientX, e.clientY);
    if (hit) selectComponent(hit.userData.componentId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  });

  /* ---- toolbar buttons ---- */
  const btnAuto = document.getElementById('btnAutoRotate');
  btnAuto.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAuto.textContent = controls.autoRotate ? '⏸ إيقاف الدوران التلقائي' : '▶ تشغيل الدوران التلقائي';
    btnAuto.classList.toggle('is-active', controls.autoRotate);
  });
  document.getElementById('btnReset').addEventListener('click', () => {
    camera.position.set(5.2, 2.6, 5.6);
    controls.target.set(0, -0.2, 0);
    controls.update();
  });

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
    particles.forEach(p => {
      const y = -2.2 + ((t * p.userData.speed) % 3.6);
      p.position.set(Math.cos(p.userData.angle) * 1.15, y, Math.sin(p.userData.angle) * 1.15);
    });
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  requestAnimationFrame(() => {
    if (loading){ loading.style.opacity = '0'; setTimeout(() => loading.remove(), 400); }
  });
}
