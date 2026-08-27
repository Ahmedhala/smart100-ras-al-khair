// ==========================================================================
// Whole-plant — interactive 3D model (Three.js r128, UMD build)
// A high-level overview: two unit blocks (MSF / RO), shared energy and
// seawater inputs, shared product-water and brine outputs. Stylized &
// correctly labeled, not a certified engineering drawing — see the
// dedicated MSF/RO 3D models for what happens inside each block.
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // plant.js already calls initReveal('.reveal') for this page's static sections.
  buildPlantComponentList();
  buildPlantComponentGrid();

  if (typeof THREE === 'undefined' || typeof THREE.OrbitControls === 'undefined'){
    const loading = document.getElementById('plant3dViewerLoading');
    if (loading){
      loading.innerHTML = '<span>⚠️ تعذّر تحميل مكتبة Three.js من الشبكة. تصفّح مكوّنات المحطة عبر القائمة أدناه أو بطاقات المرجع الكاملة أسفل الصفحة.</span>';
    }
    return;
  }
  initPlant3dViewer();
});

/* ---------------------------------------------------------------- Panel & lists --- */
function selectPlant3d(id){
  const data = PLANT_3D_COMPONENTS.find(c => c.id === id);
  if (!data) return;

  document.getElementById('plant3dPanelEmpty').style.display = 'none';
  const content = document.getElementById('plant3dPanelContent');
  content.style.display = 'block';
  document.getElementById('plant3dPanelTitle').textContent = data.nameAr;
  document.getElementById('plant3dPanelEn').textContent = data.nameEn;
  document.getElementById('plant3dPanelDesc').textContent = data.desc;

  document.querySelectorAll('#plant3dComponentButtonList .component-btn').forEach(btn => {
    btn.classList.toggle('is-selected', btn.dataset.id === id);
  });

  if (window.__plant3dHighlight) window.__plant3dHighlight(id);
}

function buildPlantComponentList(){
  const host = document.getElementById('plant3dComponentButtonList');
  if (!host) return;
  PLANT_3D_COMPONENTS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'component-btn';
    btn.type = 'button';
    btn.dataset.id = c.id;
    btn.innerHTML = `<span class="component-dot" style="background:${c.color}"></span><span>${c.nameAr}</span>`;
    btn.addEventListener('click', () => selectPlant3d(c.id));
    host.appendChild(btn);
  });
}

function buildPlantComponentGrid(){
  const host = document.getElementById('plant3dComponentGrid');
  if (!host) return;
  PLANT_3D_COMPONENTS.forEach((c, i) => {
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
      selectPlant3d(c.id);
      document.getElementById('plant-model').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    host.appendChild(card);
  });
  initReveal('.component-card');
}

/* ---------------------------------------------------------------- 3D viewer --- */
function initPlant3dViewer(){
  const stage = document.getElementById('plant3dViewerStage');
  const loading = document.getElementById('plant3dViewerLoading');

  const msfX = -3.4, roX = 3.4;
  const blockZ = [-2.4, -0.8, 0.8, 2.4];
  const inZ = -6.2, outZ = 6.4;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.1, 200);
  camera.position.set(9, 6.5, 10.5);

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
  const msfGlow = new THREE.PointLight(0xff7a45, 1.4, 12);
  msfGlow.position.set(msfX, 1.5, 0);
  scene.add(msfGlow);
  const roGlow = new THREE.PointLight(0xffc23c, 1.4, 12);
  roGlow.position.set(roX, 1.5, 0);
  scene.add(roGlow);

  const root = new THREE.Group();
  scene.add(root);

  const meshesById = {};
  const pickable = [];
  const register = (id, mesh, opts) => {
    mesh.userData.componentId = id;
    (meshesById[id] = meshesById[id] || []).push(mesh);
    if (!(opts && opts.visualOnly)) pickable.push(mesh);
  };
  const colorOf = (id) => new THREE.Color(PLANT_3D_COMPONENTS.find(c => c.id === id).color);

  // ================================================================ Energy input (elevated pylon)
  const energyMat = new THREE.MeshStandardMaterial({ color: colorOf('energy-input'), emissive: colorOf('energy-input'), emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.4 });
  const pylonMast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 2.2, 12), energyMat);
  pylonMast.position.set(0, 1.0, inZ);
  register('energy-input', pylonMast);
  root.add(pylonMast);
  const pylonBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 0.14), energyMat);
  pylonBar.position.set(0, 2.0, inZ);
  register('energy-input', pylonBar);
  root.add(pylonBar);

  // ================================================================ Seawater intake (ground structure)
  const seaMat = new THREE.MeshStandardMaterial({ color: colorOf('seawater-intake'), roughness: 0.3, metalness: 0.3 });
  const intakeHouse = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 1.1), seaMat);
  intakeHouse.position.set(0, 0.35, inZ + 0.9);
  register('seawater-intake', intakeHouse);
  root.add(intakeHouse);
  const intakeCone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.35, 12), seaMat);
  intakeCone.rotation.x = -Math.PI / 2;
  intakeCone.position.set(0, 0.35, inZ + 1.6);
  register('seawater-intake', intakeCone);
  root.add(intakeCone);

  // ================================================================ MSF block (×4 stylized trains)
  const msfMat = new THREE.MeshStandardMaterial({ color: colorOf('msf-block'), roughness: 0.35, metalness: 0.25 });
  const msfRingMat = new THREE.MeshStandardMaterial({ color: 0xffab7a, roughness: 0.4, metalness: 0.35 });
  blockZ.forEach(z => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.85), msfMat);
    body.position.set(msfX, 0.35, z);
    register('msf-block', body);
    root.add(body);
    [-0.45, 0, 0.45].forEach(dz => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 16), msfRingMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(msfX, 0.68, z + dz);
      register('msf-block', ring);
      root.add(ring);
    });
  });

  // ================================================================ RO block (×4 stylized vessel racks)
  const roMat = new THREE.MeshStandardMaterial({ color: colorOf('ro-block'), roughness: 0.3, metalness: 0.4 });
  const roVesselMat = new THREE.MeshPhysicalMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.55, roughness: 0.25, metalness: 0.3 });
  blockZ.forEach(z => {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.85), roMat);
    base.position.set(roX, 0.1, z);
    register('ro-block', base);
    root.add(base);
    [-0.28, 0, 0.28].forEach(dx => {
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.3, 16), roVesselMat);
      vessel.rotation.z = Math.PI / 2;
      vessel.position.set(roX + dx, 0.5, z);
      register('ro-block', vessel);
      root.add(vessel);
    });
  });

  // ================================================================ Product water tank + Brine discharge outlet
  const prodMat = new THREE.MeshStandardMaterial({ color: colorOf('product-water'), roughness: 0.3, metalness: 0.3 });
  const prodTank = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 24), prodMat);
  prodTank.position.set(-1.1, 0.65, outZ);
  register('product-water', prodTank);
  root.add(prodTank);
  const prodCap = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 10, 24), prodMat);
  prodCap.rotation.x = Math.PI / 2;
  prodCap.position.set(-1.1, 1.32, outZ);
  register('product-water', prodCap);
  root.add(prodCap);

  const brineMat = new THREE.MeshStandardMaterial({ color: colorOf('brine-discharge'), roughness: 0.3, metalness: 0.35, emissive: colorOf('brine-discharge'), emissiveIntensity: 0.2 });
  const brinePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.1, 14), brineMat);
  brinePipe.rotation.x = Math.PI / 2;
  brinePipe.position.set(1.1, 0.2, outZ - 0.1);
  register('brine-discharge', brinePipe);
  root.add(brinePipe);
  const brineCone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 14), brineMat);
  brineCone.rotation.x = Math.PI / 2;
  brineCone.position.set(1.1, 0.2, outZ + 0.55);
  register('brine-discharge', brineCone);
  root.add(brineCone);

  // ---- ground pad ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 16),
    new THREE.MeshStandardMaterial({ color: 0x0a121a, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  /* ---- connecting pipes (curved tubes) + their flow particles ---- */
  const pipeGroups = []; // { curve, group: THREE.Group }
  function addPipe(id, from, to, color){
    const mid = new THREE.Vector3((from.x + to.x) / 2, Math.max(from.y, to.y) + 0.6, (from.z + to.z) / 2);
    const curve = new THREE.CatmullRomCurve3([from.clone(), mid, to.clone()]);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.3, transparent: true, opacity: 0.85 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.045, 8, false), mat);
    register(id, tube, { visualOnly: true });
    root.add(tube);

    const pGroup = new THREE.Group();
    const pMat = new THREE.MeshBasicMaterial({ color });
    const n = 4;
    for (let i = 0; i < n; i++){
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), pMat);
      p.userData.offset = i / n;
      pGroup.add(p);
    }
    root.add(pGroup);
    pipeGroups.push({ curve, group: pGroup });
  }

  const energyPt = new THREE.Vector3(0, 1.5, inZ);
  const seaPt = new THREE.Vector3(0, 0.35, inZ + 1.6);
  const msfPt = new THREE.Vector3(msfX, 0.5, 0);
  const roPt = new THREE.Vector3(roX, 0.5, 0);
  const prodPt = new THREE.Vector3(-1.1, 0.65, outZ);
  const brinePt = new THREE.Vector3(1.1, 0.2, outZ);

  addPipe('energy-input', energyPt, msfPt, 0xff7a45);   // thermal to MSF
  addPipe('energy-input', energyPt, roPt, 0xffc23c);    // electric to RO
  addPipe('seawater-intake', seaPt, msfPt, 0x3fb8e0);   // feed to MSF
  addPipe('seawater-intake', seaPt, roPt, 0x3fb8e0);    // feed to RO
  addPipe('product-water', msfPt, prodPt, 0x33c46a);    // distillate to header
  addPipe('product-water', roPt, prodPt, 0x33c46a);     // permeate to header
  addPipe('brine-discharge', msfPt, brinePt, 0xef5757);  // reject brine
  addPipe('brine-discharge', roPt, brinePt, 0xef5757);   // concentrate

  /* ---- highlight / selection ---- */
  const allMeshes = Object.values(meshesById).flat();
  window.__plant3dHighlight = (id) => {
    allMeshes.forEach(m => {
      const isSel = m.userData.componentId === id;
      m.scale.setScalar(isSel ? 1.14 : 1);
      if (m.material && 'emissiveIntensity' in m.material){
        const base = (m.userData.componentId === 'energy-input') ? 0.5 : (m.userData.componentId === 'brine-discharge' ? 0.2 : 0);
        m.material.emissiveIntensity = isSel ? 0.85 : base;
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
    if (hit) selectPlant3d(hit.userData.componentId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const hit = pick(e.clientX, e.clientY);
    canvas.style.cursor = hit ? 'pointer' : 'grab';
  });

  /* ---- toolbar buttons ---- */
  const btnAuto = document.getElementById('plant3dBtnAutoRotate');
  btnAuto.addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    btnAuto.textContent = controls.autoRotate ? '⏸ إيقاف الدوران التلقائي' : '▶ تشغيل الدوران التلقائي';
    btnAuto.classList.toggle('is-active', controls.autoRotate);
  });
  document.getElementById('plant3dBtnReset').addEventListener('click', () => {
    camera.position.set(9, 6.5, 10.5);
    controls.target.set(0, 0, 0);
    controls.update();
  });

  let flowSpeed = 1;
  const btnFlow = document.getElementById('plant3dBtnFlow');
  if (btnFlow){
    btnFlow.addEventListener('click', () => {
      flowSpeed = flowSpeed > 0 ? 0 : 1;
      btnFlow.textContent = flowSpeed > 0 ? '⏸ إيقاف حركة التدفق' : '▶ تشغيل حركة التدفق';
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
