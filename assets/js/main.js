/* =========================================================
   REDLINE/STUDIO — Core Script v3
   Highlights: Lenis smooth scroll · canvas-rendered scroll video
   · three.js 3D · perf-aware
   ========================================================= */
(() => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp  = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* =========================================================
     LENIS — smooth scroll (Apple/Stripe-style inertia)
     Single shared instance, hooked into GSAP ticker so
     ScrollTrigger updates in lock-step.
     ========================================================= */
  let lenis = null;
  if (window.Lenis && !reduce) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1.0,
      lerp: 0.085,
    });
    // Use GSAP ticker as the single rAF source — no double scheduling.
    if (window.gsap) {
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // Connect Lenis to ScrollTrigger so pinning + scrub stay aligned.
    if (window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
    }
  }

  /* ---------- LOADER ---------- */
  const loader = $("#loader");
  const loaderCount = $("#loaderCount");
  const loaderBar = $(".loader__bar span");
  if (loader) {
    let n = 0;
    const dur = reduce ? 200 : 1500;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      n = Math.round(eased * 100);
      if (loaderCount) loaderCount.textContent = String(n).padStart(3, "0");
      if (loaderBar) loaderBar.style.width = n + "%";
      if (p < 1) requestAnimationFrame(tick);
      else {
        setTimeout(() => {
          loader.classList.add("is-done");
          document.body.classList.add("is-loaded");
        }, 200);
      }
    };
    requestAnimationFrame(tick);
  } else {
    document.body.classList.add("is-loaded");
  }

  /* ---------- CUSTOM CURSOR ---------- */
  const cursor = $(".cursor");
  const cdot = $(".cursor__dot");
  const cring = $(".cursor__ring");
  let pointerX = window.innerWidth / 2, pointerY = window.innerHeight / 2;

  window.addEventListener("mousemove", (e) => {
    pointerX = e.clientX; pointerY = e.clientY;
  });

  if (cursor && !isTouch) {
    let dx = pointerX, dy = pointerY, rx = pointerX, ry = pointerY;
    const tickCursor = () => {
      dx = lerp(dx, pointerX, 0.55);
      dy = lerp(dy, pointerY, 0.55);
      rx = lerp(rx, pointerX, 0.18);
      ry = lerp(ry, pointerY, 0.18);
      if (cdot) cdot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      if (cring) cring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(tickCursor);
    };
    tickCursor();

    const hoverables = "a, button, .chip, .service, .case, .nav__cta, .footer__top-btn, input, textarea, [data-magnetic]";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(hoverables)) cursor.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(hoverables)) cursor.classList.remove("is-hover");
    });
  }

  /* ---------- NAV SCROLLED ---------- */
  const nav = $("#nav");
  const onNavScroll = () => {
    if (window.scrollY > 50) nav?.classList.add("is-scrolled");
    else nav?.classList.remove("is-scrolled");
  };
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  /* ---------- MAGNETIC ELEMENTS ---------- */
  $$("[data-magnetic]").forEach((el) => {
    let rect;
    el.addEventListener("mouseenter", () => { rect = el.getBoundingClientRect(); });
    el.addEventListener("mousemove", (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.25;
      const dy = (e.clientY - cy) * 0.25;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; rect = null; });
  });

  /* ---------- SERVICE CARD GLOW TRACKING ---------- */
  $$(".service").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const mx = ((e.clientX - r.left) / r.width) * 100;
      const my = ((e.clientY - r.top) / r.height) * 100;
      card.style.setProperty("--mx", mx + "%");
      card.style.setProperty("--my", my + "%");
    });
  });

  /* ---------- INTERSECTION REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });
  $$("[data-service], [data-case], [data-step], .stat, .reveal").forEach((el) => io.observe(el));

  /* ---------- STAT COUNTERS ---------- */
  const counters = $$(".stat__num[data-count]");
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = reduce ? 200 : 1600;
      const start = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach((el) => countIO.observe(el));

  /* ---------- HERO VIDEO PAUSE WHEN OFF-SCREEN ---------- */
  const heroVideo = $(".hero__video");
  const heroSection = $(".hero");
  if (heroVideo && heroSection && "IntersectionObserver" in window) {
    const heroIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) heroVideo.play().catch(() => {});
        else heroVideo.pause();
      });
    }, { threshold: 0.05 });
    heroIO.observe(heroSection);
  }

  /* ---------- HERO TELEMETRY (only while visible) ---------- */
  const rpmEl = $("#rpm");
  const spdEl = $("#spd");
  let telemetryActive = false;
  if (rpmEl && spdEl && !reduce && "IntersectionObserver" in window) {
    let timer = null;
    const teleIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !timer) {
          timer = setInterval(() => {
            const base = 12480;
            rpmEl.textContent = (base + Math.floor(Math.random() * 200 - 100))
              .toLocaleString("en-US").replace(",", " ");
            spdEl.textContent = 328 + Math.floor(Math.random() * 8 - 4);
          }, 220);
        } else if (!e.isIntersecting && timer) {
          clearInterval(timer); timer = null;
        }
      });
    }, { threshold: 0.05 });
    teleIO.observe(heroSection);
  }

  /* ---------- FOOTER CLOCK ---------- */
  const clock = $("#clock");
  if (clock) {
    const fmt = (n) => String(n).padStart(2, "0");
    const tickClock = () => {
      const d = new Date();
      clock.textContent = `${fmt(d.getHours())} : ${fmt(d.getMinutes())} : ${fmt(d.getSeconds())} — DRESDEN`;
    };
    tickClock();
    setInterval(tickClock, 1000);
  }

  /* ---------- CONTACT FORM ---------- */
  const form = $("#contactForm");
  const status = $("#formStatus");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get("name")?.toString().trim();
      const email = data.get("email")?.toString().trim();
      const msg = data.get("message")?.toString().trim();
      const consent = data.get("consent");

      if (!name || !email || !msg || !consent) {
        status.textContent = "// ERROR — Bitte fülle alle Pflichtfelder aus.";
        status.classList.remove("is-ok"); status.classList.add("is-err");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        status.textContent = "// ERROR — E-Mail-Format ungültig.";
        status.classList.remove("is-ok"); status.classList.add("is-err");
        return;
      }

      status.textContent = "// TRANSMITTING SIGNAL...";
      status.classList.remove("is-err", "is-ok");
      const subject = encodeURIComponent(`Neues Projekt — ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nE-Mail: ${email}\nUnternehmen: ${data.get("company") || "-"}\n` +
        `Services: ${data.getAll("service").join(", ") || "-"}\nBudget: ${data.get("budget") || "-"}\n\n` +
        `Briefing:\n${msg}`
      );
      setTimeout(() => {
        window.location.href = `mailto:tolgay.u0@gmail.com?subject=${subject}&body=${body}`;
        status.textContent = "// SIGNAL TRANSMITTED — Mail-Client geöffnet.";
        status.classList.add("is-ok");
        form.reset();
      }, 600);
    });
  }

  /* ---------- ANCHOR LINKS ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  });

  /* =========================================================
     SCROLL-SCRUB BACKGROUND VIDEO — canvas-based frame renderer
     Strategy:
       1. After metadata loads, extract N frames by playing the
          video once at 4x speed and capturing each decoded frame
          via requestVideoFrameCallback (when available) or by
          time-stepped seeking.
       2. Each frame is stored as an ImageBitmap (GPU-resident).
       3. On scroll we lerp a smoothed progress and draw the
          closest frame to a 2D canvas. No more `video.currentTime`
          seeking on every scroll tick — that was the source of
          stutter (driven by sparse video keyframes + browser
          seek throttling).
     ========================================================= */
  (() => {
    const wrap   = $("#bgScroll");
    const video  = $("#bgScrollVideo");
    const canvas = $("#bgScrollCanvas");
    if (!wrap || !video || !canvas) return;

    const startEl = $("#manifesto");
    const endEl   = $(".contact") || $("#contact");
    if (!startEl || !endEl) return;

    const FRAME_TARGET = reduce ? 12 : 90;       // ~9 fps over a 10s clip
    const MAX_W = Math.min(window.innerWidth * 2, 1920);
    const MAX_H = Math.min(window.innerHeight * 2, 1080);

    const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    const off = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(MAX_W, MAX_H)
      : Object.assign(document.createElement("canvas"), { width: MAX_W, height: MAX_H });
    const offCtx = off.getContext("2d", { alpha: false });

    let duration   = 0;
    let frames     = [];     // { t: number, bmp: ImageBitmap }
    let framesReady = false;
    let extracting  = false;  // suspend any other video manipulation while true
    let smoothedProg = 0;
    let targetProg   = 0;
    let active = false;
    let sourceLoaded = false;

    // Sizing — match canvas resolution to viewport, keep aspect
    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(wrap.clientWidth  * dpr);
      const h = Math.round(wrap.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
    };
    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);

    /* ---- compute scroll progress ---- */
    const computeProg = () => {
      const sTop = startEl.getBoundingClientRect().top + window.scrollY;
      const eBox = endEl.getBoundingClientRect();
      const eBottom = eBox.top + window.scrollY + eBox.height * 0.7;
      const scrollMid = window.scrollY + window.innerHeight * 0.5;
      return clamp((scrollMid - sTop) / (eBottom - sTop), 0, 1);
    };

    /* ---- draw a given progress to the visible canvas ---- */
    const drawAt = (prog) => {
      if (!framesReady || frames.length === 0) return;
      const idx = clamp(Math.round(prog * (frames.length - 1)), 0, frames.length - 1);
      const bmp = frames[idx]?.bmp;
      if (!bmp) return;
      // cover-fit
      const cw = canvas.width, ch = canvas.height;
      const bw = bmp.width,    bh = bmp.height;
      const scale = Math.max(cw / bw, ch / bh);
      const dw = bw * scale, dh = bh * scale;
      const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
      ctx.drawImage(bmp, dx, dy, dw, dh);
    };

    /* ---- main render loop (smoothed) ---- */
    const tick = () => {
      targetProg = computeProg();
      smoothedProg = lerp(smoothedProg, targetProg, 0.14);

      const wantActive = targetProg > 0 && targetProg < 1;
      if (wantActive && !active) { wrap.classList.add("is-active"); active = true; }
      else if (!wantActive && active) { wrap.classList.remove("is-active"); active = false; }

      if (framesReady && active) drawAt(smoothedProg);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    /* ---- pre-extraction fallback: while frames load,
            use the raw video element (visible by default).
            CRITICAL: suspends itself while extracting so it
            doesn't fight the extraction loop for currentTime. ---- */
    let videoFallbackRAF = null;
    const videoFallbackLoop = () => {
      if (framesReady || !sourceLoaded || extracting) {
        videoFallbackRAF = null;
        return;
      }
      const prog = computeProg();
      const t = prog * duration;
      if (Math.abs(video.currentTime - t) > 0.08) {
        try { video.currentTime = t; } catch (_) {}
      }
      videoFallbackRAF = requestAnimationFrame(videoFallbackLoop);
    };

    /* ---- attach video source LATE — avoid eager full download
            slowing first paint ---- */
    const attachSource = () => {
      const src = document.createElement("source");
      src.src = "assets/video/scroll.mp4?v=20260523d";
      src.type = "video/mp4";
      video.appendChild(src);
      video.load();
    };

    /* ---- frame extractor: prefers playback + rVFC for speed ---- */
    const extract = async () => {
      duration = video.duration;
      if (!duration || !isFinite(duration)) return;

      extracting = true;
      const targetCount = FRAME_TARGET;
      const step = duration / targetCount;

      try {
        // Strategy A — rVFC (Chromium, modern WebKit).
        if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
          try {
            await extractViaPlayback(targetCount);
            if (frames.length > 0) return;
          } catch (_) { /* fall through */ }
        }
        // Strategy B — seek-based fallback
        await extractViaSeek(targetCount, step);
      } finally {
        extracting = false;
        framesReady = frames.length > 0;
        if (framesReady) wrap.classList.add("canvas-ready");
      }
    };

    const extractViaPlayback = (targetCount) => new Promise((resolve, reject) => {
      const raw = [];   // all decoded frames {t, bmp}
      video.muted = true;
      video.playbackRate = 4.0;
      video.currentTime = 0;

      const onFrame = async (_now, meta) => {
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          const bmp = await createImageBitmap(off);
          raw.push({ t: meta.mediaTime, bmp });
        } catch (_) {}
        if (!video.ended && !video.paused) video.requestVideoFrameCallback(onFrame);
      };

      video.requestVideoFrameCallback(onFrame);

      video.addEventListener("ended", () => {
        video.playbackRate = 1.0;
        if (raw.length < 2) { reject(new Error("no frames")); return; }
        // resample raw frames to evenly spaced target buckets
        frames = new Array(targetCount);
        for (let i = 0; i < targetCount; i++) {
          const want = (i / (targetCount - 1)) * raw[raw.length - 1].t;
          // pick nearest
          let best = raw[0], bestD = Math.abs(raw[0].t - want);
          for (let j = 1; j < raw.length; j++) {
            const d = Math.abs(raw[j].t - want);
            if (d < bestD) { best = raw[j]; bestD = d; }
          }
          frames[i] = best;
        }
        // free the extras we didn't pick
        for (const r of raw) if (!frames.includes(r)) r.bmp.close?.();
        resolve();
      }, { once: true });

      video.play().catch(reject);
    });

    const extractViaSeek = async (targetCount, step) => {
      video.muted = true;
      for (let i = 0; i < targetCount; i++) {
        const t = i * step;
        await new Promise((res) => {
          const cb = () => { video.removeEventListener("seeked", cb); res(); };
          video.addEventListener("seeked", cb);
          try { video.currentTime = t; } catch (_) { res(); }
        });
        try {
          offCtx.drawImage(video, 0, 0, off.width, off.height);
          const bmp = await createImageBitmap(off);
          frames.push({ t, bmp });
        } catch (_) {}
      }
    };

    /* ---- bootstrap ---- */
    const onMeta = () => {
      sourceLoaded = true;
      // Don't run the fallback during extraction (it would fight us
      // for `currentTime`). After extract finishes (or fails) we
      // either render from the canvas frames or kick the fallback.
      extract().finally(() => {
        if (!framesReady && !videoFallbackRAF) {
          videoFallbackRAF = requestAnimationFrame(videoFallbackLoop);
        }
      });
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });

    // Attach source after first paint to keep TTI clean
    if (document.readyState === "complete") attachSource();
    else window.addEventListener("load", attachSource, { once: true });
  })();

  /* =========================================================
     THREE.JS — CARBON GEOMETRY
     Single icosahedron with custom displacement shader.
     Wireframe overlay + particle ring. Scroll deforms it.
     ========================================================= */
  (() => {
    if (!window.THREE) return;
    const canvas = $("#threeCanvas");
    const section = $(".engineering");
    if (!canvas || !section) return;

    const renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: true, powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 5.2);

    /* ---- shape: icosahedron with displacement shader ---- */
    const geo = new THREE.IcosahedronGeometry(1.35, 32);

    // Shader: simplex-noise vertex displacement + fresnel rim
    const uniforms = {
      uTime:     { value: 0 },
      uDeform:   { value: 0.0 },
      uScroll:   { value: 0.0 },
      uColorA:   { value: new THREE.Color(0xff1f3d) },
      uColorB:   { value: new THREE.Color(0xff5a78) },
      uColorC:   { value: new THREE.Color(0x100204) },
    };

    const vertexShader = `
      uniform float uTime;
      uniform float uDeform;
      uniform float uScroll;
      varying vec3 vNormal;
      varying vec3 vPos;
      varying float vDisplace;

      // ----- 3D Simplex Noise (Ashima) -----
      vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute( permute( permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main(){
        vNormal = normalize(normalMatrix * normal);
        float t = uTime * 0.35;
        float n1 = snoise(position * 1.2 + vec3(t * 0.6));
        float n2 = snoise(position * 2.6 + vec3(-t * 0.9, t * 0.5, t * 0.4));
        float displace = (n1 * 0.55 + n2 * 0.25) * (0.18 + uDeform * 0.55);
        vec3 newPos = position + normal * displace;
        vDisplace = displace;
        vPos = newPos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uColorC;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPos;
      varying float vDisplace;

      void main(){
        vec3 viewDir = normalize(cameraPosition - vPos);
        float fres = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 2.5);
        float pulse = 0.55 + 0.45 * sin(uTime * 1.4 + vDisplace * 10.0);
        vec3 base = mix(uColorC, uColorA, fres);
        base = mix(base, uColorB, fres * pulse * 0.7);
        // Scanline tint
        float scan = sin(gl_FragCoord.y * 1.6 + uTime * 4.0) * 0.04;
        base += scan;
        gl_FragColor = vec4(base, 1.0);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms, transparent: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // Wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(1.36, 4);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xff3a55, transparent: true, opacity: 0.55,
    });
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(wireGeo), wireMat
    );
    scene.add(wireframe);

    // Particle ring
    const particleCount = 1400;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.4 + Math.random() * 2.6;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      pPositions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pPositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      pPositions[i*3+2] = r * Math.cos(phi);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xff3a55, size: 0.018, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* ---- responsive sizing ---- */
    const resize = () => {
      const w = canvas.clientWidth || section.clientWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    /* ---- visibility-gated render loop ---- */
    let visible = false;
    const visIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { visible = e.isIntersecting; });
    }, { threshold: 0.05 });
    visIO.observe(section);

    /* ---- scroll progress for THIS section ---- */
    const sectionProgress = () => {
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      return clamp(-r.top / Math.max(1, total), 0, 1);
    };

    /* ---- meters in corners ---- */
    const vtx = $("#vtxCount");
    const dfm = $("#deformMeter");
    const scl = $("#scrollMeter");
    if (vtx) vtx.textContent = geo.attributes.position.count.toLocaleString("en-US").replace(",", " ");

    /* ---- mouse parallax ---- */
    let mouseX = 0, mouseY = 0, targetMX = 0, targetMY = 0;
    window.addEventListener("mousemove", (e) => {
      targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    let last = performance.now();
    const render = (now) => {
      const dt = (now - last) / 1000; last = now;
      if (visible) {
        const prog = sectionProgress();
        uniforms.uTime.value += dt * (reduce ? 0.0 : 1.0);
        uniforms.uDeform.value = lerp(uniforms.uDeform.value, prog, 0.08);
        uniforms.uScroll.value = prog;

        mouseX = lerp(mouseX, targetMX, 0.06);
        mouseY = lerp(mouseY, targetMY, 0.06);

        mesh.rotation.y       += dt * 0.18;
        mesh.rotation.x        = mouseY * 0.3 + prog * 0.6;
        wireframe.rotation.y   = mesh.rotation.y * 1.05;
        wireframe.rotation.x   = mesh.rotation.x * 1.05;

        particles.rotation.y  += dt * 0.04;
        particles.rotation.x  = mouseY * 0.15;

        const scale = 1.0 + prog * 0.35 + Math.sin(uniforms.uTime.value * 0.8) * 0.02;
        mesh.scale.setScalar(scale);
        wireframe.scale.setScalar(scale * 1.005);

        camera.position.x = lerp(camera.position.x, mouseX * 0.4, 0.06);
        camera.position.y = lerp(camera.position.y, -mouseY * 0.25, 0.06);
        camera.lookAt(0, 0, 0);

        if (dfm) dfm.textContent = uniforms.uDeform.value.toFixed(2);
        if (scl) scl.textContent = Math.round(prog * 100) + "%";

        renderer.render(scene, camera);
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  })();

  /* =========================================================
     GSAP REVEAL ANIMATIONS
     ========================================================= */
  if (window.gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero__video", {
      yPercent: 18, scale: 1.08, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
    gsap.to(".hero__title", {
      yPercent: -20, opacity: 0.4, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 30%", scrub: true },
    });

    gsap.from(".manifesto__text h2 span", {
      y: 80, opacity: 0, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".manifesto", start: "top 70%" },
    });
    gsap.from(".services__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".services", start: "top 75%" },
    });
    gsap.from(".engineering__title .line", {
      y: 100, opacity: 0, duration: 1.1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".engineering", start: "top 60%" },
    });
    gsap.from(".process__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".process", start: "top 75%" },
    });
    gsap.from(".work__title", {
      y: 60, opacity: 0, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".work", start: "top 75%" },
    });
    gsap.from(".contact__title", {
      y: 80, opacity: 0, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: ".contact", start: "top 70%" },
    });

    gsap.utils.toArray("[data-step]").forEach((step) => {
      gsap.fromTo(step,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: step, start: "top 80%" } }
      );
    });

    gsap.from(".footer__giant", {
      y: 200, ease: "power3.out", duration: 1.4,
      scrollTrigger: { trigger: ".footer", start: "top 80%" },
    });
  }
})();
