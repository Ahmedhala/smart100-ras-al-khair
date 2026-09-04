// ==========================================================================
// Digital Twin-Inspired Simulation — interactive 3D model (Three.js r128, UMD build)
// The full system-level journey: SMART100 -> thermal/electric paths ->
// Ras Al-Khair plant <- seawater -> fresh water + reject brine.
// Stylized & correctly labeled, not a certified engineering drawing — see
// the dedicated reactor/MSF/RO/plant 3D models for what happens inside
// each node.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  buildTwinComponentList();
  buildTwinComponentGrid();

  if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined'){
    const loading = document.getElementById('twinViewerLoading');
    if (loading){
      loading.innerHTML = '<span>⚠️ تعذّر تحميل مكتبة Three.js من الشبكة. تصفّح مكوّنات المنظومة عبر القائمة أدناه أو بطاقات المرجع الكاملة أسفل الصفحة.</span>';
    }
    return;
  }
  initTwinViewer();
});

/* ---------------------------------------------------------------- Panel & lists --- */
function selectTwin3d(id){
  const data = TWIN_3D_COMPONENTS.find(c => c.id === id);
  if (!data) return;

  document.getElementById('twinPanelEmpty').style.display = 'none';
  const content = document.getElementById('twinPanelContent');
  content.style.display = 'block';
  document.getElementById('twinPanelTitle').textContent = data.nameAr;
  document.getElementById('twinPanelEn').textContent = data.nameEn;
  document.getElementById('twinPanelDesc').textContent = data.desc;

  document.querySelectorAll('#twinComponentButtonList .component-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.id === id);
  });

  if (window.__twinHighlight) window.__twinHighlight(id);
}

function buildTwinComponentList(){
  const host = document.getElementById('twinComponentButtonList');
  if (!host) return;
  TWIN_3D_COMPONENTS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'component-btn';
    btn.type = 'button';
    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="component-dot" style="background:${c.color}"></span><span>${c.nameAr}</span>`;
    btn.addEventListener('click', () => selectTwin3d(c.id));
    host.appendChild(btn);
  });
}

function buildTwinComponentGrid(){
  const host = document.getElementById('twinComponentGrid');
  if (!host) return;
  TWIN_3D_COMPONENTS.forEach((c, i) => {
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
      selectTwin3d(c.id);
      document.getElementById('twin-model').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    host.appendChild(card);
  });
  initReveal('.component-card');
}

/* ---------------------------------------------------------------- 3D viewer --- */
function initTwinViewer(){
  const stage = document.getElementById('twinViewerStage');
  const loading = document.getElementById('twinViewerLoading');

  const reactorZ = -6.5, plantZ = 0, outZ = 6.5;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 200);
  camera.position.set(7.5, 6, 11.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(stage.clientWidth, stage.clientHeight);
  stage.insertBefore(renderer.domElement, stage.firstChild);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 24;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.6;
  controls.target.set(0, 0, 0);

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0x8fa8bd, 0.62));
  const key = new THREE.DirectionalLight(0xffffff, 0.95);
  key.position.set(8, 11, 6);
  scene.add(key);
  const reactorGlow = new THREE.PointLight(0x6fb6ff, 1.6, 12);
  reactorGlow.position.set(0, 1.2, reactorZ);
  scene.add(reactorGlow);
  const plantGlow = new THREE.PointLight(0xa78bfa, 1.2, 12);
  plantGlow.position.set(0, 1, plantZ);
  scene.add(plantGlow);

  const root = new THREE.Group();
  scene.add(root);

  const meshesById = {};
  const pickable = [];
  const register = (id, mesh, opts) => {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  };
  const colorOf = (id) => new THREE.Color(TWIN_3D_COMPONENTS.find(c => c.id === id).color);

  // ================================================================ SMART100 station (x5 stylized units, representing x10)
  const reactorMat = new THREE.MeshStandardMaterial({ color: colorOf('smart100'), emissive: colorOf('smart100'), emissiveIntensity: 0.45, roughness: 0.3, metalness: 0.35 });
  const unitX = [-2.4, -1.2, 0, 1.2, 2.4];
  unitX.forEach(x => {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 20), reactorMat);
    body.position.set(x, 0.55, reactorZ);
    register('smart100', body);
    root.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), reactorMat);
    dome.position.set(x, 1.1, reactorZ);
    register('smart100', dome);
    root.add(dome);
  });

  // ================================================================ Plant block (MSF+RO hint) + seawater inlet + outputs
  const plantMat = new THREE.MeshStandardMaterial({ color: colorOf('plant-block'), roughness: 0.35, metalness: 0.25 });
  const plantBase = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 2.6), plantMat);
  plantBase.position.set(0, 0.3, plantZ);
  register('plant-block', plantBase);
  root.add(plantBase);
  const msfAccent = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.2), new THREE.MeshStandardMaterial({ color: 0xff7a45, roughness: 0.4 }));
  msfAccent.position.set(-1.15, 0.66, plantZ);
  register('plant-block', msfAccent);
  root.add(msfAccent);
  const roAccent = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 2.2), new THREE.MeshStandardMaterial({ color: 0xffc23c, roughness: 0.4 }));
  roAccent.position.set(1.15, 0.66, plantZ);
  register('plant-block', roAccent);
  root.add(roAccent);

  const seaMat = new THREE.MeshStandardMaterial({ color: colorOf('seawater-path'), roughness: 0.3, metalness: 0.3 });
  const seaHouse = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), seaMat);
  seaHouse.position.set(-4.4, 0.25, plantZ);
  register('seawater-path', seaHouse);
  root.add(seaHouse);

  const freshMat = new THREE.MeshStandardMaterial({ color: colorOf('fresh-water'), roughness: 0.3, metalness: 0.3 });
  const freshTank = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 24), freshMat);
  freshTank.position.set(-1.2, 0.6, outZ);
  register('fresh-water', freshTank);
  root.add(freshTank);
  const freshCap = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 10, 24), freshMat);
  freshCap.rotation.x = Math.PI / 2;
  freshCap.position.set(-1.2, 1.22, outZ);
  register('fresh-water', freshCap);
  root.add(freshCap);

  const brineMat = new THREE.MeshStandardMaterial({ color: colorOf('brine-path'), roughness: 0.3, metalness: 0.35, emissive: colorOf('brine-path'), emissiveIntensity: 0.2 });
  const brinePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.0, 14), brineMat);
  brinePipe.rotation.x = Math.PI / 2;
  brinePipe.position.set(1.2, 0.2, outZ - 0.1);
  register('brine-path', brinePipe);
  root.add(brinePipe);
  const brineCone = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.4, 14), brineMat);
  brineCone.rotation.x = Math.PI / 2;
  brineCone.position.set(1.2, 0.2, outZ + 0.55);
  register('brine-path', brineCone);
  root.add(brineCone);

  // ---- ground pad ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 17),
    new THREE.MeshStandardMaterial({ color: 0x0a121a, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  /* ---- connecting pipes (curved tubes) + their flow particles ---- */
  const pipeGroups = []; // { curve, group: THREE.Group }
  function addPipe(id, from, to, color, particleCount){
    const mid = new THREE.Vector3((from.x + to.x) / 2, Math.max(from.y, to.y) + 0.7, (from.z + to.z) / 2);
    const curve = new THREE.CatmullRomCurve3([from.clone(), mid, to.clone()]);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.85 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 34, 0.05, 8, false), mat);
    register(id, tube, { visualOnly: true });
    root.add(tube);

    const pGroup = new THREE.Group();
    const pMat = new THREE.MeshBasicMaterial({ color });
    const n = particleCount || 5;
    for (let i = 0; i < n; i++){
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), pMat);
      p.userData.offset = i / n;
      pGroup.add(p);
    }
    root.add(pGroup);
    pipeGroups.push({ curve, group: pGroup });
  }

  const reactorThermalPt = new THREE.Vector3(-1.2, 0.9, reactorZ);
  const reactorElectricPt = new THREE.Vector3(1.2, 0.9, reactorZ);
  const loopPt = new THREE.Vector3(-1.2, 1.35, (reactorZ + plantZ) / 2); // intermediate loop, raised so it reads as a distinct node between reactor and plant, not just a pipe waypoint
  const plantThermalPt = new THREE.Vector3(-1.15, 0.66, plantZ);
  const plantElectricPt = new THREE.Vector3(1.15, 0.66, plantZ);
  const seaPt = new THREE.Vector3(-4.0, 0.25, plantZ);
  const plantSeaPt = new THREE.Vector3(-2.3, 0.3, plantZ);
  const plantOutPt = new THREE.Vector3(0, 0.6, plantZ + 1.3);
  const freshPt = new THREE.Vector3(-1.2, 0.6, outZ);
  const brinePt = new THREE.Vector3(1.2, 0.2, outZ);

  // ---- Intermediate loop node: a double-shelled heat exchanger, sitting
  // physically between the reactor's extraction steam and the plant's
  // brine heater — a mandatory IAEA-required radiological safety barrier,
  // not a design choice. Rendered as two concentric shells (outer =
  // secondary-side steam jacket, inner = higher-pressure water side) so
  // the "double barrier" reads visually, not just in the description text.
  const loopOuterMat = new THREE.MeshStandardMaterial({ color: colorOf('intermediate-loop'), roughness: 0.35, metalness: 0.4, transparent: true, opacity: 0.55 });
  const loopOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.9, 20), loopOuterMat);
  loopOuter.rotation.z = Math.PI / 2;
  loopOuter.position.copy(loopPt);
  register('intermediate-loop', loopOuter);
  root.add(loopOuter);
  const loopInnerMat = new THREE.MeshStandardMaterial({ color: colorOf('intermediate-loop'), roughness: 0.25, metalness: 0.5, emissive: colorOf('intermediate-loop'), emissiveIntensity: 0.35 });
  const loopInner = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.05, 16), loopInnerMat);
  loopInner.rotation.z = Math.PI / 2;
  loopInner.position.copy(loopPt);
  register('intermediate-loop', loopInner);
  root.add(loopInner);

  // Two segments either side of the barrier: reactor extraction steam IN,
  // then a visually distinct (paler) run out to the brine heater — same
  // "thermal-path" id so both read as one continuous journey step, but the
  // node in between is its own separately-selectable, separately-lit
  // component, not just a waypoint on the pipe curve.
  addPipe('thermal-path', reactorThermalPt, loopPt, 0xff7a45, 4);
  addPipe('thermal-path', loopPt, plantThermalPt, 0xffb27a, 4);
  addPipe('electric-path', reactorElectricPt, plantElectricPt, 0xffc23c, 6);
  addPipe('seawater-path', seaPt, plantSeaPt, 0x3fb8e0, 4);
  addPipe('fresh-water', plantOutPt, freshPt, 0x33c46a, 5);
  addPipe('brine-path', plantOutPt, brinePt, 0xef5757, 4);

  /* ---- highlight / selection ---- */
  const allMeshes = Object.values(meshesById).flat();
  window.__twinHighlight = (id) => {
    allMeshes.forEach(m => {
      const isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.16 : 1);
      if (m.material && 'emissiveIntensity' in m.material){
        const base = (m.userData.componentId === 'smart100') ? 0.45 : (m.userData.componentId === 'brine-path' ? 0.2 : 0);
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
    if (hit) selectTwin3d(hit.userData.componentId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  });

  /* ---- toolbar buttons ---- */
  const btnAuto = document.getElementById('twinBtnAutoRotate');
  btnAuto.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAuto.textContent = controls.autoRotate ? '⏸ إيقاف الدوران التلقائي' : '▶ تشغيل الدوران التلقائي';
    btnAuto.classList.toggle('is-active', controls.autoRotate);
  });
  document.getElementById('twinBtnReset').addEventListener('click', () => {
    camera.position.set(7.5, 6, 11.5);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  let flowSpeed = 1;
  const btnFlow = document.getElementById('twinBtnFlow');
  if (btnFlow){
    btnFlow.addEventListener('click', () => {
      flowSpeed = flowSpeed > 0 ? 0 : 1;
      btnFlow.textContent = flowSpeed > 0 ? '⏸ إيقاف حركة التدفق' : '▶ تشغيل حركة التدفق';
      btnFlow.classList.toggle('is-active', flowSpeed > 0);
    });
  }

  // ---- guided "full journey" narration: walks the component list in order,
  // auto-selecting each one (which drives the panel text + 3D highlight). ----
  const journeyOrder = ['smart100', 'thermal-path', 'intermediate-loop', 'electric-path', 'seawater-path', 'plant-block', 'fresh-water', 'brine-path'];
  let journeyRunning = false, journeyTimer = null;
  const btnJourney = document.getElementById('twinBtnJourney');
  function stopJourney(){
    journeyRunning = false;
    clearTimeout(journeyTimer);
    if (btnJourney){
      btnJourney.textContent = '▶ تشغيل الرحلة الكاملة';
      btnJourney.classList.remove('is-active');
    }
  }
  function playJourney(){
    journeyRunning = true;
    if (btnJourney){
      btnJourney.textContent = '⏸ إيقاف الرحلة';
      btnJourney.classList.add('is-active');
    }
    let i = 0;
    const step = () => {
      if (!journeyRunning || i >= journeyOrder.length){ stopJourney(); return; }
      selectTwin3d(journeyOrder[i]);
      i++;
      journeyTimer = setTimeout(step, 1600);
    };
    step();
  }
  if (btnJourney){
    btnJourney.addEventListener('click', () => { journeyRunning ? stopJourney() : playJourney(); });
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
    const dt = flowSpeed * t * 0.12;

    pipeGroups.forEach(({ curve, group }) => {
      group.children.forEach(p => {
        const u = (p.userData.offset + dt) % 1;
        p.position.copy(curve.getPoint(u));
      });
    });

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  requestAnimationFrame(() => {
    if (loading){ loading.style.opacity = '0'; setTimeout(() => loading.remove(), 400); }
  });
}
