(function () {
  const COLORS = { lime: 0xc8f135, orange: 0xff6b2b, white: 0xf4f5f0 };
  const GRID = 60;
  const RACKET_ROT = (-36 * Math.PI) / 180;
  const HIT_LOCAL = { x: 100, y: 111 };
  const BALL_RADIUS = 27;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function easeIn(t) {
    return t * t;
  }

  function createPadelRacket() {
    const racket = new PIXI.Container();
    const lime = COLORS.lime;
    const alpha = 0.14;

    const head = new PIXI.Graphics();
    head.moveTo(100, 24);
    head.bezierCurveTo(48, 24, 22, 72, 22, 118);
    head.bezierCurveTo(22, 168, 48, 198, 100, 198);
    head.bezierCurveTo(152, 198, 178, 168, 178, 118);
    head.bezierCurveTo(178, 72, 152, 24, 100, 24);
    head.closePath();
    head.fill({ color: lime, alpha: alpha * 2.2 });
    head.stroke({ width: 3, color: lime, alpha: alpha * 3.5 });

    const holes = new PIXI.Graphics();
    const holeCoords = [
      [72, 78], [100, 78], [128, 78],
      [58, 102], [86, 102], [114, 102], [142, 102],
      [72, 126], [100, 126], [128, 126],
      [58, 150], [86, 150], [114, 150], [142, 150],
      [72, 174], [100, 174], [128, 174],
    ];
    holeCoords.forEach(([x, y]) => {
      holes.circle(x, y, 5);
      holes.fill({ color: lime, alpha: alpha * 2 });
    });

    const throat = new PIXI.Graphics();
    throat.moveTo(88, 198);
    throat.lineTo(88, 218);
    throat.lineTo(112, 218);
    throat.lineTo(112, 198);
    throat.stroke({ width: 2.5, color: lime, alpha: alpha * 3 });

    const handle = new PIXI.Graphics();
    handle.roundRect(86, 218, 28, 168, 10);
    handle.fill({ color: lime, alpha: alpha * 1.1 });
    handle.stroke({ width: 3, color: lime, alpha: alpha * 3 });
    handle.roundRect(92, 230, 16, 140, 6);
    handle.fill({ color: lime, alpha: alpha * 1.6 });

    const grip = new PIXI.Graphics();
    [260, 285, 310, 335].forEach((y) => {
      grip.moveTo(90, y);
      grip.lineTo(110, y);
      grip.stroke({ width: 1.5, color: lime, alpha: alpha * 2.2 });
    });

    const cap = new PIXI.Graphics();
    cap.ellipse(100, 392, 16, 6);
    cap.fill({ color: lime, alpha: alpha * 1.8 });

    racket.addChild(head, holes, throat, handle, grip, cap);
    return racket;
  }

  function createTennisBall() {
    const ball = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.circle(0, 0, BALL_RADIUS);
    body.fill({ color: COLORS.lime, alpha: 1 });
    body.stroke({ width: 1.5, color: COLORS.white, alpha: 0.28 });

    const shine = new PIXI.Graphics();
    shine.circle(-8, -9, 10);
    shine.fill({ color: COLORS.white, alpha: 0.55 });

    const shade = new PIXI.Graphics();
    shade.circle(6, 8, 14);
    shade.fill({ color: 0x4a6018, alpha: 0.35 });

    const seamA = new PIXI.Graphics();
    seamA.ellipse(0, 0, BALL_RADIUS - 6, BALL_RADIUS - 10);
    seamA.stroke({ width: 2.5, color: COLORS.white, alpha: 0.85 });
    seamA.rotation = 0.55;
    seamA.scale.set(0.88, 0.55);

    const seamB = new PIXI.Graphics();
    seamB.ellipse(0, 0, BALL_RADIUS - 6, BALL_RADIUS - 10);
    seamB.stroke({ width: 2.5, color: COLORS.white, alpha: 0.85 });
    seamB.rotation = -0.55;
    seamB.scale.set(0.88, 0.55);

    ball.addChild(body, shade, shine, seamA, seamB);
    return ball;
  }

  async function initHeroPixi() {
    const mount = document.getElementById('hero-pixi');
    const hero = document.querySelector('.hero');
    if (!mount || !hero || prefersReducedMotion() || typeof PIXI === 'undefined') return;

    const app = new PIXI.Application();
    await app.init({
      resizeTo: mount,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    mount.appendChild(app.canvas);

    const stage = app.stage;
    const parallax = new PIXI.Container();
    const gridLayer = new PIXI.Container();
    const particleLayer = new PIXI.Container();
    const streakLayer = new PIXI.Container();
    const burstLayer = new PIXI.Container();
    const racketLayer = new PIXI.Container();
    const ballLayer = new PIXI.Container();
    stage.addChild(parallax);
    parallax.addChild(gridLayer, particleLayer, streakLayer, burstLayer);
    stage.addChild(racketLayer);
    stage.addChild(ballLayer);

    const racketContainer = createPadelRacket();
    racketLayer.addChild(racketContainer);

    const ballContainer = createTennisBall();
    ballContainer.visible = false;
    ballLayer.addChild(ballContainer);

    const racketAnim = {
      floatPhase: 0,
      hitStart: 0,
      hitDuration: 320,
      baseX: 0,
      baseY: 0,
      baseScale: 1,
    };

    const ballAnim = {
      active: false,
      elapsed: 0,
      delay: 120,
      duration: 1700,
      hitAt: 0.62,
      hitDone: false,
      start: { x: -90, y: -90 },
      hit: { x: 0, y: 0 },
      exit: { x: -120, y: 0 },
    };

    let w = app.screen.width;
    let h = app.screen.height;
    let mouse = { x: w * 0.72, y: h * 0.45, active: false };
    let time = 0;

    function isHeroLayoutReady() {
      const visual = document.querySelector('.hero-visual');
      if (!visual || window.innerWidth < 900) return false;
      const rect = visual.getBoundingClientRect();
      return rect.width > 80 && rect.height > 80;
    }

    function applyRacketTransform() {
      if (!racketContainer.visible) return;
      const floatY = Math.sin(racketAnim.floatPhase) * 14;
      const floatRot = Math.sin(racketAnim.floatPhase * 0.85) * 0.035;
      let hitRot = 0;
      let hitScale = 1;
      const hitElapsed = performance.now() - racketAnim.hitStart;
      if (hitElapsed < racketAnim.hitDuration) {
        const ht = hitElapsed / racketAnim.hitDuration;
        const kick = Math.sin(ht * Math.PI);
        hitRot = kick * 0.22;
        hitScale = 1 + kick * 0.06;
      }
      racketContainer.x = racketAnim.baseX + Math.sin(racketAnim.floatPhase * 0.6) * 6;
      racketContainer.y = racketAnim.baseY + floatY;
      racketContainer.rotation = RACKET_ROT + floatRot + hitRot;
      racketContainer.scale.set(racketAnim.baseScale * hitScale);
    }

    function layoutRacket() {
      const visual = document.querySelector('.hero-visual');
      const isDesktop = window.innerWidth >= 900;

      if (!visual || !isDesktop) {
        racketContainer.visible = false;
        ballContainer.visible = false;
        document.body.classList.remove('hero-racket--pixi');
        return false;
      }

      const visualRect = visual.getBoundingClientRect();
      const scale = Math.min(420, visualRect.width * 0.55) / 200;
      const displayW = 200 * scale;
      const displayH = 420 * scale;

      racketContainer.visible = true;
      racketAnim.baseX = visualRect.left - mount.getBoundingClientRect().left + visualRect.width * 0.2 - displayW * 0.5;
      racketAnim.baseY = visualRect.top - mount.getBoundingClientRect().top + visualRect.height * 0.58 - displayH * 0.34;
      racketAnim.baseScale = scale;
      applyRacketTransform();
      document.body.classList.add('hero-racket--pixi');
      return true;
    }

    function getHitPointCanvas() {
      if (!racketContainer.visible) return null;
      applyRacketTransform();
      return racketContainer.toGlobal(new PIXI.Point(HIT_LOCAL.x, HIT_LOCAL.y));
    }

    function isHitPointValid(hit) {
      if (!hit) return false;
      return hit.x > 40 && hit.y > 40 && hit.x < w - 20 && hit.y < h - 20;
    }

    function getHitPointScreen() {
      const p = getHitPointCanvas();
      if (!p) return null;
      const mountRect = mount.getBoundingClientRect();
      return { x: mountRect.left + p.x, y: mountRect.top + p.y };
    }

    function smackRacket() {
      racketAnim.hitStart = performance.now();
    }

    function spawnBurstCanvas(x, y) {
      for (let i = 0; i < 24; i += 1) {
        const b = new PIXI.Graphics();
        b.circle(0, 0, rand(2, 5));
        b.fill({ color: Math.random() < 0.3 ? COLORS.orange : COLORS.lime, alpha: rand(0.5, 0.95) });
        b.x = x;
        b.y = y;
        b.blendMode = 'add';
        burstLayer.addChild(b);
        const angle = rand(0, Math.PI * 2);
        const speed = rand(2, 9);
        burstLayer._bursts = burstLayer._bursts || [];
        burstLayer._bursts.push({
          g: b,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: rand(28, 48),
        });
      }
    }

    function spawnHitEffectsCanvas(x, y, exitX, exitY) {
      const exitAngle = Math.atan2(exitY - y, exitX - x);

      const ring = new PIXI.Graphics();
      ring.circle(0, 0, 12);
      ring.stroke({ width: 2, color: COLORS.lime, alpha: 0.55 });
      ring.x = x;
      ring.y = y;
      ring.blendMode = 'add';
      burstLayer.addChild(ring);
      burstLayer._rings = burstLayer._rings || [];
      burstLayer._rings.push({ g: ring, life: 0, max: 50 });

      for (let i = 0; i < 8; i += 1) {
        const smoke = new PIXI.Graphics();
        smoke.circle(0, 0, 28);
        smoke.fill({ color: COLORS.white, alpha: 0.35 });
        smoke.x = x;
        smoke.y = y;
        smoke.alpha = 0.75;
        smoke.blendMode = 'add';
        burstLayer.addChild(smoke);
        const spread = (Math.random() - 0.5) * 70;
        const angle = ((exitAngle * 180) / Math.PI + spread) * (Math.PI / 180);
        const dist = 28 + Math.random() * 55;
        burstLayer._smoke = burstLayer._smoke || [];
        burstLayer._smoke.push({
          g: smoke,
          sx: x,
          sy: y,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          life: 0,
          max: 70 + Math.random() * 30,
        });
      }

      for (let i = 0; i < 6; i += 1) {
        const streak = new PIXI.Graphics();
        const len = 38 + Math.random() * 52;
        streak.moveTo(0, 0);
        streak.lineTo(len, 0);
        streak.stroke({ width: rand(1, 2), color: COLORS.lime, alpha: rand(0.4, 0.85) });
        streak.x = x;
        streak.y = y;
        const spread = (Math.random() - 0.5) * 36;
        const angle = exitAngle + (spread * Math.PI) / 180;
        streak.rotation = angle;
        streak.blendMode = 'add';
        burstLayer.addChild(streak);
        const dist = 55 + Math.random() * 80;
        burstLayer._hitStreaks = burstLayer._hitStreaks || [];
        burstLayer._hitStreaks.push({
          g: streak,
          sx: x,
          sy: y,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          life: 0,
          max: 48 + Math.random() * 20,
        });
      }
    }

    function triggerBallHit(x, y) {
      smackRacket();
      spawnBurstCanvas(x, y);
      spawnHitEffectsCanvas(x, y, ballAnim.exit.x, ballAnim.exit.y);
      const screen = getHitPointScreen();
      if (screen) {
        window.dispatchEvent(new CustomEvent('hero-ball-hit', { detail: screen }));
      }
    }

    let introAttempts = 0;
    let introRetryId = 0;
    let introPlayed = false;

    function startBallIntro(hit) {
      introPlayed = true;
      ballAnim.hit = { x: hit.x, y: hit.y };
      ballAnim.exit = { x: -120, y: h + 100 };
      ballAnim.start = { x: -90, y: -90 };
      ballAnim.elapsed = 0;
      ballAnim.hitDone = false;
      ballAnim.active = true;
      ballContainer.visible = true;
      ballContainer.alpha = 0;
      ballContainer.scale.set(0.95);
      ballContainer.x = ballAnim.start.x;
      ballContainer.y = ballAnim.start.y;
    }

    function scheduleBallIntro() {
      if (ballAnim.active || introPlayed) return;
      introAttempts = 0;
      if (introRetryId) cancelAnimationFrame(introRetryId);
      introRetryId = requestAnimationFrame(attemptBallIntro);
    }

    function attemptBallIntro() {
      introRetryId = 0;
      introAttempts += 1;

      if (!isHeroLayoutReady() || !layoutRacket()) {
        if (introAttempts < 30) {
          introRetryId = requestAnimationFrame(attemptBallIntro);
        }
        return;
      }

      const hit = getHitPointCanvas();
      if (!isHitPointValid(hit)) {
        if (introAttempts < 30) {
          introRetryId = requestAnimationFrame(attemptBallIntro);
        }
        return;
      }

      startBallIntro(hit);
    }

    function playBallIntro() {
      scheduleBallIntro();
    }

    window.heroPixi = {
      ready: true,
      getHitPoint: getHitPointScreen,
      smack: smackRacket,
      playBallIntro,
      scheduleBallIntro,
    };
    window.dispatchEvent(new Event('hero-pixi-ready'));

    const glowOrbs = [];
    const orbCount = window.innerWidth < 900 ? 2 : 4;
    for (let i = 0; i < orbCount; i += 1) {
      const g = new PIXI.Graphics();
      const radius = rand(80, 160);
      g.circle(0, 0, radius);
      g.fill({ color: i % 2 === 0 ? COLORS.lime : COLORS.orange, alpha: rand(0.04, 0.09) });
      g.x = rand(w * 0.45, w * 0.95);
      g.y = rand(h * 0.15, h * 0.85);
      g.blendMode = 'add';
      parallax.addChild(g);
      glowOrbs.push({
        g,
        bx: g.x,
        by: g.y,
        phase: rand(0, Math.PI * 2),
        drift: rand(0.2, 0.55),
      });
    }

    const gridDots = [];
    function buildGrid() {
      gridLayer.removeChildren();
      gridDots.length = 0;
      const cols = Math.ceil(w / GRID) + 2;
      const rows = Math.ceil(h / GRID) + 2;
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const dot = new PIXI.Graphics();
          dot.circle(0, 0, 1.5);
          dot.fill({ color: COLORS.lime, alpha: 0.22 });
          dot.x = col * GRID;
          dot.y = row * GRID;
          dot.blendMode = 'add';
          gridLayer.addChild(dot);
          gridDots.push({ dot, col, row, phase: rand(0, Math.PI * 2) });
        }
      }
    }

    const particleCount = window.innerWidth < 900 ? 45 : 90;
    const particles = [];
    for (let i = 0; i < particleCount; i += 1) {
      const p = new PIXI.Graphics();
      const size = rand(1.2, 3.8);
      p.circle(0, 0, size);
      const useOrange = Math.random() < 0.18;
      p.fill({
        color: useOrange ? COLORS.orange : COLORS.lime,
        alpha: rand(0.15, 0.55),
      });
      p.x = rand(0, w);
      p.y = rand(0, h);
      p.blendMode = 'add';
      particleLayer.addChild(p);
      particles.push({
        g: p,
        x: p.x,
        y: p.y,
        vx: rand(-0.35, 0.35),
        vy: rand(-0.55, -0.08),
        twinkle: rand(0, Math.PI * 2),
      });
    }

    const streaks = [];
    function spawnStreak() {
      if (streaks.length > 8) return;
      const s = new PIXI.Graphics();
      const len = rand(40, 120);
      s.moveTo(0, 0);
      s.lineTo(len, 0);
      s.stroke({ width: rand(1, 2), color: COLORS.lime, alpha: rand(0.2, 0.45) });
      s.x = rand(w * 0.35, w);
      s.y = rand(0, h);
      s.rotation = rand(-0.6, 0.4);
      s.blendMode = 'add';
      streakLayer.addChild(s);
      streaks.push({ g: s, life: 0, max: rand(50, 90) });
    }

    buildGrid();
    layoutRacket();

    hero.addEventListener('pointermove', (e) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    hero.addEventListener('pointerleave', () => {
      mouse.active = false;
    });

    app.ticker.add((ticker) => {
      time += ticker.deltaTime * 0.02;
      const dt = ticker.deltaTime;
      const deltaMs = ticker.deltaMS > 0 ? ticker.deltaMS : (dt / 60) * 1000;

      racketAnim.floatPhase += dt * 0.035;
      if (racketContainer.visible) applyRacketTransform();

      if (ballAnim.active) {
        ballAnim.elapsed += deltaMs;
        const preDelay = ballAnim.elapsed < ballAnim.delay;
        const t = preDelay
          ? 0
          : Math.min(1, (ballAnim.elapsed - ballAnim.delay) / ballAnim.duration);

        if (!preDelay && t < ballAnim.hitAt) {
          const liveHit = getHitPointCanvas();
          if (liveHit) {
            ballAnim.hit.x = liveHit.x;
            ballAnim.hit.y = liveHit.y;
          }
        }

        if (preDelay) {
          ballContainer.x = ballAnim.start.x;
          ballContainer.y = ballAnim.start.y;
          ballContainer.alpha = 0;
        } else if (t < ballAnim.hitAt) {
          const p = t / ballAnim.hitAt;
          const eased = easeInOut(p);
          ballContainer.x = lerp(ballAnim.start.x, ballAnim.hit.x, eased);
          ballContainer.y = lerp(ballAnim.start.y, ballAnim.hit.y, eased);
          ballContainer.rotation = p * 13.3;
          ballContainer.alpha = Math.min(1, t * 6);
          ballContainer.scale.set(lerp(0.95, 1, eased));
        } else {
          const p = (t - ballAnim.hitAt) / (1 - ballAnim.hitAt);
          const eased = easeIn(p);
          ballContainer.x = lerp(ballAnim.hit.x, ballAnim.exit.x, eased);
          ballContainer.y = lerp(ballAnim.hit.y, ballAnim.exit.y, eased);
          ballContainer.rotation = 13.3 + p * 12.8;
          ballContainer.alpha = 1 - eased;
          ballContainer.scale.set(lerp(1, 0.95, eased));
        }

        if (!preDelay && t >= ballAnim.hitAt && !ballAnim.hitDone) {
          ballAnim.hitDone = true;
          triggerBallHit(ballAnim.hit.x, ballAnim.hit.y);
        }

        if (ballAnim.elapsed >= ballAnim.delay + ballAnim.duration + 200) {
          ballAnim.active = false;
          ballContainer.visible = false;
        }
      }

      const px = mouse.active ? (mouse.x - w * 0.72) * 0.018 : 0;
      const py = mouse.active ? (mouse.y - h * 0.45) * 0.018 : 0;
      parallax.x += (px - parallax.x) * 0.06;
      parallax.y += (py - parallax.y) * 0.06;

      glowOrbs.forEach((o) => {
        o.g.x = o.bx + Math.sin(time * o.drift + o.phase) * 28;
        o.g.y = o.by + Math.cos(time * o.drift * 0.85 + o.phase) * 22;
        o.g.alpha = 0.55 + Math.sin(time * 1.2 + o.phase) * 0.25;
      });

      gridDots.forEach((d) => {
        const pulse = 0.12 + (Math.sin(time * 2 + d.phase + (d.col + d.row) * 0.35) + 1) * 0.22;
        d.dot.alpha = pulse;
        d.dot.scale.set(0.85 + pulse * 0.6);
      });

      particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        p.g.x = p.x;
        p.g.y = p.y;
        p.twinkle += dt * 0.08;
        p.g.alpha = 0.25 + (Math.sin(p.twinkle) + 1) * 0.28;
      });

      if (Math.random() < 0.04) spawnStreak();
      for (let i = streaks.length - 1; i >= 0; i -= 1) {
        const s = streaks[i];
        s.life += dt;
        s.g.x += 1.8 * dt;
        s.g.alpha = 1 - s.life / s.max;
        if (s.life >= s.max) {
          streakLayer.removeChild(s.g);
          s.g.destroy();
          streaks.splice(i, 1);
        }
      }

      const bursts = burstLayer._bursts || [];
      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const b = bursts[i];
        b.life += dt;
        b.g.x += b.vx * dt;
        b.g.y += b.vy * dt;
        b.g.alpha = 1 - b.life / b.max;
        b.vy += 0.04 * dt;
        if (b.life >= b.max) {
          burstLayer.removeChild(b.g);
          b.g.destroy();
          bursts.splice(i, 1);
        }
      }
      burstLayer._bursts = bursts;

      const rings = burstLayer._rings || [];
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        const r = rings[i];
        r.life += dt;
        const t = r.life / r.max;
        r.g.scale.set(0.4 + t * 3.2);
        r.g.alpha = 0.9 * (1 - t);
        if (r.life >= r.max) {
          burstLayer.removeChild(r.g);
          r.g.destroy();
          rings.splice(i, 1);
        }
      }
      burstLayer._rings = rings;

      const smokes = burstLayer._smoke || [];
      for (let i = smokes.length - 1; i >= 0; i -= 1) {
        const s = smokes[i];
        s.life += dt;
        const t = s.life / s.max;
        s.g.x = s.sx + s.dx * t;
        s.g.y = s.sy + s.dy * t;
        s.g.alpha = 0.75 * (1 - t);
        s.g.scale.set(0.25 + t * 1.65);
        if (s.life >= s.max) {
          burstLayer.removeChild(s.g);
          s.g.destroy();
          smokes.splice(i, 1);
        }
      }
      burstLayer._smoke = smokes;

      const hitStreaks = burstLayer._hitStreaks || [];
      for (let i = hitStreaks.length - 1; i >= 0; i -= 1) {
        const s = hitStreaks[i];
        s.life += dt;
        const t = s.life / s.max;
        s.g.x = s.sx + s.dx * t;
        s.g.y = s.sy + s.dy * t;
        s.g.alpha = 1 - t;
        if (s.life >= s.max) {
          burstLayer.removeChild(s.g);
          s.g.destroy();
          hitStreaks.splice(i, 1);
        }
      }
      burstLayer._hitStreaks = hitStreaks;
    });

    const onResize = () => {
      w = app.screen.width;
      h = app.screen.height;
      ballAnim.exit = { x: -120, y: h + 100 };
      buildGrid();
      layoutRacket();
      glowOrbs.forEach((o) => {
        o.bx = Math.min(w * 0.92, Math.max(w * 0.4, o.bx));
        o.by = Math.min(h * 0.9, Math.max(h * 0.1, o.by));
      });
    };
    window.addEventListener('resize', onResize);
  }

  function start() {
    initHeroPixi().catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
