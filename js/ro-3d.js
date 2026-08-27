// ==========================================================================
// RO — interactive 3D model (Three.js r128, UMD build)
// Stylized single-pass RO train: recognizable & correctly labeled,
// not a certified engineering drawing.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initReveal('.reveal');
  buildRoComponentList();
  buildRoComponentGrid();

  if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined'){
    const loading = document.getElementById('roViewerLoading');
    if (loading){
      loading.innerHTML = '<span>⚠️ تعذّر تحميل مكتبة Three.js من الشبكة. تصفّح مكوّنات النموذج عبر القائمة أدناه أو بطاقات المرجع الكاملة أسفل الصفحة.</span>';
    }
    return;
  }
  initRoViewer();
});

/* ---------------------------------------------------------------- Panel & lists --- */
function selectRo3d(id){
  const data = RO_3D_COMPONENTS.find(c => c.id === id);
  if (!data) return;

  document.getElementById('roPanelEmpty').style.display = 'none';
  const content = document.getElementById('roPanelContent');
  content.style.display = 'block';
  document.getElementById('roPanelTitle').textContent = data.nameAr;
  document.getElementById('roPanelEn').textContent = data.nameEn;
  document.getElementById('roPanelDesc').textContent = data.desc;

  document.querySelectorAll('#roComponentButtonList .component-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.id === id);
  });

  if (window.__roHighlight) window.__roHighlight(id);
}

function buildRoComponentList(){
  const host = document.getElementById('roComponentButtonList');
  if (!host) return;
  RO_3D_COMPONENTS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'component-btn';
    btn.type = 'button';
    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="component-dot" style="background:${c.color}"></span><span>${c.nameAr}</span>`;
    btn.addEventListener('click', () => selectRo3d(c.id));
    host.appendChild(btn);
  });
}

function buildRoComponentGrid(){
  const host = document.getElementById('roComponentGrid');
  if (!host) return;
  RO_3D_COMPONENTS.forEach((c, i) => {
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
      selectRo3d(c.id);
      document.getElementById('ro-model').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    host.appendChild(card);
  });
  initReveal('.component-card');
}

/* ---------------------------------------------------------------- 3D viewer --- */
function initRoViewer(){
  const stage = document.getElementById('roViewerStage');
  const loading = document.getElementById('roViewerLoading');

  // ---- layout constants ----
  const vesselX0 = -1, vesselX1 = 2, vesselLen = vesselX1 - vesselX0;
  const rows = [0.55, -0.15];
  const cols = [-0.7, 0, 0.7];
  const vesselPositions = [];
  rows.forEach(y => cols.forEach(z => vesselPositions.push({ y, z })));

  const feedStartX = -7.6, pretreatX = -5.2, pumpX = -3.2;
  const erdX = 3.3, erdY = -0.6;
  const permeateOutX = 4.9, concentrateOutX = 6.1;
  const headerY = 1.05, manifoldY = -0.55;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 200);
  camera.position.set(2, 5.5, 11.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  stage.insertBefore(renderer.domElement, stage.firstChild);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 19;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.7;
  controls.target.set(0, 0, 0);

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0x8fa8bd, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(6, 9, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xa78bfa, 1.2, 24);
  rim.position.set(0.5, 2, -4);
  scene.add(rim);
  const pumpGlow = new THREE.PointLight(0xffc23c, 1.8, 7);
  pumpGlow.position.set(pumpX, 0.6, 0);
  scene.add(pumpGlow);

  const root = new THREE.Group();
  scene.add(root);

  const meshesById = {};
  const pickable = [];
  const register = (id, mesh, opts) => {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  };
  const colorOf = (id) => new THREE.Color(RO_3D_COMPONENTS.find(c => c.id === id).color);

  // ================================================================ Seawater feed intake
  const seaMat = new THREE.MeshStandardMaterial({ color: colorOf('seawater-feed'), roughness: 0.3, metalness: 0.3 });
  const feedPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 12), seaMat);
  feedPipe.rotation.z = Math.PI / 2;
  feedPipe.position.set(feedStartX + 0.8, 0.2, 0);
  register('seawater-feed', feedPipe);
  root.add(feedPipe);
  const feedCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 12), seaMat);
  feedCone.rotation.z = -Math.PI / 2;
  feedCone.position.set(feedStartX + 1.75, 0.2, 0);
  register('seawater-feed', feedCone);
  root.add(feedCone);
  // connector to pretreatment
  const feedToPretreat = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, (pretreatX - (feedStartX + 1.75)), 10), seaMat);
  feedToPretreat.rotation.z = Math.PI / 2;
  feedToPretreat.position.set((pretreatX + feedStartX + 1.75) / 2, 0.2, 0);
  register('seawater-feed', feedToPretreat);
  root.add(feedToPretreat);

  // ================================================================ Pretreatment (filter bank)
  const pretreatMat = new THREE.MeshStandardMaterial({ color: colorOf('pretreatment'), roughness: 0.35, metalness: 0.25 });
  cols.forEach(z => {
    const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.3, 20), pretreatMat);
    filter.position.set(pretreatX, 0.15, z);
    register('pretreatment', filter);
    root.add(filter);
    const cap = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 8, 20), pretreatMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.set(pretreatX, 0.82, z);
    register('pretreatment', cap);
    root.add(cap);
  });
  const pretreatToPump = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, (pumpX - pretreatX - 0.3), 10), pretreatMat);
  pretreatToPump.rotation.z = Math.PI / 2;
  pretreatToPump.position.set((pumpX + pretreatX + 0.3) / 2, 0.2, 0);
  register('pretreatment', pretreatToPump);
  root.add(pretreatToPump);

  // ================================================================ High-pressure pump
  const pumpMat = new THREE.MeshStandardMaterial({ color: colorOf('hp-pump'), emissive: colorOf('hp-pump'), emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.4 });
  const pumpBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), pumpMat);
  pumpBody.position.set(pumpX, 0.2, 0);
  register('hp-pump', pumpBody);
  root.add(pumpBody);
  const pumpMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 16), pumpMat);
  pumpMotor.rotation.z = Math.PI / 2;
  pumpMotor.position.set(pumpX, 0.2, 0.75);
  register('hp-pump', pumpMotor);
  root.add(pumpMotor);
  const pumpToMembrane = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, (vesselX0 - pumpX - 0.35), 10), pumpMat);
  pumpToMembrane.rotation.z = Math.PI / 2;
  pumpToMembrane.position.set((vesselX0 + pumpX + 0.35) / 2, 0.2, 0);
  register('hp-pump', pumpToMembrane);
  root.add(pumpToMembrane);

  // ================================================================ Membrane pressure vessels
  const vesselMat = new THREE.MeshPhysicalMaterial({
    color: colorOf('membrane'), transparent: true, opacity: 0.4, roughness: 0.2,
    metalness: 0.3, side: THREE.DoubleSide, depthWrite: false
  });
  const vesselCapMat = new THREE.MeshStandardMaterial({ color: colorOf('membrane'), roughness: 0.35, metalness: 0.4 });
  vesselPositions.forEach(pos => {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, vesselLen, 20), vesselMat);
    shell.rotation.z = Math.PI / 2;
    shell.position.set((vesselX0 + vesselX1) / 2, pos.y, pos.z);
    register('membrane', shell);
    root.add(shell);
    [vesselX0, vesselX1].forEach(x => {
      const cap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 20), vesselCapMat);
      cap.rotation.y = Math.PI / 2;
      cap.position.set(x, pos.y, pos.z);
      register('membrane', cap);
      root.add(cap);
    });
  });
  // rack support frame (decorative, non-pickable)
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a4753, roughness: 0.6, metalness: 0.3 });
  [vesselX0 - 0.15, vesselX1 + 0.15].forEach(x => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 1.9), frameMat);
    beam.position.set(x, 0.2, 0);
    root.add(beam);
  });

  // ================================================================ Energy Recovery Device
  const erdMat = new THREE.MeshStandardMaterial({ color: colorOf('energy-recovery'), emissive: colorOf('energy-recovery'), emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.35 });
  const erdBody = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 20), erdMat);
  erdBody.rotation.z = Math.PI / 2;
  erdBody.position.set(erdX, erdY, 0);
  register('energy-recovery', erdBody);
  root.add(erdBody);
  // return pipe: recovered pressure carried back toward the feed line ahead of the pump
  const returnZ = 1.3;
  const returnStart = new THREE.Vector3(erdX, erdY + 0.5, 0.3);
  const returnMid = new THREE.Vector3((erdX + pumpX) / 2, 0.9, returnZ);
  const returnEnd = new THREE.Vector3(pumpX - 0.4, 0.35, returnZ);
  const returnCurve = new THREE.CatmullRomCurve3([returnStart, returnMid, returnEnd]);
  const returnTube = new THREE.Mesh(new THREE.TubeGeometry(returnCurve, 24, 0.045, 8, false), erdMat);
  register('energy-recovery', returnTube);
  root.add(returnTube);

  // ================================================================ Permeate header + outlet
  const permMat = new THREE.MeshStandardMaterial({ color: colorOf('permeate'), roughness: 0.35, metalness: 0.2 });
  const permHeader = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, (permeateOutX - vesselX0), 10), permMat);
  permHeader.rotation.z = Math.PI / 2;
  permHeader.position.set((vesselX0 + permeateOutX) / 2, headerY, 0);
  register('permeate', permHeader);
  root.add(permHeader);
  // riser stubs from each vessel row up to the header (visual only, one per row)
  rows.forEach(y => {
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, (headerY - y), 8), permMat);
    riser.position.set((vesselX0 + vesselX1) / 2, (headerY + y) / 2, 0);
    register('permeate', riser, { visualOnly: true });
    root.add(riser);
  });
  const permOutlet = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 12), permMat);
  permOutlet.rotation.z = -Math.PI / 2;
  permOutlet.position.set(permeateOutX + 0.35, headerY, 0);
  register('permeate', permOutlet);
  root.add(permOutlet);

  // ================================================================ Concentrate manifold + outlet
  const concMat = new THREE.MeshStandardMaterial({ color: colorOf('concentrate'), roughness: 0.3, metalness: 0.35, emissive: colorOf('concentrate'), emissiveIntensity: 0.2 });
  const concManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, (erdX - vesselX1), 10), concMat);
  concManifold.rotation.z = Math.PI / 2;
  concManifold.position.set((vesselX1 + erdX) / 2, manifoldY, 0);
  register('concentrate', concManifold);
  root.add(concManifold);
  const vesselToManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, (manifoldY - rows[1]) * -1, 8), concMat);
  vesselToManifold.position.set(vesselX1, (manifoldY + rows[1]) / 2, 0);
  register('concentrate', vesselToManifold, { visualOnly: true });
  root.add(vesselToManifold);
  const concOut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, (concentrateOutX - erdX - 0.35), 10), concMat);
  concOut.rotation.z = Math.PI / 2;
  concOut.position.set((erdX + 0.35 + concentrateOutX) / 2, manifoldY, 0);
  register('concentrate', concOut);
  root.add(concOut);
  const concCone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.35, 12), concMat);
  concCone.rotation.z = -Math.PI / 2;
  concCone.position.set(concentrateOutX + 0.4, manifoldY, 0);
  register('concentrate', concCone);
  root.add(concCone);

  // ---- ground disc for depth cue ----
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48),
    new THREE.MeshStandardMaterial({ color: 0x0a121a, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.4;
  scene.add(ground);

  /* ---- particle animations ---- */
  // 1) feed: seawater cone -> pretreatment -> pump -> membrane inlet face
  const feedParticles = [];
  const feedGroup = new THREE.Group();
  const feedPMat = new THREE.MeshBasicMaterial({ color: colorOf('seawater-feed') });
  for (let i = 0; i < 8; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), feedPMat);
    p.userData.offset = i / 8;
    feedGroup.add(p);
    feedParticles.push(p);
  }
  root.add(feedGroup);

  // 2) membrane crossing: per vessel, bulk flow along the vessel then a fate split —
  //    a minority "permeate" (colored green) drifting toward the header,
  //    the majority "concentrate" (colored red) continuing to the vessel end.
  const crossParticles = [];
  const crossGroup = new THREE.Group();
  const permPMatSmall = new THREE.MeshBasicMaterial({ color: colorOf('permeate') });
  const concPMatSmall = new THREE.MeshBasicMaterial({ color: colorOf('concentrate') });
  const feedTintMat = new THREE.MeshBasicMaterial({ color: colorOf('seawater-feed') });
  vesselPositions.forEach((pos, vi) => {
    for (let i = 0; i < 2; i++){
      const fate = (i + vi) % 3 === 0 ? 'permeate' : 'concentrate';
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), feedTintMat.clone());
      p.userData.y0 = pos.y; p.userData.z0 = pos.z; p.userData.fate = fate;
      p.userData.phase = (i / 2 + vi * 0.13) % 1;
      p.userData.permMat = permPMatSmall; p.userData.concMat = concPMatSmall; p.userData.feedMat = feedTintMat;
      crossGroup.add(p);
      crossParticles.push(p);
    }
  });
  root.add(crossGroup);

  // 3) permeate header: vessel midpoint -> outlet
  const permParticles = [];
  const permGroup = new THREE.Group();
  const permPMat = new THREE.MeshBasicMaterial({ color: colorOf('permeate') });
  for (let i = 0; i < 6; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), permPMat);
    p.userData.offset = i / 6;
    permGroup.add(p);
    permParticles.push(p);
  }
  root.add(permGroup);

  // 4) concentrate manifold: vessel end -> ERD -> discharge outlet
  const concParticles = [];
  const concGroup = new THREE.Group();
  const concPMat = new THREE.MeshBasicMaterial({ color: colorOf('concentrate') });
  for (let i = 0; i < 6; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), concPMat);
    p.userData.offset = i / 6;
    concGroup.add(p);
    concParticles.push(p);
  }
  root.add(concGroup);

  // 5) ERD return: recovered pressure energy carried back toward the pump inlet
  const erdParticles = [];
  const erdGroup = new THREE.Group();
  const erdPMat = new THREE.MeshBasicMaterial({ color: colorOf('energy-recovery') });
  for (let i = 0; i < 5; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), erdPMat);
    p.userData.offset = i / 5;
    erdGroup.add(p);
    erdParticles.push(p);
  }
  root.add(erdGroup);

  /* ---- highlight / selection ---- */
  const allMeshes = Object.values(meshesById).flat();
  window.__roHighlight = (id) => {
    allMeshes.forEach(m => {
      const isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.16 : 1);
      if (m.material && 'emissiveIntensity' in m.material){
        const base = (m.userData.componentId === 'hp-pump') ? 0.4 : (m.userData.componentId === 'energy-recovery' ? 0.45 : (m.userData.componentId === 'concentrate' ? 0.2 : 0));
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
    if (hit) selectRo3d(hit.userData.componentId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  });

  /* ---- toolbar buttons ---- */
  const btnAuto = document.getElementById('roBtnAutoRotate');
  btnAuto.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAuto.textContent = controls.autoRotate ? '⏸ إيقاف الدوران التلقائي' : '▶ تشغيل الدوران التلقائي';
    btnAuto.classList.toggle('is-active', controls.autoRotate);
  });
  document.getElementById('roBtnReset').addEventListener('click', () => {
    camera.position.set(2, 5.5, 11.5);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  let flowSpeed = 1;
  const btnFlow = document.getElementById('roBtnFlow');
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
  const splitU = 0.55;
  function animate(){
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();
    const dt = flowSpeed * t * 0.15;

    // 1) feed: cone -> membrane inlet face
    feedParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      p.position.set(feedStartX + 1.5 + u * (vesselX0 - (feedStartX + 1.5)), 0.2, 0);
    });

    // 2) membrane crossing
    crossParticles.forEach(p => {
      const u = (p.userData.phase + dt) % 1;
      const y0 = p.userData.y0, z0 = p.userData.z0;
      if (u < splitU){
        const x = vesselX0 + (u / splitU) * vesselLen * 0.6;
        p.position.set(x, y0, z0);
        p.material = p.userData.feedMat;
        p.scale.setScalar(1);
      } else {
        const u2 = (u - splitU) / (1 - splitU);
        const xBase = vesselX0 + vesselLen * 0.6;
        if (p.userData.fate === 'permeate'){
          p.position.set(xBase + u2 * 0.5, y0 + u2 * (headerY - y0), z0 * (1 - u2));
          p.material = p.userData.permMat;
        } else {
          p.position.set(xBase + u2 * (vesselX1 - xBase), y0, z0);
          p.material = p.userData.concMat;
        }
        p.scale.setScalar(0.85);
      }
    });

    // 3) permeate header
    permParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      p.position.set((vesselX0 + vesselX1) / 2 + u * (permeateOutX - (vesselX0 + vesselX1) / 2), headerY, 0);
    });

    // 4) concentrate manifold (through ERD)
    concParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      p.position.set(vesselX1 + u * (concentrateOutX - vesselX1), manifoldY, 0);
    });

    // 5) ERD return arc
    erdParticles.forEach(p => {
      const u = (p.userData.offset + dt) % 1;
      const pt = returnCurve.getPoint(u);
      p.position.copy(pt);
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  requestAnimationFrame(() => {
    if (loading){ loading.style.opacity = '0'; setTimeout(() => loading.remove(), 400); }
  });
}
