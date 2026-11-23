/* =========================================================
   KAIZEN TORCH — WebGL hero
   A 3D gold coin (real face textures + reeded edge),
   sun-ray glow, orbit rings and rising embers.
   Scroll flips the coin to "One Soul at a Time".
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("heroCanvas");
  if (!canvas) return;

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  if (!hasWebGL()) { document.documentElement.classList.add("no-webgl"); return; }

  Promise.all([import("three"), import("three/addons/environments/RoomEnvironment.js")])
    .then(function (mods) { init(mods[0], mods[1].RoomEnvironment); })
    .catch(function (err) {
      console.warn("[Kaizen Torch] 3D hero disabled:", err);
      document.documentElement.classList.add("no-webgl");
    });

  function init(THREE, RoomEnvironment) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isSmall = window.innerWidth < 760;

    /* ---------- renderer / scene / camera ---------- */
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    var pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

    /* ---------- textures ---------- */
    var loader = new THREE.TextureLoader();
    var src = window.KT_COIN_TEX || { front: "img/coin/coin-front-tex.jpg", back: "img/coin/coin-back-tex.jpg" };
    var maxAniso = renderer.capabilities.getMaxAnisotropy();
    function faceTexture(url) {
      var t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = maxAniso;
      return t;
    }
    var frontTex = faceTexture(src.front);
    var backTex = faceTexture(src.back);

    // reeded edge (vertical grooves) drawn on a canvas
    var ec = document.createElement("canvas");
    ec.width = 512; ec.height = 32;
    var ex = ec.getContext("2d");
    for (var i = 0; i < 512; i += 4) {
      var g = ex.createLinearGradient(i, 0, i + 4, 0);
      g.addColorStop(0, "#222"); g.addColorStop(0.5, "#fff"); g.addColorStop(1, "#222");
      ex.fillStyle = g; ex.fillRect(i, 0, 4, 32);
    }
    var reedTex = new THREE.CanvasTexture(ec);
    reedTex.wrapS = THREE.RepeatWrapping;
    reedTex.repeat.set(10, 1);

    /* ---------- coin ---------- */
    var R = 1.6, T = 0.17;
    var geo = new THREE.CylinderGeometry(R, R, T, 160, 1, false);
    geo.rotateX(Math.PI / 2); // caps now face +z (front) / -z (back)
    var pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    var crop = 0.972; // trims the dark border around the coin artwork
    for (var v = 0; v < pos.count; v++) {
      var nz = nor.getZ(v);
      if (Math.abs(nz) > 0.5) {
        var x = pos.getX(v) / R, y = pos.getY(v) / R;
        var u = nz > 0 ? 0.5 + x * 0.5 * crop : 0.5 - x * 0.5 * crop;
        uv.setXY(v, u, 0.5 + y * 0.5 * crop);
      }
    }
    uv.needsUpdate = true;

    var edgeMat = new THREE.MeshStandardMaterial({ color: 0xd8ad48, metalness: 1, roughness: 0.24, bumpMap: reedTex, bumpScale: 3 });
    function faceMat(tex) {
      return new THREE.MeshStandardMaterial({ map: tex, metalness: 0.72, roughness: 0.3, bumpMap: tex, bumpScale: 2.2, envMapIntensity: 1.15 });
    }
    var coin = new THREE.Mesh(geo, [edgeMat, faceMat(frontTex), faceMat(backTex)]);

    var coinPivot = new THREE.Group();
    coinPivot.add(coin);

    /* ---------- sun-ray glow behind the coin ---------- */
    var glowMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uIntensity: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: [
        "uniform float uTime; uniform float uIntensity; varying vec2 vUv;",
        "void main(){",
        "  vec2 p = vUv - 0.5; float r = length(p); float a = atan(p.y, p.x);",
        "  float rays  = pow(0.5 + 0.5 * sin(a * 18.0 + uTime * 0.22), 7.0);",
        "  float rays2 = pow(0.5 + 0.5 * sin(a * 7.0 - uTime * 0.13), 12.0);",
        "  float fall = smoothstep(0.5, 0.06, r);",
        "  float core = smoothstep(0.30, 0.0, r);",
        "  float alpha = ((rays * 0.32 + rays2 * 0.28) * fall * fall + core * 0.42) * uIntensity;",
        "  vec3 col = mix(vec3(0.95, 0.55, 0.18), vec3(1.0, 0.86, 0.52), core);",
        "  gl_FragColor = vec4(col, alpha);",
        "}"
      ].join("\n")
    });
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), glowMat);
    glow.position.z = -1.6;

    /* ---------- orbit rings ---------- */
    var rings = new THREE.Group();
    var ringMat = new THREE.MeshBasicMaterial({ color: 0xe4c56a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    var beadMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    var ringDefs = [
      { r: 2.35, tilt: [1.25, 0.15, 0.2], speed: 0.16 },
      { r: 2.75, tilt: [1.05, -0.45, -0.3], speed: -0.11 },
      { r: 3.15, tilt: [1.45, 0.55, 0.8], speed: 0.08 }
    ];
    var ringObjs = ringDefs.map(function (d) {
      var holder = new THREE.Group();
      holder.rotation.set(d.tilt[0], d.tilt[1], d.tilt[2]);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.0065, 6, 220), ringMat);
      var spinner = new THREE.Group();
      var bead = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), beadMat);
      bead.position.x = d.r;
      spinner.add(bead);
      holder.add(ring, spinner);
      rings.add(holder);
      return { spinner: spinner, speed: d.speed };
    });

    /* ---------- embers ---------- */
    var N = isSmall ? 260 : 650;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(N * 3), seed = new Float32Array(N), speed = new Float32Array(N), size = new Float32Array(N);
    for (var p = 0; p < N; p++) {
      pPos[p * 3] = (Math.random() - 0.5) * 18;
      pPos[p * 3 + 1] = (Math.random() - 0.5) * 10;
      pPos[p * 3 + 2] = -4 + Math.random() * 7;
      seed[p] = Math.random();
      speed[p] = 0.12 + Math.random() * 0.35;
      size[p] = 4 + Math.pow(Math.random(), 3) * 22;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    pGeo.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    pGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    var pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uMouse: { value: new THREE.Vector2() }, uFade: { value: 1 } },
      vertexShader: [
        "uniform float uTime; uniform float uPR; uniform vec2 uMouse;",
        "attribute float aSeed; attribute float aSpeed; attribute float aSize;",
        "varying float vAlpha;",
        "void main(){",
        "  vec3 p = position; float t = uTime * aSpeed;",
        "  p.y = mod(p.y + t + 5.0, 10.0) - 5.0;",
        "  p.x += sin(t * 0.9 + aSeed * 6.2831) * 0.35;",
        "  p.z += cos(t * 0.7 + aSeed * 3.0) * 0.2;",
        "  p.xy += uMouse * (p.z + 4.0) * 0.07;",
        "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
        "  gl_Position = projectionMatrix * mv;",
        "  gl_PointSize = aSize * uPR * (6.0 / -mv.z);",
        "  float edge = smoothstep(-5.0, -3.2, p.y) * smoothstep(5.0, 2.8, p.y);",
        "  vAlpha = edge * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 2.2 + aSeed * 40.0)));",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uFade; varying float vAlpha;",
        "void main(){",
        "  float d = length(gl_PointCoord - 0.5);",
        "  float a = pow(smoothstep(0.5, 0.0, d), 1.7);",
        "  vec3 col = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.92, 0.66), a);",
        "  gl_FragColor = vec4(col, a * vAlpha * uFade);",
        "}"
      ].join("\n")
    });
    var embers = new THREE.Points(pGeo, pMat);

    /* ---------- lights ---------- */
    var key = new THREE.DirectionalLight(0xfff1d6, 2.4);
    key.position.set(3, 4, 6);
    var rim = new THREE.DirectionalLight(0xffa640, 3.2);
    rim.position.set(-5, 2, -4);
    var spot = new THREE.PointLight(0xffe2a0, 26, 14, 1.6);
    spot.position.set(0, 0, 3.5);
    scene.add(key, rim, spot);

    /* ---------- assemble ---------- */
    var stage = new THREE.Group();
    stage.add(glow, rings, coinPivot);
    scene.add(stage, embers);

    /* ---------- layout ---------- */
    var base = { x: 0, y: 0, s: 1 };
    function layout() {
      var w = canvas.clientWidth || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      var vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      var vw = vh * camera.aspect;
      if (w < 760) {
        base.x = 0; base.y = vh * 0.2; base.s = Math.min(0.95, vw / 4.4);
      } else if (w < 1100) {
        base.x = vw * 0.24; base.y = 0.15; base.s = Math.min(0.9, vw / 10.5);
      } else {
        base.x = vw * 0.22; base.y = 0; base.s = Math.min(1.02, vw / 10);
      }
      pMat.uniforms.uPR.value = renderer.getPixelRatio();
    }
    layout();
    window.addEventListener("resize", layout);

    /* ---------- input ---------- */
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    window.addEventListener("pointermove", function (e) {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });

    /* ---------- intro (after preloader) ---------- */
    var state = { intro: reduceMotion ? 1 : 0, spin: 0 };
    function playIntro() {
      if (reduceMotion) return;
      if (window.gsap) {
        window.gsap.to(state, { intro: 1, duration: 2.6, ease: "expo.out" });
      } else { state.intro = 1; }
    }
    if (window.KT_READY) playIntro(); else window.addEventListener("kt:ready", playIntro, { once: true });

    // click/tap the coin area for a celebratory spin
    window.addEventListener("kt:coinspin", function () {
      if (window.gsap) window.gsap.to(state, { spin: state.spin + Math.PI * 2, duration: 1.8, ease: "power3.inOut" });
    });

    /* ---------- visibility ---------- */
    var hero = document.getElementById("hero");
    var visible = true;
    if ("IntersectionObserver" in window && hero) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(hero);
    }

    /* ---------- loop ---------- */
    var clock = new THREE.Clock();
    function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

    function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      var dt = Math.min(clock.getDelta(), 0.05);
      var t = clock.elapsedTime;

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      var heroH = hero ? hero.offsetHeight : window.innerHeight;
      var sp = Math.min(1, Math.max(0, window.scrollY / heroH));
      var flip = smooth(0.02, 0.7, sp) * Math.PI;

      var k = state.intro;
      var introEase = 1 - Math.pow(1 - k, 3);
      var motion = reduceMotion ? 0.25 : 1;

      // stage placement (drifts toward centre and rises while scrolling)
      stage.position.x = base.x * (1 - sp * 0.35);
      stage.position.y = base.y + sp * 1.4 + Math.sin(t * 0.9) * 0.08 * motion;
      stage.position.z = -6 * (1 - introEase);
      var s = base.s * (0.35 + 0.65 * introEase) * (1 + sp * 0.12);
      stage.scale.setScalar(s);

      // coin rotation
      coinPivot.rotation.y = (1 - introEase) * -Math.PI * 3 + Math.sin(t * 0.45) * 0.38 * motion + mouse.x * 0.4 + flip + state.spin;
      coinPivot.rotation.x = -mouse.y * 0.3 + Math.sin(t * 0.35) * 0.07 * motion;
      coinPivot.rotation.z = Math.sin(t * 0.25) * 0.03 * motion;

      // rings
      rings.rotation.y = mouse.x * 0.15;
      rings.rotation.x = mouse.y * 0.1;
      ringObjs.forEach(function (r) { r.spinner.rotation.z += r.speed * dt * 6 * motion; });
      rings.scale.setScalar(0.6 + 0.4 * introEase);

      glowMat.uniforms.uTime.value = t;
      glowMat.uniforms.uIntensity.value = introEase * (1 - sp * 0.6);
      ringMat.opacity = 0.32 * introEase * (1 - sp);
      pMat.uniforms.uTime.value = t * motion;
      pMat.uniforms.uMouse.value.set(mouse.x, mouse.y);

      spot.position.set(stage.position.x + mouse.x * 4, stage.position.y + mouse.y * 3, 3.5);

      canvas.style.opacity = String(1 - smooth(0.62, 1, sp));
      renderer.render(scene, camera);
    }
    frame();
    document.documentElement.classList.add("webgl-ready");
  }
})();
