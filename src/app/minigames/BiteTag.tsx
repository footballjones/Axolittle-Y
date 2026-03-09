/**
 * Bite Tag - 4P multiplayer tag game
 * Real-time tag game vs bots. When tagged by "It", you get a bite. 3 bites = out.
 * Last standing or least bites after 60 seconds wins.
 * Features: Canvas rendering, joystick controls, dash mechanic, walls, kelp zones, hazard
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { GameWrapper } from './GameWrapper';
import { MiniGameProps, GameResult } from './types';
import { calculateRewards } from './config';

const CANVAS_W = 360;
const CANVAS_H = 640;

// Arena boundaries
const ARENA_TOP = 60;
const ARENA_BOTTOM = 580;
const ARENA_LEFT = 10;
const ARENA_RIGHT = 350;

// Player
const AXO_RADIUS = 18;
const BASE_SPEED = 3;
const ACCELERATION = 0.3;
const DECELERATION = 0.2;

// Dash
const DASH_DISTANCE = 140; // Increased significantly for much longer dashes
const DASH_DURATION = 120; // Reduced further for much faster dashes
const DASH_COOLDOWN_BASE = 5000;
const DASH_INVULN_MS = 200;

// Tag / Bite
const TAG_INVULN_MS = 2500; // 2.5 seconds for "no tag backs"
const MAX_BITES = 3;

// Match
const MATCH_DURATION = 60; // 60 seconds
const HAZARD_START_TIME = 20; // Start hazard at 20 seconds (1/3 of game)
const KELP_SLOW_FACTOR = 0.5;

// Joystick
const JOY_MAX_R = 50;
const JOY_DEAD = 8;
const DASH_BTN_X = 310;
const DASH_BTN_Y = 540;
const DASH_BTN_R = 30;

// Arena elements
const WALLS = [
  { x: 60,  y: 160, w: 50, h: 16 },
  { x: 250, y: 160, w: 50, h: 16 },
  { x: 145, y: 310, w: 70, h: 16 },
  { x: 60,  y: 440, w: 50, h: 16 },
  { x: 250, y: 440, w: 50, h: 16 },
];

const KELP_ZONES = [
  { cx: 80,  cy: 300, r: 35 },
  { cx: 280, cy: 300, r: 35 },
  { cx: 180, cy: 480, r: 30 },
];

interface Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  topSpeed: number;
  dashCdMs: number;
  facingX: number;
  facingY: number;
  isIt: boolean;
  bites: number;
  eliminated: boolean;
  dashCooldown: number;
  isDashing: boolean;
  dashEndTime: number;
  dashDirX: number;
  dashDirY: number;
  invulnUntil: number;
  // Bot AI fields
  dx: number;
  dy: number;
  inputMag: number;
  lockTarget: Entity | null;
  lockUntil: number;
  fleeAngle: number;
  fleeAngleNext: number;
  wallAvoidDx: number;
  wallAvoidDy: number;
  wallAvoidUntil: number;
  // Tag targeting restriction
  lastTagger: Entity | null;
  cannotTargetTaggerUntil: number;
}

interface Joystick {
  active: boolean;
  originX: number;
  originY: number;
  curX: number;
  curY: number;
  touchId: number | null;
}

export function BiteTag({ onEnd, energy, speed = 0, stamina = 0 }: MiniGameProps) {
  const [timeLeft, setTimeLeft] = useState(MATCH_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const [hadEnergyAtStart, setHadEnergyAtStart] = useState(false);
  const [finalRewards, setFinalRewards] = useState<{ tier: string; xp: number; coins: number; opals?: number } | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isWinner, setIsWinner] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const gameStateRef = useRef<{
    player: Entity | null;
    bot: Entity | null;
    bot2: Entity | null;
    bot3: Entity | null;
    matchStart: number;
    hazardRadius: number;
    joystick: Joystick;
    keys: { up: boolean; down: boolean; left: boolean; right: boolean };
    dashTouchId: number | null;
  }>({
    player: null,
    bot: null,
    bot2: null,
    bot3: null,
    matchStart: 0,
    hazardRadius: 0,
    joystick: { active: false, originX: 0, originY: 0, curX: 0, curY: 0, touchId: null },
    keys: { up: false, down: false, left: false, right: false },
    dashTouchId: null,
  });

  const createEntity = useCallback((x: number, y: number, topSpeed: number, dashCdMs: number): Entity => {
    return {
      x, y, vx: 0, vy: 0,
      topSpeed, dashCdMs,
      facingX: 0, facingY: 1,
      isIt: false, bites: 0, eliminated: false,
      dashCooldown: 0, isDashing: false, dashEndTime: 0,
      dashDirX: 0, dashDirY: 0,
      invulnUntil: 0,
      dx: 0, dy: 0, inputMag: 0,
      lockTarget: null, lockUntil: 0,
      fleeAngle: (Math.random() - 0.5) * 1.2,
      fleeAngleNext: 0,
      wallAvoidDx: 0, wallAvoidDy: 0, wallAvoidUntil: 0,
      lastTagger: null,
      cannotTargetTaggerUntil: 0,
    };
  }, []);

  const getAlive = useCallback((): Entity[] => {
    const { player, bot, bot2, bot3 } = gameStateRef.current;
    return [player, bot, bot2, bot3].filter(e => e && !e.eliminated) as Entity[];
  }, []);

  const reset = useCallback(() => {
    const pTop = BASE_SPEED * (1 + 0.05 + (speed / 100) * 0.07);
    const pDashCd = DASH_COOLDOWN_BASE * (1 - (stamina / 100) * 0.3);
    const bTop = BASE_SPEED * (1 + 0.05 + 0.40 * 0.07);
    const bDashCd = DASH_COOLDOWN_BASE * (1 - 0.40 * 0.3);

    gameStateRef.current.player = createEntity(ARENA_LEFT + 40, ARENA_TOP + 40, pTop, pDashCd);
    gameStateRef.current.bot = createEntity(ARENA_RIGHT - 40, ARENA_BOTTOM - 40, bTop, bDashCd);
    gameStateRef.current.bot2 = createEntity(ARENA_RIGHT - 40, ARENA_TOP + 40, bTop, bDashCd);
    gameStateRef.current.bot3 = createEntity(ARENA_LEFT + 40, ARENA_BOTTOM - 40, bTop, bDashCd);

    // Random starting It among all 4
    const r = Math.random();
    if (r < 0.25) gameStateRef.current.player!.isIt = true;
    else if (r < 0.50) gameStateRef.current.bot!.isIt = true;
    else if (r < 0.75) gameStateRef.current.bot2!.isIt = true;
    else gameStateRef.current.bot3!.isIt = true;

    const now = performance.now();
    gameStateRef.current.matchStart = now;
    gameStateRef.current.hazardRadius = 0;
    gameStateRef.current.joystick = { active: false, originX: 0, originY: 0, curX: 0, curY: 0, touchId: null };
    gameStateRef.current.keys = { up: false, down: false, left: false, right: false };
    gameStateRef.current.dashTouchId = null;
  }, [speed, stamina, createEntity]);

  const canvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CANVAS_W / rect.width),
      y: (clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }, []);

  const getJoystickInput = useCallback(() => {
    const joystick = gameStateRef.current.joystick;
    if (!joystick.active) return { dx: 0, dy: 0, mag: 0 };
    const jdx = joystick.curX - joystick.originX;
    const jdy = joystick.curY - joystick.originY;
    const dist = Math.sqrt(jdx * jdx + jdy * jdy);
    if (dist < JOY_DEAD) return { dx: 0, dy: 0, mag: 0 };
    const clamped = Math.min(dist, JOY_MAX_R);
    return { dx: jdx / dist, dy: jdy / dist, mag: clamped / JOY_MAX_R };
  }, []);

  const getKeyboardInput = useCallback(() => {
    const { keys } = gameStateRef.current;
    let dx = 0, dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { dx: 0, dy: 0, mag: 0 };
    return { dx: dx / len, dy: dy / len, mag: 1 };
  }, []);

  const tryDash = useCallback((entity: Entity) => {
    const now = performance.now();
    if (entity.isDashing || now < entity.dashCooldown || entity.eliminated) return;
    entity.isDashing = true;
    entity.dashEndTime = now + DASH_DURATION;
    entity.invulnUntil = Math.max(entity.invulnUntil, now + DASH_INVULN_MS);
    entity.dashCooldown = now + entity.dashCdMs;
    entity.dashDirX = entity.facingX;
    entity.dashDirY = entity.facingY;
    const len = Math.sqrt(entity.dashDirX ** 2 + entity.dashDirY ** 2);
    if (len > 0) {
      entity.dashDirX /= len;
      entity.dashDirY /= len;
    } else {
      entity.dashDirY = -1;
    }
  }, []);

  const applyPos = useCallback((entity: Entity) => {
    let nx = entity.x + entity.vx;
    let ny = entity.y + entity.vy;

    // Wall collision
    for (const w of WALLS) {
      const ex = w.x - AXO_RADIUS;
      const ey = w.y - AXO_RADIUS;
      const ew = w.w + AXO_RADIUS * 2;
      const eh = w.h + AXO_RADIUS * 2;
      if (nx > ex && nx < ex + ew && ny > ey && ny < ey + eh) {
        const oL = nx - ex, oR = (ex + ew) - nx;
        const oT = ny - ey, oB = (ey + eh) - ny;
        const min = Math.min(oL, oR, oT, oB);
        if (min === oL) { nx = ex; entity.vx = 0; }
        else if (min === oR) { nx = ex + ew; entity.vx = 0; }
        else if (min === oT) { ny = ey; entity.vy = 0; }
        else { ny = ey + eh; entity.vy = 0; }
      }
    }

    // Arena bounds
    nx = Math.max(ARENA_LEFT + AXO_RADIUS, Math.min(ARENA_RIGHT - AXO_RADIUS, nx));
    ny = Math.max(ARENA_TOP + AXO_RADIUS, Math.min(ARENA_BOTTOM - AXO_RADIUS, ny));
    entity.x = nx;
    entity.y = ny;
  }, []);

  const updateMovement = useCallback((entity: Entity, dx: number, dy: number, mag: number, now: number) => {
    if (entity.eliminated) return;

    if (entity.isDashing) {
      if (now >= entity.dashEndTime) {
        entity.isDashing = false;
      } else {
        const dashSpd = DASH_DISTANCE / (DASH_DURATION / 16.67);
        entity.vx = entity.dashDirX * dashSpd;
        entity.vy = entity.dashDirY * dashSpd;
        applyPos(entity);
        return;
      }
    }

    let targetSpeed = entity.topSpeed * mag;

    // Kelp slowdown
    for (const k of KELP_ZONES) {
      const kd = Math.sqrt((entity.x - k.cx) ** 2 + (entity.y - k.cy) ** 2);
      if (kd < k.r) {
        targetSpeed *= KELP_SLOW_FACTOR;
        break;
      }
    }

    const tvx = dx * targetSpeed;
    const tvy = dy * targetSpeed;
    if (mag > 0) {
      entity.vx += (tvx - entity.vx) * ACCELERATION;
      entity.vy += (tvy - entity.vy) * ACCELERATION;
      entity.facingX = dx;
      entity.facingY = dy;
    } else {
      entity.vx *= (1 - DECELERATION);
      entity.vy *= (1 - DECELERATION);
      if (Math.abs(entity.vx) < 0.1) entity.vx = 0;
      if (Math.abs(entity.vy) < 0.1) entity.vy = 0;
    }
    applyPos(entity);
  }, [applyPos]);

  const checkTag = useCallback((now: number) => {
    const alive = getAlive();
    const tagger = alive.find(e => e.isIt);
    if (!tagger) return;
    if (now < tagger.invulnUntil) return;

    for (const target of alive) {
      if (target === tagger) continue;
      if (target.eliminated) continue;
      if (now < target.invulnUntil) continue;
      const dx = tagger.x - target.x;
      const dy = tagger.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > AXO_RADIUS * 2) continue;

      // Bite landed!
      target.bites++;
      const previousIt = tagger; // Store previous "it" for no tag backs
      tagger.isIt = false;
      target.isIt = true;
      target.invulnUntil = now + TAG_INVULN_MS;
      // No tag backs: previous "it" gets immunity
      previousIt.invulnUntil = now + TAG_INVULN_MS;
      // Bot cannot target the player who tagged them for 3 seconds
      target.lastTagger = tagger;
      target.cannotTargetTaggerUntil = now + 3000;

      // Check elimination
      if (target.bites >= MAX_BITES) {
        target.eliminated = true;
        target.isIt = false;
        // Pass "It" to a random alive non-eliminated player
        const remaining = getAlive();
        if (remaining.length > 1) {
          const candidates = remaining.filter(e => e !== target);
          const newIt = candidates[Math.floor(Math.random() * candidates.length)];
          newIt.isIt = true;
          newIt.invulnUntil = now + TAG_INVULN_MS;
        }
      }

      break; // Only one tag per frame
    }
  }, [getAlive]);

  const updateHazard = useCallback(() => {
    if (timeLeft > HAZARD_START_TIME) {
      gameStateRef.current.hazardRadius = 0;
      return;
    }
    gameStateRef.current.hazardRadius = 120 * ((HAZARD_START_TIME - timeLeft) / HAZARD_START_TIME);
    const alive = getAlive();
    for (const e of alive) pushFromHazard(e);
  }, [timeLeft, getAlive]);

  const pushFromHazard = useCallback((e: Entity) => {
    const cx = 180, cy = 320;
    const dx = e.x - cx, dy = e.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < gameStateRef.current.hazardRadius && dist > 0) {
      e.vx += (dx / dist) * 1.5;
      e.vy += (dy / dist) * 1.5;
    }
  }, []);

  const getBotSeparation = useCallback((b: Entity) => {
    const { bot, bot2, bot3 } = gameStateRef.current;
    const allBots = [bot, bot2, bot3].filter(e => e && !e.eliminated) as Entity[];
    let sepX = 0, sepY = 0;
    for (const ob of allBots) {
      if (ob === b) continue;
      const sd = Math.sqrt((b.x - ob.x) ** 2 + (b.y - ob.y) ** 2);
      if (sd < 70 && sd > 0) {
        const force = (70 - sd) / 70;
        sepX += ((b.x - ob.x) / sd) * force * 0.6;
        sepY += ((b.y - ob.y) / sd) * force * 0.6;
      }
    }
    return { sepX, sepY };
  }, []);

  const getHazardAvoidance = useCallback((b: Entity) => {
    if (gameStateRef.current.hazardRadius <= 0) return { hx: 0, hy: 0 };
    const hcx = 180, hcy = 320;
    const hdx = b.x - hcx, hdy = b.y - hcy;
    const hDist = Math.sqrt(hdx * hdx + hdy * hdy);
    const avoidRadius = gameStateRef.current.hazardRadius + 40;
    if (hDist < avoidRadius && hDist > 0) {
      const urgency = (avoidRadius - hDist) / avoidRadius;
      const strength = urgency * 2.0;
      return { hx: (hdx / hDist) * strength, hy: (hdy / hDist) * strength };
    }
    return { hx: 0, hy: 0 };
  }, []);

  const applyWallAvoidance = useCallback((b: Entity, dx: number, dy: number, target: Entity | null, now: number) => {
    if (now < b.wallAvoidUntil) {
      return { dx: b.wallAvoidDx, dy: b.wallAvoidDy };
    }

    const pad = AXO_RADIUS + 4;
    const fX = b.x + dx * 45;
    const fY = b.y + dy * 45;

    for (const w of WALLS) {
      const ex = w.x - pad, ey = w.y - pad;
      const ew = w.w + pad * 2, eh = w.h + pad * 2;

      if (fX > ex && fX < ex + ew && fY > ey && fY < ey + eh) {
        const corners = [
          { x: ex - 2, y: ey - 2 },
          { x: ex + ew + 2, y: ey - 2 },
          { x: ex - 2, y: ey + eh + 2 },
          { x: ex + ew + 2, y: ey + eh + 2 },
        ];

        let bestCorner = null;
        let bestScore = Infinity;

        for (const c of corners) {
          const botToC = Math.sqrt((b.x - c.x) ** 2 + (b.y - c.y) ** 2);
          let score;
          if (target) {
            const cToT = Math.sqrt((c.x - target.x) ** 2 + (c.y - target.y) ** 2);
            score = botToC * 0.4 + cToT;
          } else {
            const cFromCenter = Math.sqrt((c.x - 180) ** 2 + (c.y - 320) ** 2);
            score = botToC * 0.4 - cFromCenter;
          }
          if (score < bestScore) {
            bestScore = score;
            bestCorner = c;
          }
        }

        if (bestCorner) {
          const cdx = bestCorner.x - b.x;
          const cdy = bestCorner.y - b.y;
          const clen = Math.sqrt(cdx * cdx + cdy * cdy);
          if (clen > 0) {
            const avDx = cdx / clen;
            const avDy = cdy / clen;
            b.wallAvoidDx = avDx;
            b.wallAvoidDy = avDy;
            b.wallAvoidUntil = now + 350;
            return { dx: avDx, dy: avDy };
          }
        }

        return { dx: -dy, dy: dx };
      }
    }
    return { dx, dy };
  }, []);

  const norm = useCallback((dx: number, dy: number) => {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) return { dx: dx / len, dy: dy / len };
    return { dx: 0, dy: 0 };
  }, []);

  const updateBotAI = useCallback((b: Entity, now: number) => {
    if (b.eliminated) {
      b.dx = 0;
      b.dy = 0;
      b.inputMag = 0;
      return;
    }

    const alive = getAlive();

    if (b.isIt) {
      // CHASE MODE
      const others = alive.filter(e => e !== b);
      const needNewTarget = !b.lockTarget || now > b.lockUntil
        || !others.includes(b.lockTarget) || b.lockTarget.eliminated
        || (b.lastTagger === b.lockTarget && now < b.cannotTargetTaggerUntil);

      if (needNewTarget) {
        // Filter out the player who tagged this bot (if still in cooldown)
        const availableTargets = others.filter(e => {
          if (b.lastTagger === e && now < b.cannotTargetTaggerUntil) {
            return false; // Cannot target the player who tagged them yet
          }
          return true;
        });

        if (availableTargets.length === 0) {
          // If no targets available (all are restricted), allow targeting anyone
          // This prevents bots from getting stuck
          const minBites = Math.min(...others.map(e => e.bites));
          let bestTarget = null;
          let bestPriority = -Infinity;

          for (const e of others) {
            const d = Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2);
            const distPriority = 300 / (d + 30);
            const winnerBonus = (e.bites <= minBites) ? 2.5 : 0;
            const priority = distPriority + winnerBonus;
            if (priority > bestPriority) {
              bestPriority = priority;
              bestTarget = e;
            }
          }
          b.lockTarget = bestTarget;
          b.lockUntil = now + 2000 + Math.random() * 2000;
        } else {
          const minBites = Math.min(...availableTargets.map(e => e.bites));
          let bestTarget = null;
          let bestPriority = -Infinity;

          for (const e of availableTargets) {
            const d = Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2);
            const distPriority = 300 / (d + 30);
            const winnerBonus = (e.bites <= minBites) ? 2.5 : 0;
            const priority = distPriority + winnerBonus;
            if (priority > bestPriority) {
              bestPriority = priority;
              bestTarget = e;
            }
          }
          b.lockTarget = bestTarget;
          b.lockUntil = now + 2000 + Math.random() * 2000;
        }
      }

      const chaseTarget = b.lockTarget;
      if (!chaseTarget) {
        b.dx = 0;
        b.dy = 0;
        b.inputMag = 0;
        return;
      }

      const chaseDist = Math.sqrt((b.x - chaseTarget.x) ** 2 + (b.y - chaseTarget.y) ** 2);

      let n = norm(chaseTarget.x - b.x, chaseTarget.y - b.y);
      let dx = n.dx, dy = n.dy;

      const wa = applyWallAvoidance(b, dx, dy, chaseTarget, now);
      dx = wa.dx;
      dy = wa.dy;

      const { hx, hy } = getHazardAvoidance(b);
      dx += hx;
      dy += hy;

      const { sepX, sepY } = getBotSeparation(b);
      dx += sepX * 0.3;
      dy += sepY * 0.3;
      n = norm(dx, dy);
      dx = n.dx;
      dy = n.dy;

      b.dx = dx;
      b.dy = dy;
      b.inputMag = 1;

      if (chaseDist < 80 && now >= b.dashCooldown && Math.random() < 0.015) {
        tryDash(b);
      }
    } else {
      // FLEE MODE
      const itEntity = alive.find(e => e.isIt);
      if (!itEntity) {
        b.dx = 0;
        b.dy = 0;
        b.inputMag = 0;
        return;
      }

      const distToIt = Math.sqrt((b.x - itEntity.x) ** 2 + (b.y - itEntity.y) ** 2);

      if (now > b.fleeAngleNext) {
        b.fleeAngle = (Math.random() - 0.5) * 1.4;
        b.fleeAngleNext = now + 1500 + Math.random() * 2000;
      }

      let awayX = (b.x - itEntity.x) / Math.max(distToIt, 1);
      let awayY = (b.y - itEntity.y) / Math.max(distToIt, 1);

      const cosA = Math.cos(b.fleeAngle), sinA = Math.sin(b.fleeAngle);
      const rotX = awayX * cosA - awayY * sinA;
      const rotY = awayX * sinA + awayY * cosA;
      awayX = rotX;
      awayY = rotY;

      const centerX = (ARENA_LEFT + ARENA_RIGHT) / 2;
      const centerY = (ARENA_TOP + ARENA_BOTTOM) / 2;
      const tcX = centerX - b.x, tcY = centerY - b.y;
      const tcLen = Math.sqrt(tcX * tcX + tcY * tcY);
      const tcNx = tcLen > 0 ? tcX / tcLen : 0;
      const tcNy = tcLen > 0 ? tcY / tcLen : 0;

      const edgeFactor = Math.max(
        Math.max(0, 1 - (b.x - ARENA_LEFT) / 70),
        Math.max(0, 1 - (ARENA_RIGHT - b.x) / 70),
        Math.max(0, 1 - (b.y - ARENA_TOP) / 70),
        Math.max(0, 1 - (ARENA_BOTTOM - b.y) / 70),
      );
      const centerWeight = edgeFactor * 0.7;

      let dx = awayX * (1 - centerWeight) + tcNx * centerWeight;
      let dy = awayY * (1 - centerWeight) + tcNy * centerWeight;

      const { hx, hy } = getHazardAvoidance(b);
      dx += hx;
      dy += hy;

      const { sepX, sepY } = getBotSeparation(b);
      dx += sepX;
      dy += sepY;

      let n = norm(dx, dy);
      dx = n.dx;
      dy = n.dy;

      const wa = applyWallAvoidance(b, dx, dy, null, now);
      dx = wa.dx;
      dy = wa.dy;

      b.dx = dx;
      b.dy = dy;
      b.inputMag = 0.85 + Math.random() * 0.15;

      if (distToIt < 60 && now >= b.dashCooldown && Math.random() < 0.025) {
        tryDash(b);
      }
    }
  }, [getAlive, applyWallAvoidance, getHazardAvoidance, getBotSeparation, tryDash, norm]);

  const endGame = useCallback(() => {
    setIsPlaying(false);
    setGameEnded(true);
    
    const alive = getAlive();
    const player = gameStateRef.current.player;
    const playerAlive = player && !player.eliminated;
    
    // Determine winner - keep current logic: last standing OR least bites when timer ends
    let won = false;
    if (alive.length === 1) {
      // Last one standing
      won = alive[0] === player;
    } else if (alive.length >= 2 && timeLeft <= 0) {
      // Timer ran out - least bites wins
      const minBites = Math.min(...alive.map(e => e.bites));
      won = playerAlive && player && player.bites === minBites;
    }
    
    const score = won ? 90 - (player?.bites || 0) * 10 : 0;
    setFinalScore(score);
    setIsWinner(won);
    
    // Only calculate and show rewards if energy was available at start
    if (hadEnergyAtStart) {
      const rewards = calculateRewards('bite-tag', score);
      setFinalRewards({
        tier: rewards.tier,
        xp: won ? rewards.xp : 0,
        coins: rewards.coins,
        opals: rewards.opals,
      });
    } else {
      setFinalRewards({
        tier: 'normal',
        xp: 0,
        coins: 0,
        opals: undefined,
      });
    }
    setShowOverlay(true);
  }, [getAlive, timeLeft, hadEnergyAtStart]);

  const drawAxo = useCallback((ctx: CanvasRenderingContext2D, e: Entity, bodyCol: string, gillCol: string, now: number) => {
    // Eliminated — draw as faded ghost
    if (e.eliminated) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(e.x, e.y, AXO_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#555';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OUT', e.x, e.y + 4);
      ctx.globalAlpha = 1;
      return;
    }

    // Invuln blink
    if (now < e.invulnUntil && Math.floor(now / 80) % 2 === 0) return;

    // Glow
    if (e.isIt) {
      const g = ctx.createRadialGradient(e.x, e.y, AXO_RADIUS, e.x, e.y, AXO_RADIUS + 15);
      g.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, AXO_RADIUS + 15, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(e.x, e.y, AXO_RADIUS, e.x, e.y, AXO_RADIUS + 10);
      g.addColorStop(0, 'rgba(100, 200, 150, 0.3)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, AXO_RADIUS + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dash trail
    if (e.isDashing) {
      ctx.fillStyle = e.isIt ? 'rgba(255, 150, 100, 0.3)' : 'rgba(100, 200, 255, 0.3)';
      ctx.beginPath();
      ctx.arc(e.x - e.vx * 2, e.y - e.vy * 2, AXO_RADIUS * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body
    ctx.fillStyle = bodyCol;
    ctx.beginPath();
    ctx.arc(e.x, e.y, AXO_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Bite marks on body
    if (e.bites > 0) {
      ctx.fillStyle = '#0d1f2d';
      for (let i = 0; i < e.bites; i++) {
        const angle = (i * 2.1) - 0.5;
        const bx = e.x + Math.cos(angle) * (AXO_RADIUS - 3);
        const by = e.y + Math.sin(angle) * (AXO_RADIUS - 3);
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Eyes
    const ex = e.facingX * 3;
    const ey = e.facingY * 3;
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(e.x + ex - 4, e.y + ey - 4, 2.5, 0, Math.PI * 2);
    ctx.arc(e.x + ex + 4, e.y + ey - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Gills
    ctx.strokeStyle = gillCol;
    ctx.lineWidth = 1.5;
    const bx = -e.facingX;
    for (const off of [-6, -3, 3, 6]) {
      ctx.beginPath();
      ctx.moveTo(e.x + bx * (AXO_RADIUS - 2), e.y + off);
      ctx.lineTo(e.x + bx * (AXO_RADIUS + 6), e.y + off + (off > 0 ? 2 : -2));
      ctx.stroke();
    }

    // IT label
    if (e.isIt) {
      ctx.fillStyle = '#ef5350';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IT', e.x, e.y - AXO_RADIUS - 8);
    }

    // Bite counter below
    if (e.bites > 0) {
      ctx.fillStyle = '#ef5350';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🦷'.repeat(e.bites), e.x, e.y + AXO_RADIUS + 14);
    }
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    const { player, bot, bot2, bot3, hazardRadius, joystick } = gameStateRef.current;
    if (!player || !bot || !bot2 || !bot3) return;

    // Background
    ctx.fillStyle = '#0d1f2d';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Arena floor
    ctx.fillStyle = '#132d3f';
    ctx.fillRect(ARENA_LEFT, ARENA_TOP, ARENA_RIGHT - ARENA_LEFT, ARENA_BOTTOM - ARENA_TOP);

    // Arena border
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ARENA_LEFT, ARENA_TOP, ARENA_RIGHT - ARENA_LEFT, ARENA_BOTTOM - ARENA_TOP);

    // Kelp zones
    for (const k of KELP_ZONES) {
      const grad = ctx.createRadialGradient(k.cx, k.cy, 0, k.cx, k.cy, k.r);
      grad.addColorStop(0, 'rgba(76, 175, 80, 0.15)');
      grad.addColorStop(1, 'rgba(76, 175, 80, 0.02)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(k.cx, k.cy, k.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.3)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const sx = k.cx - k.r * 0.6 + i * k.r * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx, k.cy + k.r * 0.5);
        ctx.quadraticCurveTo(
          sx + Math.sin(now * 0.002 + i) * 5, k.cy,
          sx + Math.sin(now * 0.003 + i) * 3, k.cy - k.r * 0.5
        );
        ctx.stroke();
      }
    }

    // Hazard zone
    if (hazardRadius > 0) {
      const hg = ctx.createRadialGradient(180, 320, 0, 180, 320, hazardRadius);
      hg.addColorStop(0, 'rgba(239, 83, 80, 0.25)');
      hg.addColorStop(0.7, 'rgba(239, 83, 80, 0.10)');
      hg.addColorStop(1, 'rgba(239, 83, 80, 0.02)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(180, 320, hazardRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(239, 83, 80, ${0.3 + Math.sin(now * 0.005) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Coral walls
    for (const w of WALLS) {
      ctx.fillStyle = '#6b4a38';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(w.x, w.y, w.w, w.h, 4);
      } else {
        ctx.fillRect(w.x, w.y, w.w, w.h);
      }
      ctx.fill();
      ctx.fillStyle = '#7d5a48';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4, 3);
      } else {
        ctx.fillRect(w.x + 2, w.y + 2, w.w - 4, w.h - 4);
      }
      ctx.fill();
    }

    // Axolotls
    drawAxo(ctx, player, '#E8A0BF', '#D48BA8', now);
    drawAxo(ctx, bot, '#A0D2DB', '#80B8C8', now);
    drawAxo(ctx, bot2, '#A8D8A0', '#88B880', now);
    drawAxo(ctx, bot3, '#C8A0D8', '#B088C0', now);

    // HUD
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, CANVAS_W, ARENA_TOP);

    // Timer
    ctx.fillStyle = timeLeft < 30 ? '#ef5350' : 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    const mins = Math.floor(timeLeft / 60);
    const secs = Math.ceil(timeLeft % 60);
    ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}`, CANVAS_W / 2, 20);

    // Bite status row
    ctx.font = 'bold 11px sans-serif';
    const scoreY = 46;
    const gap = CANVAS_W / 4;
    ctx.textAlign = 'center';

    const entities = [
      { e: player, col: '#E8A0BF', label: 'You' },
      { e: bot, col: '#A0D2DB', label: 'B1' },
      { e: bot2, col: '#A8D8A0', label: 'B2' },
      { e: bot3, col: '#C8A0D8', label: 'B3' },
    ];

    entities.forEach(({ e, col, label }, i) => {
      ctx.fillStyle = e.eliminated ? '#555' : col;
      const hearts = e.eliminated ? 'OUT' : '♡'.repeat(MAX_BITES - e.bites);
      ctx.fillText(`${label}:${hearts}`, gap * (i + 0.5), scoreY);
    });

    // Joystick
    if (joystick.active && !player.eliminated) {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(joystick.originX, joystick.originY, JOY_MAX_R, 0, Math.PI * 2);
      ctx.stroke();

      let jdx = joystick.curX - joystick.originX;
      let jdy = joystick.curY - joystick.originY;
      const dist = Math.sqrt(jdx * jdx + jdy * jdy);
      if (dist > JOY_MAX_R) {
        jdx = (jdx / dist) * JOY_MAX_R;
        jdy = (jdy / dist) * JOY_MAX_R;
      }

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(joystick.originX + jdx, joystick.originY + jdy, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dash button
    if (!player.eliminated) {
      const ready = now >= player.dashCooldown;
      const pct = ready ? 1 : 1 - Math.max(0, (player.dashCooldown - now) / player.dashCdMs);

      ctx.fillStyle = ready ? 'rgba(79, 195, 247, 0.3)' : 'rgba(100, 100, 100, 0.2)';
      ctx.beginPath();
      ctx.arc(DASH_BTN_X, DASH_BTN_Y, DASH_BTN_R, 0, Math.PI * 2);
      ctx.fill();

      if (!ready) {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(DASH_BTN_X, DASH_BTN_Y, DASH_BTN_R, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(79, 195, 247, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(DASH_BTN_X, DASH_BTN_Y, DASH_BTN_R, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = ready ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('DASH', DASH_BTN_X, DASH_BTN_Y);
      ctx.textBaseline = 'alphabetic';
    }
  }, [timeLeft, drawAxo]);

  const gameLoop = useCallback(() => {
    if (!isPlaying || isPaused) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const now = performance.now();
    const state = gameStateRef.current;

    // Update timer
    const elapsed = (now - state.matchStart) / 1000;
    const remaining = Math.max(0, MATCH_DURATION - elapsed);
    setTimeLeft(remaining);
    if (remaining <= 0) {
      endGame();
      return;
    }

    // Check if only 1 alive
    const alive = getAlive();
    if (alive.length <= 1) {
      endGame();
      return;
    }

    // Player input (if alive)
    if (state.player && !state.player.eliminated) {
      const jIn = getJoystickInput();
      const kIn = getKeyboardInput();
      const input = jIn.mag > 0 ? jIn : kIn;
      updateMovement(state.player, input.dx, input.dy, input.mag, now);
    }

    // Bot AI
    if (state.bot && !state.bot.eliminated) {
      updateBotAI(state.bot, now);
      updateMovement(state.bot, state.bot.dx, state.bot.dy, state.bot.inputMag, now);
    }
    if (state.bot2 && !state.bot2.eliminated) {
      updateBotAI(state.bot2, now);
      updateMovement(state.bot2, state.bot2.dx, state.bot2.dy, state.bot2.inputMag, now);
    }
    if (state.bot3 && !state.bot3.eliminated) {
      updateBotAI(state.bot3, now);
      updateMovement(state.bot3, state.bot3.dx, state.bot3.dy, state.bot3.inputMag, now);
    }

    checkTag(now);
    updateHazard();

    // Draw everything
    draw(ctx, now);

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, isPaused, getAlive, getJoystickInput, getKeyboardInput, updateMovement, updateBotAI, checkTag, updateHazard, draw, endGame]);

  const startGame = useCallback(() => {
    setHadEnergyAtStart(energy > 0);
    reset();
    setShowOverlay(false);
    setGameEnded(false);
    setFinalRewards(null);
    setIsPlaying(true);
    setIsPaused(false);
  }, [reset, energy]);

  // Start game loop
  useEffect(() => {
    if (isPlaying && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isPaused, gameLoop]);

  // Handle input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!isPlaying || isPaused || !gameStateRef.current.player || gameStateRef.current.player.eliminated) return;
      
      for (const t of e.changedTouches) {
        const c = canvasCoords(t.clientX, t.clientY);
        const dd = Math.sqrt((c.x - DASH_BTN_X) ** 2 + (c.y - DASH_BTN_Y) ** 2);
        if (dd < DASH_BTN_R + 15) {
          gameStateRef.current.dashTouchId = t.identifier;
          tryDash(gameStateRef.current.player);
          continue;
        }
        if (c.x < CANVAS_W / 2 && !gameStateRef.current.joystick.active) {
          gameStateRef.current.joystick.active = true;
          gameStateRef.current.joystick.touchId = t.identifier;
          gameStateRef.current.joystick.originX = c.x;
          gameStateRef.current.joystick.originY = c.y;
          gameStateRef.current.joystick.curX = c.x;
          gameStateRef.current.joystick.curY = c.y;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === gameStateRef.current.joystick.touchId) {
          const c = canvasCoords(t.clientX, t.clientY);
          gameStateRef.current.joystick.curX = c.x;
          gameStateRef.current.joystick.curY = c.y;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === gameStateRef.current.joystick.touchId) {
          gameStateRef.current.joystick.active = false;
          gameStateRef.current.joystick.touchId = null;
        }
        if (t.identifier === gameStateRef.current.dashTouchId) {
          gameStateRef.current.dashTouchId = null;
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isPaused || !gameStateRef.current.player || gameStateRef.current.player.eliminated) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') gameStateRef.current.keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') gameStateRef.current.keys.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') gameStateRef.current.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') gameStateRef.current.keys.right = true;
      if (e.key === ' ') {
        e.preventDefault();
        tryDash(gameStateRef.current.player);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') gameStateRef.current.keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') gameStateRef.current.keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') gameStateRef.current.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') gameStateRef.current.keys.right = false;
    };

    const handleClick = (e: MouseEvent) => {
      if (!isPlaying || isPaused || !gameStateRef.current.player || gameStateRef.current.player.eliminated) return;
      const c = canvasCoords(e.clientX, e.clientY);
      const dd = Math.sqrt((c.x - DASH_BTN_X) ** 2 + (c.y - DASH_BTN_Y) ** 2);
      if (dd < DASH_BTN_R + 10) tryDash(gameStateRef.current.player);
    };

    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isPaused, canvasCoords, tryDash]);

  // Polyfill for roundRect
  useEffect(() => {
    if (typeof CanvasRenderingContext2D.prototype.roundRect === 'undefined') {
      CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, w: number, h: number, r: number) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
      };
    }
  }, []);

  // Initial draw when component mounts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        // Draw initial state
        ctx.fillStyle = '#0d1f2d';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#132d3f';
        ctx.fillRect(ARENA_LEFT, ARENA_TOP, ARENA_RIGHT - ARENA_LEFT, ARENA_BOTTOM - ARENA_TOP);
      }
    }
  }, []);

  return (
    <GameWrapper
      gameName="Bite Tag"
      score={gameStateRef.current.player ? 3 - gameStateRef.current.player.bites : 0}
      onEnd={onEnd}
      energy={energy}
      onPause={() => setIsPaused(!isPaused)}
      isPaused={isPaused}
    >
      <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-green-200 via-emerald-300 to-teal-400" style={{ margin: 0, padding: 0 }}>
        {/* Start/End Overlay */}
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-gradient-to-br from-green-900/80 via-emerald-900/80 to-teal-900/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-green-100 via-emerald-100 to-teal-100 rounded-3xl p-8 max-w-md w-full mx-4 border-4 border-green-300/80 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/30 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-xl -ml-12 -mb-12" />
              
              <div className="relative z-10">
                {!isPlaying && !gameEnded ? (
                  <>
                    <div className="text-center mb-6">
                      <motion.div
                        animate={{ 
                          scale: [1, 1.1, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-6xl mb-4"
                      >
                        🦷
                      </motion.div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4">
                        Bite Tag
                      </h2>
                      <div className="space-y-2 text-green-700 text-sm font-medium">
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">👹</span>
                          One player is "it" - tag others to pass it
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚠️</span>
                          3 bites = you're out!
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🎮</span>
                          Joystick to move, button to dash
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <span className="text-lg">🏆</span>
                          Last standing or least bites wins!
                        </p>
                      </div>
                    </div>
                    <motion.button
                      onClick={startGame}
                      className="w-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold py-4 rounded-xl text-lg shadow-lg relative overflow-hidden group"
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span>Start Game</span>
                        <span className="text-xl">🚀</span>
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.button>
                  </>
                ) : gameEnded && finalRewards ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">
                        {isWinner ? '🏆' : '😅'}
                      </div>
                      <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4">
                        {isWinner ? 'You Win!' : 'Game Over!'}
                      </h2>
                      <p className="text-green-800 text-center mb-2 text-xl font-bold">
                        Your bites: {gameStateRef.current.player?.bites || 0} / 3
                      </p>
                      <p className="text-green-600 text-center mb-4 text-sm font-medium">
                        {isWinner ? '🌟 Last one standing!' : '💪 Better luck next time!'}
                      </p>
                      
                      {/* Rewards display - only show if energy was used */}
                      {hadEnergyAtStart && finalRewards && (finalRewards.xp > 0 || finalRewards.coins > 0) ? (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-green-200">
                          <p className="text-green-700 font-bold text-lg mb-2">Rewards:</p>
                          <div className="flex flex-col gap-2 text-green-800">
                            {finalRewards.xp > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">⭐</span>
                                <span className="font-semibold">+{finalRewards.xp} XP</span>
                              </div>
                            )}
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl">💰</span>
                              <span className="font-semibold">+{finalRewards.coins} Coins</span>
                            </div>
                            {finalRewards.opals && (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🪬</span>
                                <span className="font-semibold">+{finalRewards.opals} Opals</span>
                              </div>
                            )}
                            <p className="text-xs text-green-600 mt-1">
                              Tier: {finalRewards.tier.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-4 border-2 border-green-200">
                          <p className="text-green-700 font-bold text-lg mb-2">No Energy!</p>
                          <p className="text-green-600 text-center text-sm">
                            Played for fun but no rewards earned.<br />
                            Energy regenerates over time.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <motion.button
                        onClick={() => {
                          setGameEnded(false);
                          setFinalRewards(null);
                          startGame();
                        }}
                        className="flex-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold py-3 rounded-xl shadow-lg relative overflow-hidden group"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <span className="relative z-10">Play Again</span>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        />
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          // Call onEnd with actual rewards when leaving (only if energy was used)
                          if (hadEnergyAtStart && finalRewards) {
                            onEnd({
                              score: finalScore,
                              tier: finalRewards.tier as 'normal' | 'good' | 'exceptional',
                              xp: finalRewards.xp,
                              coins: finalRewards.coins,
                              opals: finalRewards.opals,
                            });
                          } else {
                            // No rewards if no energy
                            onEnd({
                              score: finalScore,
                              tier: 'normal',
                              xp: 0,
                              coins: 0,
                            });
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-3 rounded-xl shadow-lg"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        Back to Games
                      </motion.button>
                    </div>
                  </>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ 
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: '100%',
            margin: 0,
            padding: 0,
          }}
        />
      </div>
    </GameWrapper>
  );
}
