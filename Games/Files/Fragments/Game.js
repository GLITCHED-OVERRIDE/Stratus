import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const IS_PLAYABLES = typeof ytgame !== "undefined" && ytgame.IN_PLAYABLES_ENV;

export class Game {
  container;
  scene;
  camera;
  renderer;
  composer;
  clock;
  animationId = null;

  // Game Objects
  ship;
  playerMissiles = [];
  enemies = [];
  alienMissiles = [];
  items = [];
  boss = null;
  particles = [];
  stars = null;

  // Game State
  isPlaying = false;
  level = 1;
  lives = 3;
  score = 0;
  gameTime = 0;
  maxLives = 3;
  levelEnemiesSpawned = 0;
  levelBlocksSpawned = 0;

  // Upgrades
  rapidFireLevel = 0;
  speedBoostLevel = 0;
  weaponUpgradeLevel = 0;
  maxLifeUpgrades = 0;
  droppedItems = new Set();
  levelSpawnQueue = [];

  // Ship State
  shipSpeed = 0.8;
  lastShotTime = 0;
  shootCooldown = 0.25; // Seconds

  // Enemy State
  enemySpawnTimer = 0;
  enemySpawnInterval = 2.0; // Seconds, decreases with level

  // Input State
  keys = {};
  joystickBase;
  joystickKnob;
  touchStartPos = null;
  touchId = null;
  joystickInput = { x: 0, y: 0 };

  // Audio
  audioContext = null;
  isAudioEnabled = true;

  // Constants
  FIELD_WIDTH = 50;
  FIELD_HEIGHT = 80; // Visible area roughly
  SHIP_LIMIT_X = 22;
  SHIP_LIMIT_Y = 35;

  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene Setup
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.015); // Darker fog for space

    this.createBackground(); // Keep existing background shader

    // Camera
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 50, 20); // ~70 degree elevation
    this.camera.lookAt(0, 0, -10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2);
    sunLight.position.set(-10, 50, 20);
    this.scene.add(sunLight);

    // Post-processing (Bloom)
    const renderScene = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, 0.4, 0.85
    );
    bloomPass.threshold = 0.1;
    bloomPass.strength = 2.0;
    bloomPass.radius = 0.5;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(bloomPass);

    // Init Game Objects
    this.createStars();
    this.createShip();
    this.createJoystick();

    // Camera Adjustment for Mobile
    this.adjustCamera();

    // Event Listeners
    window.addEventListener("resize", () => this.onWindowResize());

    // UI Handlers
    document.getElementById("btn-start").addEventListener("click", () => this.startGame());
    document.getElementById("btn-details").addEventListener("click", () => this.showDetails());
    document.getElementById("btn-back").addEventListener("click", () => this.hideDetails());

    // Input
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    window.addEventListener("touchstart", (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener("touchmove", (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener("touchend", (e) => this.onTouchEnd(e));

    // Initial UI
    this.updateUI();

    // Start Loop
    this.animate();

    // Playables SDK
    this.callSDK('system', 'onPause', () => this.onPause());
    this.callSDK('system', 'onResume', () => this.onResume());
    this.callSDK('system', 'onAudioEnabledChange', (enabled) => this.onAudioChange(enabled));
    this.loadGameData();
    // Local dev fallback
    console.log("Local Dev: Game Ready");


    this.generateItemIndices(); // Initial set
  }

  // --- Initialization & Assets ---

  createShip() {
    const group = new THREE.Group();

    // Main Body (Cone)
    const bodyGeo = new THREE.ConeGeometry(1, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x0088ff,
      emissiveIntensity: 1,
      roughness: 0.2,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = -Math.PI / 2; // Point forward
    group.add(body);

    // Wings
    const wingGeo = new THREE.BufferGeometry();
    const wingVertices = new Float32Array([
      0, 0, 1, 2.5, 0, 2, 0, 0, -1, // Right Wing
      0, 0, 1, -2.5, 0, 2, 0, 0, -1  // Left Wing
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
    wingGeo.computeVertexNormals();
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff0088,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8,
      side: THREE.DoubleSide
    });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    // wings.rotation.x = 0; // Already flat on XZ
    group.add(wings);

    // Thruster (Engine Fire)
    const thrusterGeo = new THREE.ConeGeometry(0.5, 2, 8);
    const thrusterMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8
    });
    this.thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
    this.thruster.rotation.x = Math.PI / 2; // Point back (+Z)
    this.thruster.position.z = 2.5; // Behind ship
    group.add(this.thruster);

    this.ship = group;
    const engineGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.z = 2;
    group.add(engine);

    this.ship = group;
    this.ship.position.set(0, 0, 20); // Start position
    this.scene.add(this.ship);
  }

  createStars() {
    const starsGeo = new THREE.BufferGeometry();
    const starsCount = 4000;
    const posArray = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 600; // x: -300 to 300
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 400; // y: -200 to 200
      posArray[i * 3 + 2] = (Math.random() - 0.5) * 600 - 100; // z: -400 to 200 (approx)
    }

    starsGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    const starsMat = new THREE.PointsMaterial({
      size: 0.5,
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    });

    this.stars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(this.stars);
  }

  createBackground() {
    // Re-using the shader background from original game for consistency
    const geometry = new THREE.SphereGeometry(800, 60, 40);
    this.backgroundUniforms = { time: { value: 0 } };

    const material = new THREE.ShaderMaterial({
      uniforms: this.backgroundUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        void main() {
          vUv = uv;
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPos;
        uniform float time;

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        float noise(vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
          vec3 dir = normalize(vPos);
          // Sun position at top of screen (horizon)
          vec3 sunDir = normalize(vec3(0.0, -0.3, -0.95));
          float sun = max(0.0, dot(dir, sunDir));
          vec3 color = vec3(0.0, 0.0, 0.0);

          float n = noise(dir.xy * 3.0 + time * 0.02);
          float sunInfluence = pow(sun, 200.0); // Smaller sun (higher power)
          color += vec3(0.05, 0.02, 0.08) * n * sunInfluence;

          // Sun Core
          if (sun > 0.999) color += vec3(1.0, 0.9, 0.8) * 0.8; // Core brighter
          color += vec3(1.0, 0.5, 0.2) * pow(sun, 100.0) * 0.3; // Inner glow stronger
          color += vec3(0.6, 0.2, 0.6) * pow(sun, 20.0) * 0.1; // Outer glow stronger

          // Saturn-like Ring
          vec3 ringNormal = normalize(vec3(0.0, 1.0, 0.3)); // Tilted
          float denom = dot(dir, ringNormal);
          if (abs(denom) > 0.01) {
            float t = dot(sunDir, ringNormal) / denom;
            if (t > 0.0) {
              vec3 p = dir * t;
              float d = length(p - sunDir);
              // Ring Dimensions - Thinner and Closer
              if (d > 0.08 && d < 0.09) {
                float ringAlpha = smoothstep(0.08, 0.082, d) * (1.0 - smoothstep(0.088, 0.09, d));
                // Simple radial noise
                float angle = atan(p.x - sunDir.x, p.y - sunDir.y);
                float ringNoise = noise(vec2(d * 80.0, angle * 2.0));
                color += vec3(0.15, 0.1, 0.05) * ringAlpha * (1.0 + 0.5 * ringNoise);
              }
            }
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      fog: false
    });

    this.backgroundSphere = new THREE.Mesh(geometry, material);
    this.backgroundSphere.renderOrder = -1;
    this.scene.add(this.backgroundSphere);
  }

  createJoystick() {
    this.joystickBase = document.createElement("div");
    this.joystickBase.className = "joystick-base";
    this.joystickKnob = document.createElement("div");
    this.joystickKnob.className = "joystick-knob";
    this.joystickBase.appendChild(this.joystickKnob);
    document.body.appendChild(this.joystickBase);
  }

  // --- Game Loop ---

  animate() {
    if (!this.firstFrameSent) {
      this.callSDK('game', 'firstFrameReady');
      this.firstFrameSent = true;
    }
    this.animationId = requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();
    this.gameTime += dt;

    if (this.backgroundUniforms) {
      this.backgroundUniforms.time.value = this.gameTime;
    }

    if (this.isPlaying) {
      this.updateShip(dt);
      this.updateMissiles(dt);
      this.updateEnemies(dt);
      this.updateItems(dt);
      this.updateParticles(dt);
      this.updateStars(dt);
      this.updateCamera(dt);
      this.checkCollisions();
    } else {
      // Idle animation for ship?
      this.ship.rotation.z = Math.sin(this.gameTime) * 0.1;
    }

    this.composer.render();
  }

  // --- Updates ---

  updateCamera(dt) {
    // Smoothly follow ship X with a delay/lag for dynamic feel
    const targetX = this.ship.position.x * 0.3; // Follow 30% of movement
    this.camera.position.x += (targetX - this.camera.position.x) * dt * 2;

    // Ensure it still looks at the target area
    this.camera.lookAt(this.camera.position.x * 0.5, 0, -10);

    // Tilt camera based on movement (Apply AFTER lookAt)
    if (this.cameraTilt === undefined) this.cameraTilt = 0;
    const targetRotZ = -this.ship.position.x * 0.015; // Slight tilt
    this.cameraTilt += (targetRotZ - this.cameraTilt) * dt * 2;
    this.camera.rotation.z = this.cameraTilt;
  }

  updateShip(dt) {
    // Speed is units per second
    const speed = this.shipSpeed * dt;

    let moveX = this.joystickInput.x;
    let moveY = this.joystickInput.y; // Up is Up

    // Keyboard Input
    // Thruster Animation
    // Thruster Animation
    if (this.thruster) {
      // Base scale on speed (default ~20, max ~30)
      const boostLevel = (this.shipSpeed - 20) / 5; // 0, 1, 2
      // Smaller, tail-like
      const scaleX = 0.3 + Math.random() * 0.1;
      const scaleY = 0.3 + Math.random() * 0.1;
      const scaleZ = 0.5 + boostLevel * 0.3 + Math.random() * 0.2; // Stretch in Z
      this.thruster.scale.set(scaleX, scaleY, scaleZ);
      this.thruster.material.opacity = 0.6 + Math.random() * 0.4;
    }

    if (this.keys["a"] || this.keys["arrowleft"]) moveX -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) moveX += 1;
    if (this.keys["w"] || this.keys["arrowup"]) moveY -= 1; // Up is negative Z in 3D usually, but here we map to screen Y
    if (this.keys["s"] || this.keys["arrowdown"]) moveY += 1;

    // Clamp input
    moveX = Math.max(-1, Math.min(1, moveX));
    moveY = Math.max(-1, Math.min(1, moveY));

    // Apply movement (X is Left/Right, Z is Up/Down in this camera view?)
    // Camera is at (0, 40, 20) looking at (0, 0, -10).
    // This is a top-down-ish view. 
    // X axis is Left/Right.
    // Z axis is Forward/Backward (Up/Down on screen).

    this.ship.position.x += moveX * speed;
    this.ship.position.z += moveY * speed;

    // Bounds
    // Camera is at z=20, looking at z=-10. 
    // Visible range is roughly z=-30 (top) to z=10 (bottom) depending on FOV.
    // We want to keep the ship    // Clamp position
    this.ship.position.x = Math.max(-this.FIELD_WIDTH / 2, Math.min(this.FIELD_WIDTH / 2, this.ship.position.x));

    // Invulnerability Update
    if (this.invulnerable) {
      this.invulnerableTimer -= dt;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
        this.ship.visible = true;
      } else {
        // Blink every 0.1s
        this.ship.visible = Math.floor(this.invulnerableTimer * 10) % 2 === 0;
      }
    } else {
      this.ship.visible = true;
    }
    this.ship.position.z = Math.max(-20, Math.min(10, this.ship.position.z)); // Tighter Z bounds

    // Banking effect
    this.ship.rotation.z = -moveX * 0.5;
    this.ship.rotation.x = -moveY * 0.2; // Flat flight, slight pitch on move
  }

  updateStars(dt) {
    // Move stars to simulate speed
    const positions = this.stars.geometry.attributes.position.array;
    const speed = 40 * dt;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += speed; // Move towards +Z (camera)
      if (positions[i + 2] > 100) {
        positions[i + 2] = -500; // Reset to far back
        // Optional: Randomize X/Y on reset to prevent patterns
        positions[i] = (Math.random() - 0.5) * 600;
        positions[i + 1] = (Math.random() - 0.5) * 400;
      }
    }
    this.stars.geometry.attributes.position.needsUpdate = true;
  }

  updateMissiles(dt) {
    // Player Missiles
    for (let i = this.playerMissiles.length - 1; i >= 0; i--) {
      const m = this.playerMissiles[i];
      m.mesh.position.add(m.velocity.clone().multiplyScalar(dt));
      if (m.mesh.position.z < -100) {
        this.scene.remove(m.mesh);
        this.playerMissiles.splice(i, 1);
      }
    }

    // Alien Missiles
    for (let i = this.alienMissiles.length - 1; i >= 0; i--) {
      const m = this.alienMissiles[i];
      m.mesh.position.add(m.velocity.clone().multiplyScalar(dt));
      if (m.mesh.position.z > 50) {
        this.scene.remove(m.mesh);
        this.alienMissiles.splice(i, 1);
      }
    }
  }

  updateEnemies(dt) {
    if (this.boss) {
      this.updateBoss(dt);
      return; // Stop spawning normal enemies during boss fight
    }

    // Spawning
    // Only spawn if queue has enemies
    // Spawning
    // Only spawn if queue has enemies
    if (this.levelSpawnQueue && this.levelSpawnQueue.length > 0) {
      this.enemySpawnTimer += dt;
      if (this.enemySpawnTimer > this.enemySpawnInterval) {
        this.enemySpawnTimer = 0;
        console.log("Spawning enemy from queue. Remaining:", this.levelSpawnQueue.length);
        this.spawnEnemy();
      }
    } else if (this.levelSpawnQueue && this.levelSpawnQueue.length === 0 && this.enemies.length === 0 && !this.boss) {
      console.log("Queue empty, no enemies, no boss. Triggering boss?");
    }

    // Movement
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.type === 'BLOCK_BLACK') {
        // Move forward until z = -20, then stop
        if (e.mesh.position.z < -20) {
          e.mesh.position.add(e.velocity.clone().multiplyScalar(dt));
        }
        // Continuous shooting
        e.shootTimer += dt;
        if (e.shootTimer > e.shootInterval) {
          e.shootTimer = 0;
          this.fireEnemyMissile(e);
        }
      } else if (e.type === 'UFO') {
        // Parabolic/Swooping motion
        e.time += dt;
        // x = sin(t) * width, z = moves forward but loops? 
        // User said "parabolic motion around the user".
        // Let's do a figure-8 or swoop.
        e.mesh.position.z += 10 * dt; // Forward drift
        e.mesh.position.x = Math.sin(e.time * 2) * 20;
        e.mesh.position.y = Math.cos(e.time * 2) * 5;

        // Keep UFO within bounds
        if (e.mesh.position.z > 20) e.mesh.position.z = -50; // Loop back?
        // User said "does not disappear until you kill it".
        // So if it goes past, maybe it turns around?
        // Let's make it bounce Z.
        if (e.mesh.position.z > 20 || e.mesh.position.z < -100) {
          // Actually, just let it loop for now or bounce.
          // Simple: reset to -100 if > 40
          if (e.mesh.position.z > 40) e.mesh.position.z = -100;
        }
      } else {
        // Standard movement
        e.mesh.position.add(e.velocity.clone().multiplyScalar(dt));
      }

      // Zigzag Logic (Standard Alien)
      if (e.type === 'ALIEN_ZIGZAG') {
        e.time += dt;
        e.mesh.position.x = e.initialX + Math.sin(e.time * 3) * 10;
      }

      // Rotate asteroids
      if (e.type === 'BLOCK') {
        e.mesh.rotation.x += dt;
        e.mesh.rotation.y += dt;
      }

      // Alien Shooting (Standard)
      if (e.type.startsWith('ALIEN')) {
        e.shootTimer += dt;
        if (e.shootTimer > e.shootInterval) {
          e.shootTimer = 0;
          this.fireEnemyMissile(e);
        }
      }

      // Remove if passed player (Except UFO/Black Block which persist)
      if (e.type !== 'UFO' && e.type !== 'BLOCK_BLACK' && e.mesh.position.z > 40) {
        this.scene.remove(e.mesh);
        this.enemies.splice(i, 1);
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 2;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(dt));
      p.mesh.rotation.x += dt * 5;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      } else {
        p.mesh.scale.setScalar(p.life);
      }
    }
  }

  checkCollisions() {
    const shipBox = new THREE.Box3().setFromObject(this.ship);

    // Boss Collisions
    if (this.boss && this.boss.state === 'FIGHTING') {
      const bossBox = new THREE.Box3().setFromObject(this.boss.mesh);

      // Player Missiles vs Boss
      for (let i = this.playerMissiles.length - 1; i >= 0; i--) {
        const m = this.playerMissiles[i];
        const mBox = new THREE.Box3().setFromObject(m.mesh);

        if (mBox.intersectsBox(bossBox)) {
          this.damageBoss(1); // Or weapon damage
          this.spawnParticles(m.mesh.position, 0xffaa00);
          this.scene.remove(m.mesh);
          this.playerMissiles.splice(i, 1);
        }
      }

      // Boss Body vs Player
      if (bossBox.intersectsBox(shipBox)) {
        this.playerHit(1);
      }
    }

    // Player Missiles vs Enemies
    for (let i = this.playerMissiles.length - 1; i >= 0; i--) {
      const m = this.playerMissiles[i];
      const mBox = new THREE.Box3().setFromObject(m.mesh);
      let hit = false;

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];

        // Visibility Check: Don't hit enemies too far back
        if (e.mesh.position.z < -60) continue;

        const eBox = new THREE.Box3().setFromObject(e.mesh);

        if (mBox.intersectsBox(eBox)) {
          hit = true;
          console.log("Enemy hit! Missile damage:", m.damage, "Is Enemy Missile?", (m.damage !== undefined));
          e.hp--;
          this.playSound('HIT');
          this.spawnParticles(e.mesh.position, 0xffaa00);

          if (e.hp <= 0) {
            this.destroyEnemy(j);
          }
          break;
        }
      }

      if (hit) {
        this.scene.remove(m.mesh);
        this.playerMissiles.splice(i, 1);
      }
    }

    // Enemy Missiles vs Player
    const shipBox2 = new THREE.Box3().setFromObject(this.ship);
    for (let i = this.alienMissiles.length - 1; i >= 0; i--) {
      const m = this.alienMissiles[i];
      const mBox = new THREE.Box3().setFromObject(m.mesh);

      if (mBox.intersectsBox(shipBox2)) {
        this.playerHit(m.damage || 1);
        this.scene.remove(m.mesh);
        this.alienMissiles.splice(i, 1);
      }
    }

    // Enemies vs Player (Crash)
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const eBox = new THREE.Box3().setFromObject(e.mesh);

      if (eBox.intersectsBox(shipBox)) {
        this.playerHit();
        this.destroyEnemy(i);
      }
    }
  }

  // --- Helpers ---

  spawnEnemy() {
    if (this.levelSpawnQueue.length === 0) return;

    const type = this.levelSpawnQueue.pop();
    const x = (Math.random() - 0.5) * this.FIELD_WIDTH * 0.8;
    const z = -100;

    const group = new THREE.Group();

    let hp = 2;
    let speed = 15;
    let color = 0xff0000;
    let scale = 1;

    if (type === 'ALIEN_FAST') {
      speed = 25;
      color = 0xffff00; // Yellow
      hp = 5; // Was 3
    } else if (type === 'BLOCK_BLACK') {
      speed = 10; // Moves to position then stops
      color = 0x222222; // Black/Dark Grey
      hp = 15; // Was 5
      scale = 2.0;
    } else if (type === 'UFO') {
      speed = 12;
      color = 0x00ff00; // Greenish
      hp = 5;
      scale = 1.5;
    }

    // 3 items per 15 enemies -> Randomly pre-selected
    // levelEnemiesSpawned is the index of the CURRENT enemy being spawned (0 to 14)
    const hasItem = this.itemIndices && this.itemIndices.has(this.levelEnemiesSpawned);
    if (hasItem) {
      // Visual indicator for item carrier (e.g. glowing core)
      const coreGeo = new THREE.SphereGeometry(0.5 * scale);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.5 * scale;
      group.add(core);
    }

    if (type === 'UFO') {
      // Saucer shape
      const ufoGeo = new THREE.CylinderGeometry(1 * scale, 3 * scale, 1 * scale, 16);
      const ufoMat = new THREE.MeshStandardMaterial({ color: color, emissive: 0x004400 });
      const ufo = new THREE.Mesh(ufoGeo, ufoMat);
      group.add(ufo);

      const domeGeo = new THREE.SphereGeometry(1.5 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const domeMat = new THREE.MeshStandardMaterial({ color: 0x88ffff, transparent: true, opacity: 0.6 });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 0.5 * scale;
      group.add(dome);
    } else {
      // Standard Box/Alien shape
      const bodyGeo = new THREE.BoxGeometry(2 * scale, 1 * scale, 2 * scale);
      const bodyMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      if (type !== 'BLOCK_BLACK') {
        const wingGeo = new THREE.BoxGeometry(4 * scale, 0.5 * scale, 1 * scale);
        const wingMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        group.add(wings);
      }
    }

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.enemies.push({
      mesh: group,
      velocity: new THREE.Vector3(0, 0, speed),
      type: type,
      hp: hp,
      shootTimer: 0,
      shootInterval: type === 'BLOCK_BLACK' ? 1.0 : (1.5 + Math.random()),
      initialX: x,
      time: 0, // For zigzag/UFO
      hasItem: hasItem
    });

    this.levelEnemiesSpawned++;
  }

  fireEnemyMissile(enemy, direction = null, speed = 25, color = 0xff0000, damage = 1) {
    // Double shot for ALIEN_FAST
    if (enemy.type === 'ALIEN_FAST' && !direction) {
      const dir = this.ship.position.clone().sub(enemy.mesh.position).normalize();
      const leftDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.2);
      const rightDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -0.2);

      this.createEnemyMissile(enemy.mesh.position, leftDir, speed, color, damage);
      this.createEnemyMissile(enemy.mesh.position, rightDir, speed, color, damage);
      return;
    }

    let dir;
    if (direction) {
      dir = direction;
    } else {
      dir = this.ship.position.clone().sub(enemy.mesh.position).normalize();
    }

    this.createEnemyMissile(enemy.mesh.position, dir, speed, color, damage);
  }

  createEnemyMissile(position, velocityDir, speed, color, damage) {
    const geo = new THREE.SphereGeometry(0.5);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const missile = new THREE.Mesh(geo, mat);
    missile.position.copy(position);

    this.scene.add(missile);
    this.alienMissiles.push({
      mesh: missile,
      velocity: velocityDir.clone().multiplyScalar(speed),
      damage: damage
    });
    console.log(`Enemy Fired. AlienMissiles: ${this.alienMissiles.length}`);
  }

  destroyEnemy(index) {
    const e = this.enemies[index];
    this.spawnParticles(e.mesh.position, e.type === 'ALIEN' ? 0xff0000 : 0x00ff00);

    // Drop item: Exactly 3 per level (every 5th enemy)
    // We use levelEnemiesSpawned which counts spawns.
    // But here we are in destroyEnemy. We don't know which spawn index THIS enemy was easily without storing it.
    // Actually, let's just use random probability but tuned to 3/15 = 20%.
    // User insisted "out of 15, only 3".
    // Let's store 'hasItem' on the enemy when spawning.

    if (e.hasItem) {
      this.spawnItem(e.mesh.position);
    }

    this.scene.remove(e.mesh);
    this.enemies.splice(index, 1);

    // Scoring: 100 for Level 1, 150 for Level 2, etc.
    this.score += 100 + (this.level - 1) * 50;

    // Boss Spawn Check
    // Spawn boss ONLY after all enemies are spawned AND all are defeated (Wave Clear)
    if (this.levelSpawnQueue.length === 0 && this.enemies.length === 0 && !this.boss) {
      this.spawnBoss();
    }

    this.updateUI();
  }

  nextLevel() {
    console.log("Starting Level " + (this.level + 1));
    this.level++;
    this.levelEnemiesSpawned = 0;
    this.levelBlocksSpawned = 0;
    this.generateItemIndices(); // New random items for this level
    this.droppedItems.clear();

    // Generate Spawn Queue
    this.levelSpawnQueue = [];
    if (this.level === 1) {
      // Level 1: 15 Aliens
      for (let i = 0; i < 15; i++) this.levelSpawnQueue.push('ALIEN');
    } else if (this.level === 2) {
      // Level 2: 15 Aliens + 10 Fast Aliens
      for (let i = 0; i < 15; i++) this.levelSpawnQueue.push('ALIEN');
      for (let i = 0; i < 10; i++) this.levelSpawnQueue.push('ALIEN_FAST');
    } else if (this.level === 3) {
      // Level 3: 10 Fast + 10 Aliens + 5 Black Blocks
      for (let i = 0; i < 10; i++) this.levelSpawnQueue.push('ALIEN_FAST');
      for (let i = 0; i < 10; i++) this.levelSpawnQueue.push('ALIEN');
      for (let i = 0; i < 5; i++) this.levelSpawnQueue.push('BLOCK_BLACK');
    } else if (this.level === 4) {
      // Level 4: 10 Fast + 10 Aliens + 5 Black + 5 UFOs
      for (let i = 0; i < 10; i++) this.levelSpawnQueue.push('ALIEN_FAST');
      for (let i = 0; i < 10; i++) this.levelSpawnQueue.push('ALIEN');
      for (let i = 0; i < 5; i++) this.levelSpawnQueue.push('BLOCK_BLACK');
      for (let i = 0; i < 5; i++) this.levelSpawnQueue.push('UFO');
    }

    // Shuffle Queue
    for (let i = this.levelSpawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.levelSpawnQueue[i], this.levelSpawnQueue[j]] = [this.levelSpawnQueue[j], this.levelSpawnQueue[i]];
    }

    // Difficulty Scaling
    this.enemySpawnInterval = Math.max(0.5, 2.0 - (this.level * 0.1)); // Cap at 0.5s

    // Visual feedback
    this.showLevelTitle(`LEVEL ${this.level}`);

    // Playables SDK
    this.saveGameData();
  }

  generateItemIndices() {
    this.itemIndices = new Set();
    while (this.itemIndices.size < 3) {
      this.itemIndices.add(Math.floor(Math.random() * 15));
    }
    console.log("Item Indices for Level " + this.level + ":", Array.from(this.itemIndices));
  }

  showLevelTitle(text) {
    const title = document.createElement("div");
    title.innerText = text;
    title.style.position = "absolute";
    title.style.top = "50%";
    title.style.left = "50%";
    title.style.transform = "translate(-50%, -50%)";
    title.style.color = "#fff";
    title.style.fontSize = "80px";
    title.style.fontWeight = "900";
    title.style.fontFamily = "sans-serif";
    title.style.textShadow = "0 0 20px #f0f, 0 0 40px #0ff";
    title.style.zIndex = "2000";
    title.style.opacity = "0";
    title.style.transition = "opacity 0.5s";
    document.body.appendChild(title);

    // Fade in
    requestAnimationFrame(() => title.style.opacity = "1");

    // Remove after 2s
    setTimeout(() => {
      title.style.opacity = "0";
      setTimeout(() => title.remove(), 500);
    }, 2000);
  }

  spawnBoss() {
    if (this.boss) return;

    console.log(`Boss Level ${this.level} Incoming!`);
    this.showLevelTitle(`BOSS LEVEL ${this.level}`);

    const group = new THREE.Group();
    let hp = 50 + (this.level * 25);
    let color = 0xff0000;

    // Unique Boss Designs
    if (this.level === 1) {
      // Level 1: The Interceptor (Fast, sleek)
      const bodyGeo = new THREE.ConeGeometry(3, 10, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = -Math.PI / 2;
      group.add(body);

      const wingGeo = new THREE.BoxGeometry(12, 0.5, 4);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.position.z = 2;
      group.add(wings);
    } else if (this.level === 2) {
      // Level 2: Twin Hull Destroyer
      const hullGeo = new THREE.BoxGeometry(3, 2, 12);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x552200 });

      const leftHull = new THREE.Mesh(hullGeo, hullMat);
      leftHull.position.x = -5;
      group.add(leftHull);

      const rightHull = new THREE.Mesh(hullGeo, hullMat);
      rightHull.position.x = 5;
      group.add(rightHull);

      const bridgeGeo = new THREE.BoxGeometry(8, 1, 4);
      const bridge = new THREE.Mesh(bridgeGeo, hullMat);
      bridge.position.z = -2;
      group.add(bridge);

      hp *= 1.2;
    } else if (this.level === 3) {
      // Level 3: The Mothership (Bulky, tanky)
      const mainGeo = new THREE.CylinderGeometry(8, 6, 4, 8);
      const mainMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 });
      const main = new THREE.Mesh(mainGeo, mainMat);
      main.rotation.x = Math.PI / 2;
      group.add(main);

      const ringGeo = new THREE.TorusGeometry(12, 1, 8, 16);
      const ring = new THREE.Mesh(ringGeo, mainMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      hp *= 1.5;
    } else if (this.level === 4) {
      // Level 4: THE TRIUMVIRATE (All 3 Bosses)

      // 1. The Interceptor (Center)
      const bodyGeo = new THREE.ConeGeometry(3, 10, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x550000 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = -Math.PI / 2;
      group.add(body);

      const wingGeo = new THREE.BoxGeometry(12, 0.5, 4);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xaa0000 });
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.position.z = 2;
      group.add(wings);

      // 2. Twin Hull Destroyer (Left)
      const hullGeo = new THREE.BoxGeometry(3, 2, 12);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x552200 });

      const leftShipGroup = new THREE.Group();
      leftShipGroup.position.set(-15, 0, 0);

      const leftHull = new THREE.Mesh(hullGeo, hullMat);
      leftHull.position.x = -3;
      leftShipGroup.add(leftHull);

      const rightHull = new THREE.Mesh(hullGeo, hullMat);
      rightHull.position.x = 3;
      leftShipGroup.add(rightHull);

      const bridgeGeo = new THREE.BoxGeometry(8, 1, 4);
      const bridge = new THREE.Mesh(bridgeGeo, hullMat);
      bridge.position.z = -2;
      leftShipGroup.add(bridge);

      group.add(leftShipGroup);

      // 3. The Mothership (Right)
      const mainGeo = new THREE.CylinderGeometry(6, 4, 3, 8); // Slightly smaller
      const mainMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x004400 });

      const rightShipGroup = new THREE.Group();
      rightShipGroup.position.set(15, 0, 0);

      const main = new THREE.Mesh(mainGeo, mainMat);
      main.rotation.x = Math.PI / 2;
      rightShipGroup.add(main);

      const ringGeo = new THREE.TorusGeometry(8, 1, 8, 16);
      const ring = new THREE.Mesh(ringGeo, mainMat);
      ring.rotation.x = Math.PI / 2;
      rightShipGroup.add(ring);

      group.add(rightShipGroup);

      hp = 500; // Massive HP for final boss
    } else {
      // Level 5+: The Dreadnought
      const bodyGeo = new THREE.BoxGeometry(6, 4, 20);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      const wingGeo = new THREE.BoxGeometry(24, 1, 8);
      const wings = new THREE.Mesh(wingGeo, bodyMat);
      wings.position.z = -2;
      group.add(wings);

      const towerGeo = new THREE.CylinderGeometry(2, 3, 5, 8);
      const tower = new THREE.Mesh(towerGeo, bodyMat);
      tower.rotation.x = Math.PI / 2;
      tower.position.y = 3;
      tower.position.z = -4;
      group.add(tower);

      hp *= 2.0;
    }

    group.position.set(0, 0, -100); // Start far back
    this.scene.add(group);

    this.boss = {
      mesh: group,
      hp: hp,
      maxHp: hp,
      state: 'ENTERING', // ENTERING, FIGHTING, DYING
      velocity: new THREE.Vector3(0, 0, 10),
      shootTimer: 0,
      shootInterval: Math.max(0.5, 1.2 - (this.level * 0.1))
    };
  }

  updateBoss(dt) {
    if (!this.boss) return;

    const b = this.boss;

    if (b.state === 'ENTERING') {
      b.mesh.position.z += 20 * dt;
      if (b.mesh.position.z >= -30) {
        b.state = 'FIGHTING';
        b.velocity.set(10, 0, 0); // Start moving sideways
      }
    } else if (b.state === 'FIGHTING') {
      // Movement
      b.mesh.position.add(b.velocity.clone().multiplyScalar(dt));

      // Bounce off walls
      if (b.mesh.position.x > 20 || b.mesh.position.x < -20) {
        b.velocity.x *= -1;
      }

      // Shooting
      b.shootTimer += dt;
      if (b.shootTimer > b.shootInterval) {
        b.shootTimer = 0;
        this.bossShoot();
      }

      // Update Health Bar Position
      const vector = b.mesh.position.clone();
      vector.y += 10; // Above boss
      vector.project(this.camera);

      const x = (vector.x * .5 + .5) * window.innerWidth;
      const y = (-(vector.y * .5) + .5) * window.innerHeight;

      const healthContainer = document.getElementById("boss-health-container");
      healthContainer.style.left = `${x}px`;
      healthContainer.style.top = `${y}px`;
      healthContainer.classList.remove("hidden");

      const healthBar = document.getElementById("boss-health-bar");
      healthBar.style.width = `${(b.hp / b.maxHp) * 100}%`;
    }
  }

  bossShoot() {
    if (this.level === 2) {
      // Random rapid fire (RED missiles)
      for (let i = 0; i < 5; i++) {
        const dir = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.5, 1).normalize();
        this.fireEnemyMissile({ mesh: this.boss.mesh }, dir, 30, 0xff0000); // Red
      }
    } else if (this.level === 3) {
      // Laser Shot (High damage)
      const dir = this.ship.position.clone().sub(this.boss.mesh.position).normalize();
      this.fireEnemyMissile({ mesh: this.boss.mesh }, dir, 40, 0xff0000, 2); // 2 damage
    } else if (this.level === 4) {
      // Final Boss: All attacks
      const attack = Math.floor(Math.random() * 3);
      if (attack === 0) {
        // Triple (Level 1 Style)
        this.fireEnemyMissile({ mesh: this.boss.mesh }, null, 25, 0xff0000);
        const leftPos = this.boss.mesh.position.clone(); leftPos.x -= 5;
        this.fireEnemyMissile({ mesh: { position: leftPos } }, null, 25, 0xff0000);
        const rightPos = this.boss.mesh.position.clone(); rightPos.x += 5;
        this.fireEnemyMissile({ mesh: { position: rightPos } }, null, 25, 0xff0000);
      } else if (attack === 1) {
        // Random Spray (Level 2 Style)
        for (let i = 0; i < 5; i++) {
          const dir = new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5) * 0.5, 1).normalize();
          this.fireEnemyMissile({ mesh: this.boss.mesh }, dir, 30, 0xff0000);
        }
      } else {
        // Laser (Level 3 Style)
        const dir = this.ship.position.clone().sub(this.boss.mesh.position).normalize();
        this.fireEnemyMissile({ mesh: this.boss.mesh }, dir, 40, 0xff00ff, 2);
      }
    } else {
      // Level 1: Standard
      // Triple shot
      this.fireEnemyMissile({ mesh: this.boss.mesh });
      const leftPos = this.boss.mesh.position.clone();
      leftPos.x -= 5;
      this.fireEnemyMissile({ mesh: { position: leftPos } });
      const rightPos = this.boss.mesh.position.clone();
      rightPos.x += 5;
      this.fireEnemyMissile({ mesh: { position: rightPos } });
    }
  }

  damageBoss(amount) {
    if (!this.boss) return;
    console.log(`Boss Damaged: ${amount}. HP: ${this.boss.hp}`);
    this.boss.hp -= amount;

    // Visual flash?

    if (this.boss.hp <= 0) {
      this.destroyBoss();
    }
  }

  destroyBoss() {
    const bossPos = this.boss.mesh.position.clone(); // Capture position BEFORE nulling

    this.spawnParticles(bossPos, 0xff0000);
    this.spawnParticles(bossPos, 0xffff00); // More particles
    this.spawnParticles(bossPos, 0xffffff);

    this.scene.remove(this.boss.mesh);
    this.boss = null;
    this.score += 5000;
    this.updateUI();
    document.getElementById("boss-health-container").classList.add("hidden");

    // Drop BIG reward?
    this.spawnItem(bossPos); // Single item drop

    // Level Complete!
    if (this.level === 4) {
      this.gameWin();
    } else {
      this.nextLevel();
    }
  }

  gameWin() {
    this.isPlaying = false;
    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("go-title").innerText = "MISSION COMPLETE";
    document.getElementById("go-score").innerText = `Final Score: ${this.score}`;

    // Playables SDK
    console.log("GameWin called. Score:", this.score);
    this.callSDK('engagement', 'sendScore', { value: Math.floor(this.score) });
    this.saveGameData();
    this.callSDK('game', 'gameReady');
    this.callSDK('ads', 'requestInterstitialAd');
  }

  playerHit(damage = 1) {
    if (this.invulnerable) return; // Invulnerable

    this.lives -= damage;

    // Trigger Invulnerability
    this.invulnerable = true;
    this.invulnerableTimer = 2.0; // 2 seconds
    this.playSound('DAMAGE');
    this.updateUI();
    this.playSound('DAMAGE');
    this.spawnParticles(this.ship.position, 0x00ffff);

    if (this.lives <= 0) {
      this.gameOver();
    }
  }



  gameOver() {
    this.isPlaying = false;
    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("go-score").innerText = `Score: ${this.score}`;

    // Playables SDK
    console.log("GameOver called. Score:", this.score);
    this.callSDK('engagement', 'sendScore', { value: Math.floor(this.score) });
    this.saveGameData();
    this.callSDK('game', 'gameReady');
    this.callSDK('ads', 'requestInterstitialAd');
  }

  spawnParticles(position, color) {
    const count = 10;
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshBasicMaterial({ color: color });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      this.scene.add(mesh);
      this.particles.push({ mesh, velocity: vel, life: 1.0 });
    }
  }



  adjustCamera() {
    // Desired Horizontal Coverage at Y=0:
    // We want to see width ~60 units (Field is 50).
    // tan(vFOV/2) = (Width / 2) / Distance / Aspect
    // Distance = 50 (Camera Y)
    // Width / 2 = 30
    // tan(vFOV/2) = 30 / 50 / aspect = 0.6 / aspect

    const aspect = window.innerWidth / window.innerHeight;

    const targetTanHalfVFOV = 0.6 / aspect;
    let newVFOV = THREE.MathUtils.radToDeg(2 * Math.atan(targetTanHalfVFOV));

    // Clamp reasonable limits
    newVFOV = Math.min(100, Math.max(40, newVFOV));

    this.camera.fov = newVFOV;
    this.camera.updateProjectionMatrix();
  }

  // --- Playables SDK Methods ---

  async loadGameData() {
    try {
      const data = await this.callSDK('game', 'loadData');
      console.log("Loaded Data:", data);
      if (data) {
        // Restore state
        if (data.score) this.score = data.score;
        if (data.level) this.level = data.level;
        if (data.lives) this.lives = data.lives;
        if (data.maxLives) this.maxLives = data.maxLives;
        if (data.rapidFireLevel) this.rapidFireLevel = data.rapidFireLevel;
        if (data.speedBoostLevel) this.speedBoostLevel = data.speedBoostLevel;
        if (data.weaponUpgradeLevel) this.weaponUpgradeLevel = data.weaponUpgradeLevel;
        if (data.maxLifeUpgrades) this.maxLifeUpgrades = data.maxLifeUpgrades;

        // Apply upgrades
        if (this.rapidFireLevel > 0) this.shootCooldown *= Math.pow(0.7, this.rapidFireLevel);
        if (this.speedBoostLevel > 0) this.shipSpeed *= Math.pow(1.3, this.speedBoostLevel);
        if (this.weaponUpgradeLevel > 0) this.weaponLevel = 1 + this.weaponUpgradeLevel;

        this.updateUI();
      }
    } catch (e) {
      console.error("Error loading game data:", e);
    }

    // Signal game ready after loading
    this.callSDK('game', 'gameReady');
  }

  saveGameData() {
    const data = {
      score: this.score,
      level: this.level,
      lives: this.lives,
      maxLives: this.maxLives,
      rapidFireLevel: this.rapidFireLevel,
      speedBoostLevel: this.speedBoostLevel,
      weaponUpgradeLevel: this.weaponUpgradeLevel,
      maxLifeUpgrades: this.maxLifeUpgrades
    };
    this.callSDK('game', 'saveData', JSON.stringify(data));
  }

  onPause() {
    this.isPlaying = false;
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  onResume() {
    // Don't auto-resume isPlaying if we were in a menu, but for now let's assume pause/resume toggles game loop if it was running?
    // Actually, the game loop `animate` runs always, but `update` logic depends on `isPlaying`.
    // If we were playing before, we should resume.
    // But `onPause` sets `isPlaying = false`. We need to know if we SHOULD be playing.
    // For simplicity, we can just leave `isPlaying` false and let user click "Resume" or "Start" if we had a pause menu.
    // BUT, Playables usually expects the game to resume exactly where it left off.
    // Let's add a `wasPlaying` flag if needed, or just resume if we aren't in Game Over / Start Screen.
    const inMenu = !document.getElementById("start-screen").classList.contains("hidden") || !document.getElementById("game-over-screen").classList.contains("hidden");
    if (!inMenu) {
      this.isPlaying = true;
    }

    if (this.audioContext && this.audioContext.state === 'suspended' && this.isAudioEnabled) {
      this.audioContext.resume();
    }
  }

  onAudioChange(enabled) {
    this.isAudioEnabled = enabled;
    if (this.audioContext) {
      if (enabled) {
        this.audioContext.resume();
      } else {
        this.audioContext.suspend();
      }
    }
  }

  spawnItem(position) {
    let types = [
      { type: 'SPEED_SHOOT', color: 0xffff00, emoji: 'âš¡' },
      { type: 'SPEED_SHIP', color: 0x00ffff, emoji: 'ðŸ’¨' },
      { type: 'WEAPON', color: 0xff00ff, emoji: 'ðŸ”«' },
      { type: 'MAX_HEALTH', color: 0x00ff00, emoji: 'ðŸ”‹' } // Max health increase
    ];

    // Filter out maxed upgrades AND already dropped items
    types = types.filter(t => {
      if (this.droppedItems.has(t.type)) return false; // Already dropped this level
      if (t.type === 'SPEED_SHOOT') return this.rapidFireLevel < 2;
      if (t.type === 'SPEED_SHIP') return this.speedBoostLevel < 2;
      if (t.type === 'WEAPON') return this.weaponUpgradeLevel < 2;
      if (t.type === 'MAX_HEALTH') return this.maxLifeUpgrades < 4;
      return true;
    });

    if (types.length === 0) {
      // Fallback if everything maxed or dropped: Score or Health Refill
      types.push({ type: 'HEALTH', color: 0x00ff00, emoji: 'â¤ï¸' });
    }

    // Random type
    const data = types[Math.floor(Math.random() * types.length)];

    // Track dropped item (unless it's the fallback HEALTH)
    if (data.type !== 'HEALTH') {
      this.droppedItems.add(data.type);
    }

    // Create texture from emoji
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 48px sans-serif'; // Bold for visibility
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow/Shadow for contrast
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'black';
    ctx.strokeText(data.emoji, 32, 32);

    ctx.shadowBlur = 0; // Reset for fill
    ctx.fillStyle = 'white';
    ctx.fillText(data.emoji, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; // Ensure correct colors
    const mat = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffffff,
      toneMapped: false // Prevent bloom/lighting from washing it out
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3, 3, 1);
    sprite.position.copy(position);

    this.scene.add(sprite);
    this.items.push({ mesh: sprite, type: data.type, velocity: new THREE.Vector3(0, 0, 10) });
  }

  updateItems(dt) {
    const shipBox = new THREE.Box3().setFromObject(this.ship);

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.mesh.position.add(item.velocity.clone().multiplyScalar(dt));

      // Collision with ship
      const itemBox = new THREE.Box3().setFromObject(item.mesh);
      if (itemBox.intersectsBox(shipBox)) {
        this.activatePowerUp(item.type);
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
        continue;
      }

      // Remove if passed player
      if (item.mesh.position.z > 40) {
        this.scene.remove(item.mesh);
        this.items.splice(i, 1);
      }
    }
  }

  activatePowerUp(type) {
    let message = "";
    let emoji = "";

    switch (type) {
      case 'SPEED_SHOOT':
        if (this.rapidFireLevel < 2) {
          this.rapidFireLevel++;
          this.shootCooldown *= 0.7; // 30% faster
          message = `RAPID FIRE! (${this.rapidFireLevel}/2)`;
          emoji = "âš¡";
        }
        break;
      case 'SPEED_SHIP':
        if (this.speedBoostLevel < 2) {
          this.speedBoostLevel++;
          this.shipSpeed *= 1.3; // 30% faster
          message = `SPEED BOOST! (${this.speedBoostLevel}/2)`;
          emoji = "ðŸ’¨";
        }
        break;
      case 'WEAPON':
        if (this.weaponUpgradeLevel < 2) {
          this.weaponUpgradeLevel++;
          this.weaponLevel = 1 + this.weaponUpgradeLevel; // 1->2->3
          message = `WEAPON UPGRADE! (${this.weaponUpgradeLevel}/2)`;
          emoji = "ðŸ”«";
        }
        break;
      case 'HEALTH':
        if (this.lives < this.maxLives) {
          this.lives++;
          this.updateUI();
        }
        message = "REPAIR!";
        emoji = "â¤ï¸";
        break;
      case 'MAX_HEALTH':
        if (this.maxLifeUpgrades < 4) {
          this.maxLifeUpgrades++;
          this.maxLives++;
          this.lives++; // Also heal 1
          this.updateUI();
          message = `MAX LIFE! (${this.maxLifeUpgrades}/4)`;
          emoji = "ðŸ”‹";
        }
        break;
    }

    this.score += 50;
    this.updateUI();
    this.showItemPopup(message, emoji);

    if (IS_PLAYABLES) {
      this.saveGameData();
    }
  }

  showItemPopup(message, emoji) {
    const popup = document.getElementById("item-popup");
    popup.innerText = `${emoji} ${message}`;
    popup.classList.remove("hidden");
    popup.classList.add("show");

    if (this.popupTimeout) clearTimeout(this.popupTimeout);

    this.popupTimeout = setTimeout(() => {
      popup.classList.remove("show");
      setTimeout(() => popup.classList.add("hidden"), 300); // Wait for fade out
    }, 2000);
  }

  onKeyDown(e) {
    this.keys[e.key.toLowerCase()] = true;
    if (e.code === "Space") {
      if (!this.isPlaying) {
        if (this.lives > 0) {
          this.startGame();
        } else {
          this.resetGame();
        }
      } else {
        this.firePlayerMissile();
      }
    }
  }

  onKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  onTouchStart(e) {
    e.preventDefault();
    if (!this.isPlaying) {
      if (this.lives > 0) this.startGame();
      else this.resetGame();
      return;
    }

    // Check if tap is for shooting (if not on joystick)
    // For now, let's say right side of screen is shoot, left is joystick?
    // Or just tap anywhere to shoot if not dragging joystick?
    // Let's make it simple: Joystick appears on touch. Tap elsewhere or second touch is shoot.

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // If left side of screen, joystick
      if (touch.clientX < window.innerWidth / 2) {
        if (this.touchId === null) {
          this.touchId = touch.identifier;
          this.touchStartPos = { x: touch.clientX, y: touch.clientY };
          this.joystickBase.style.display = "block";
          this.joystickBase.style.left = `${touch.clientX}px`;
          this.joystickBase.style.top = `${touch.clientY}px`;
          this.joystickKnob.style.transform = `translate(-50%, -50%)`;
        }
      } else {
        // Right side tap = shoot
        this.firePlayerMissile();
      }
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    if (!this.isPlaying) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        const touch = e.changedTouches[i];
        const deltaX = touch.clientX - this.touchStartPos.x;
        const deltaY = touch.clientY - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxRadius = 50;
        let moveX = deltaX;
        let moveY = deltaY;

        if (distance > maxRadius) {
          const angle = Math.atan2(deltaY, deltaX);
          moveX = Math.cos(angle) * maxRadius;
          moveY = Math.sin(angle) * maxRadius;
        }

        this.joystickKnob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
        this.joystickInput = { x: moveX / maxRadius, y: moveY / maxRadius };
      }
    }
  }
  onTouchEnd(e) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        this.touchId = null;
        this.touchStartPos = null;
        this.joystickBase.style.display = "none";
        this.joystickInput = { x: 0, y: 0 };
      }
    }
  }

  // --- Actions ---

  startGame() {
    // Ensure fresh state if starting from scratch or queue is empty
    if ((this.gameTime === 0 && this.score === 0) || !this.levelSpawnQueue || this.levelSpawnQueue.length === 0) {
      console.log("StartGame: Resetting game...");
      this.resetGame();
    }

    this.initAudio(); // Start Audio Context
    this.isPlaying = true;
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-over-screen").classList.add("hidden");

    // Show HUD
    document.getElementById("level").classList.remove("hidden");
    document.getElementById("score").classList.remove("hidden");
    document.getElementById("battery-container").classList.remove("hidden");

    // Ensure UI is fresh
    this.updateUI();

    // Show Level 1
    this.showLevelTitle(`LEVEL ${this.level}`);

    // Playables SDK
    this.callSDK('game', 'gameReady');
  }

  showDetails() {
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("details-screen").classList.remove("hidden");
  }

  hideDetails() {
    document.getElementById("details-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
  }

  resetGame() {
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.maxLives = 3; // Reset max lives
    this.levelEnemiesSpawned = 0;
    this.levelBlocksSpawned = 0;

    // Item Levels
    this.rapidFireLevel = 0; // Max 2
    this.speedBoostLevel = 0; // Max 2
    this.weaponUpgradeLevel = 0; // Max 2
    this.maxLifeUpgrades = 0; // Max 4

    this.generateItemIndices(); // Init items
    this.droppedItems.clear();

    // Level 1 Queue
    this.levelSpawnQueue = [];
    for (let i = 0; i < 15; i++) this.levelSpawnQueue.push('ALIEN');
    console.log("Reset Game: Queue populated with " + this.levelSpawnQueue.length + " enemies.");

    this.shootCooldown = 0.25; // Default
    this.shipSpeed = 30; // Units per second (was 20 * 60 before? No, was 20 * 1 if 60fps. So 20 is fine. Let's make it 30 for snappy feel)
    this.weaponLevel = 1; // Default (1 missile)

    // Reset Input
    this.keys = {};
    this.joystickInput = { x: 0, y: 0 };

    // Invulnerability
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    if (this.ship) this.ship.visible = true;

    this.updateUI();
    this.ship.position.set(0, 0, 20);
    this.ship.rotation.set(0, 0, 0);
    // Clear enemies/missiles
    this.enemies.forEach(e => this.scene.remove(e.mesh));
    this.enemies = [];
    this.playerMissiles.forEach(m => this.scene.remove(m.mesh));
    this.playerMissiles = [];
    this.alienMissiles.forEach(m => this.scene.remove(m.mesh));
    this.alienMissiles = [];
    this.items.forEach(i => this.scene.remove(i.mesh));
    this.items = [];

    if (this.boss) {
      this.scene.remove(this.boss.mesh);
      this.boss = null;
    }

    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");

    // Hide HUD
    document.getElementById("level").classList.add("hidden");
    document.getElementById("score").classList.add("hidden");
    document.getElementById("battery-container").classList.add("hidden");
  }

  firePlayerMissile() {
    if (this.gameTime - this.lastShotTime < this.shootCooldown) return;
    this.lastShotTime = this.gameTime;
    this.playSound('SHOOT');

    const level = this.weaponLevel || 1;

    // Weapon Logic
    // Level 1 (Default): 1 Missile
    // Level 2 (Upgrade 1): 3 Missiles
    // Level 3 (Upgrade 2): 5 Missiles

    if (level === 1) {
      this.createPlayerMissile(this.ship.position, 0, 0xffff00);
    } else if (level === 2) {
      // 3 Missiles
      this.createPlayerMissile(this.ship.position, 0, 0x00ffff, 50);
      this.createPlayerMissile(this.ship.position, -0.15, 0x00ffff, 50);
      this.createPlayerMissile(this.ship.position, 0.15, 0x00ffff, 50);
    } else {
      // 5 Missiles
      this.createPlayerMissile(this.ship.position, 0, 0xff00ff, 60);
      this.createPlayerMissile(this.ship.position, -0.1, 0xff00ff, 60);
      this.createPlayerMissile(this.ship.position, 0.1, 0xff00ff, 60);
      this.createPlayerMissile(this.ship.position, -0.25, 0xff00ff, 60);
      this.createPlayerMissile(this.ship.position, 0.25, 0xff00ff, 60);
    }

    this.playShootSound();
  }

  createPlayerMissile(pos, angleOffset, color, speed = 40, radius = 0.2, length = 1) {
    const geo = new THREE.CapsuleGeometry(radius, length, 4, 8);
    const mat = new THREE.MeshBasicMaterial({ color: color });
    const missile = new THREE.Mesh(geo, mat);

    missile.rotation.x = Math.PI / 2;
    missile.rotation.z = angleOffset;

    missile.position.copy(pos);
    missile.position.z -= 1.5;

    // Calculate velocity with angle
    const velocity = new THREE.Vector3(Math.sin(angleOffset) * speed, 0, -Math.cos(angleOffset) * speed); // Simplified for 2D plane
    // Actually, we just want slight spread in X
    velocity.set(Math.sin(angleOffset) * speed, 0, -speed);

    this.scene.add(missile);
    this.playerMissiles.push({ mesh: missile, velocity: velocity });
  }

  // --- Audio & UI ---



  playShootSound() {
    if (!this.isAudioEnabled || !this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(880, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.1);
    } catch (e) { }
  }

  updateUI() {
    document.getElementById("level").innerText = `Level: ${this.level}`;
    document.getElementById("score").innerText = `Score: ${this.score}`;

    // Battery UI
    const batteryBody = document.querySelector(".battery-body");
    if (!batteryBody) return;

    // Clear existing
    batteryBody.innerHTML = "";

    const max = this.maxLives || 3;
    const current = this.lives;

    // Set width dynamically: 20px per segment
    batteryBody.style.width = `${max * 20}px`;

    for (let i = 0; i < max; i++) {
      const segment = document.createElement("div");
      segment.className = "battery-segment";
      if (i >= current) {
        segment.classList.add("empty");
      }
      batteryBody.appendChild(segment);
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  // Playables SDK Methods
  onPause() { this.isPlaying = false; }
  onResume() { if (this.lives > 0) this.isPlaying = true; }
  // --- Audio ---

  initAudio() {
    if (!this.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playSound(type) {
    if (!this.isAudioEnabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'SHOOT') {
      // Pew pew: High to low frequency sweep
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'HIT') {
      // Enemy hit: Short blip
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'DAMAGE') {
      // Player damage: Low, dissonant noise-like
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.3);

      // Add a second oscillator for dissonance
      const osc2 = ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(150, now);
      osc2.frequency.linearRampToValueAtTime(40, now + 0.3);
      osc2.connect(gain);
      osc2.start(now);
      osc2.stop(now + 0.3);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'MISS') {
      // User missing shooting? Actually user asked for "user missing shooting"
      // Maybe a "whiff" sound? Or just silence?
      // "user missing shooting" -> maybe when a missile goes off screen without hitting anything?
      // Or when user presses shoot but is on cooldown?
      // I'll assume "missile goes off screen" or "missile expires".
      // But that happens a lot.
      // Maybe "user missing shooting" means "shooting sound"?
      // "user missing shooting" -> "User missile shooting" (typo in request?)
      // "user missing shooting" -> "user missile shooting" makes sense.
      // Wait, "user missing shooting" could mean "User Missle Shooting".
      // I will assume they meant "User Missile Shooting".
    }
  }

  callSDK(module, method, ...args) {
    const sdk = (typeof ytgame !== 'undefined' ? ytgame : (typeof window !== 'undefined' && window.ytgame ? window.ytgame : null));
    if (sdk && sdk.IN_PLAYABLES_ENV && sdk[module] && typeof sdk[module][method] === 'function') {
      try {
        return sdk[module][method](...args);
      } catch (e) {
        console.error(`Error calling ytgame.${module}.${method}:`, e);
      }
    } else {
      console.log(`SDK not available or method missing: ytgame.${module}.${method}`);
    }
    return null;
  }

  onAudioChange(enabled) {
    this.isAudioEnabled = enabled;
    if (!enabled && this.audioContext) {
      this.audioContext.suspend();
    } else if (enabled && this.audioContext) {
      this.audioContext.resume();
    }
  }
}