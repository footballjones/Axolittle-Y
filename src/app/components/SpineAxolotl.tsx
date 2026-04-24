import React, { useCallback, useEffect, useRef } from 'react';
import {
  CanvasTexture,
  TextureAtlas,
  AtlasAttachmentLoader,
  SkeletonJson,
  Skeleton,
  SkeletonData,
  AnimationState,
  AnimationStateData,
  SkeletonRenderer,
  Physics,
  Vector2,
} from '@esotericsoftware/spine-canvas';

// ── Constants ─────────────────────────────────────────────────────────────────
// Supersampling factor — physical canvas is SUPER× the CSS size so when the browser
// downscales canvas→display pixels the mesh-triangle seams blend below perceptual
// threshold.  We need to *exceed* device pixel ratio so we're always downscaling
// (upscaling a canvas makes seams worse).  Capped at 4× for memory budget.
const SUPER = Math.min(4, Math.ceil(((typeof window !== 'undefined' && window.devicePixelRatio) || 2) * 1.5));

// Skeleton aspect ratio measured from the Spine project: 631.55 × 339.72 ≈ 1.86 : 1
const ASPECT = 631.55 / 339.72;

// Extra canvas space beyond the skeleton's measured bounds (fraction of `size`).
// Horizontal: 35% wider on each side so the tail tip and far gills don't clip.
// Vertical:   20% taller on each side so gills (top) and feet (bottom) never
//             hit the canvas edge during the full Idle/Swim animation range.
const PAD_H = 0.35; // fraction of size added left + right (total 70% extra)
const PAD_V = 0.20; // fraction of size added top + bottom (total 40% extra)

// ── Asset cache — loaded once, shared across all instances ───────────────────
let cachedData: SkeletonData | null = null;
let loadPromise: Promise<SkeletonData> | null = null;

function loadAssets(): Promise<SkeletonData> {
  if (cachedData) return Promise.resolve(cachedData);
  if (loadPromise) return loadPromise;

  const base = import.meta.env.BASE_URL;

  loadPromise = (async () => {
    const [atlasText, jsonData] = await Promise.all([
      fetch(`${base}spine/axolotl/Axolotl.atlas`).then(r => r.text()),
      fetch(`${base}spine/axolotl/Axolotl.json`).then(r => r.json()),
    ]);

    // In Spine 4.2 the TextureAtlas constructor only parses the atlas text.
    // Textures must be loaded separately and assigned to each page.
    const atlas = new TextureAtlas(atlasText);
    await Promise.all(
      atlas.pages.map(
        page =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              page.setTexture(new CanvasTexture(img));
              resolve();
            };
            img.onerror = reject;
            img.src = `${base}spine/axolotl/${page.name}`;
          }),
      ),
    );

    const attachmentLoader = new AtlasAttachmentLoader(atlas);
    const skeletonJson = new SkeletonJson(attachmentLoader);
    cachedData = skeletonJson.readSkeletonData(jsonData);
    return cachedData;
  })();

  return loadPromise;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpineAnimation = 'Idle' | 'Swim';

interface SpineAxolotlProps {
  /** Height in px — canvas width is computed from the skeleton's aspect ratio. */
  size: number;
  animation: SpineAnimation;
  facingLeft: boolean;
  onClick?: React.MouseEventHandler<HTMLCanvasElement>;
  style?: React.CSSProperties;
}

// ── useSpineRenderer — game-loop-driven hook (no internal RAF) ────────────────
//
// Designed for use inside a canvas game loop where ONE requestAnimationFrame
// already drives everything. Exposes `update(delta, animation)` to step the
// Spine state and `drawOn(ctx, x, y, h, facingLeft, tilt)` to render the
// skeleton directly onto any canvas context — zero double-loop overhead.

export function useSpineRenderer() {
  const stateRef = useRef<{
    animState:  AnimationState;
    skeleton:   Skeleton;
    renderer:   SkeletonRenderer | null;
    unitScale:  number; // scale that makes skeleton exactly 1 px tall
    cx:         number; // visual-centre X in Spine coords
    cy:         number; // visual-centre Y in Spine coords
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAssets().then((data) => {
      if (cancelled) return;
      const skeleton      = new Skeleton(data);
      const animStateData = new AnimationStateData(data);
      animStateData.defaultMix = 0.25;
      const animState = new AnimationState(animStateData);
      animState.setAnimation(0, 'Idle', true);
      animState.update(0);
      animState.apply(skeleton);
      skeleton.updateWorldTransform(Physics.update);

      const offset     = new Vector2();
      const boundsSize = new Vector2();
      skeleton.getBounds(offset, boundsSize, []);

      stateRef.current = {
        animState, skeleton, renderer: null,
        unitScale: 1 / boundsSize.y,
        cx: offset.x + boundsSize.x / 2,
        cy: offset.y + boundsSize.y / 2,
      };
    }).catch(err => console.error('[useSpineRenderer] asset load failed:', err));

    return () => {
      cancelled = true;
      stateRef.current = null;
    };
  }, []);

  /** Call once per game-loop tick BEFORE drawOn. */
  const update = useCallback((delta: number, animation: SpineAnimation) => {
    const r = stateRef.current;
    if (!r) return;
    const cur = r.animState.getCurrent(0);
    if (cur?.animation?.name !== animation) {
      r.animState.setAnimation(0, animation, true);
    }
    r.animState.update(delta);
    r.animState.apply(r.skeleton);
    r.skeleton.updateWorldTransform(Physics.update);
  }, []);

  /** Render the skeleton centred on (x, y) in canvas-pixel space. */
  const drawOn = useCallback((
    ctx:          CanvasRenderingContext2D,
    x:            number,
    y:            number,
    targetHeight: number,
    facingLeft:   boolean,
    tilt:         number,
  ) => {
    const r = stateRef.current;
    if (!r) return;
    // Renderer is tied to one ctx — create it lazily on first draw call.
    if (!r.renderer) {
      r.renderer = new SkeletonRenderer(ctx);
      r.renderer.triangleRendering = true;
    }
    const scale = targetHeight * 0.9 * r.unitScale;
    const flip  = facingLeft ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(flip * scale, -scale);
    ctx.translate(-r.cx, -r.cy);
    r.renderer.draw(r.skeleton);
    ctx.restore();
  }, []);

  return { update, drawOn };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpineAxolotl({ size, animation, facingLeft, onClick, style }: SpineAxolotlProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Mutable refs so the render loop always reads the latest values without
  // needing to be re-created every time a prop changes.
  const animRef   = useRef(animation);
  const facingRef = useRef(facingLeft);
  animRef.current   = animation;
  facingRef.current = facingLeft;

  const rafRef = useRef<number>(0);

  // Internal render-state — set once assets load, stays stable across re-renders.
  const renderRef = useRef<{
    animState: AnimationState;
    skeleton:  Skeleton;
    renderer:  SkeletonRenderer;
    scale:     number;
    cx:        number; // visual-centre X in Spine coords
    cy:        number; // visual-centre Y in Spine coords
  } | null>(null);

  // ── Bootstrap Spine (once per size change, i.e. life-stage change) ──────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    loadAssets().then((data) => {
      if (cancelled || !canvas) return;

      const ctx = canvas.getContext('2d')!;

      // Build skeleton + animation state
      const skeleton      = new Skeleton(data);
      const animStateData = new AnimationStateData(data);
      animStateData.defaultMix = 0.25; // smooth crossfade between Idle ↔ Swim
      const animState = new AnimationState(animStateData);
      animState.setAnimation(0, animRef.current, true);

      // One dummy update to resolve initial bone positions so getBounds works.
      // Physics.update runs physics constraints; Physics.none skips them.
      animState.update(0);
      animState.apply(skeleton);
      skeleton.updateWorldTransform(Physics.update);

      // Compute skeleton bounds and derive scale / centre offset
      const offset     = new Vector2();
      const boundsSize = new Vector2();
      skeleton.getBounds(offset, boundsSize, []);

      // Scale so the skeleton's HEIGHT fills `size` pixels (with 10% breathing room).
      // Anchored to `size * SUPER`, NOT canvas.height — canvas is taller than `size`
      // due to vertical padding (PAD_V), so using canvas.height would over-scale.
      const scale = (size * SUPER * 0.9) / boundsSize.y;
      // Centre of the visual bounding box in Spine coords
      const cx = offset.x + boundsSize.x / 2;
      const cy = offset.y + boundsSize.y / 2;

      const renderer = new SkeletonRenderer(ctx);
      // All attachments in this skeleton are mesh type — triangle rendering is required.
      renderer.triangleRendering = true;

      renderRef.current = { animState, skeleton, renderer, scale, cx, cy };

      // ── Render loop ────────────────────────────────────────────────────────
      let last = performance.now();
      const loop = (now: number) => {
        const delta = Math.min((now - last) / 1000, 0.064); // cap at ~1 frame
        last = now;

        const r = renderRef.current!;

        r.animState.update(delta);
        r.animState.apply(r.skeleton);
        r.skeleton.updateWorldTransform(Physics.update);

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Smooth texture sampling inside each mesh triangle
        ctx.imageSmoothingEnabled = true;
        // @ts-ignore — imageSmoothingQuality is not in all TS lib defs but is supported in WebKit
        ctx.imageSmoothingQuality = 'high';

        // Canvas origin → canvas centre, then flip Y (Spine is Y-up, canvas is Y-down)
        ctx.translate(canvas.width / 2, canvas.height / 2);
        const flip = facingRef.current ? -1 : 1;
        ctx.scale(flip * r.scale, -r.scale);
        // Shift so the visual centre of the skeleton lands on the canvas centre
        ctx.translate(-r.cx, -r.cy);

        r.renderer.draw(r.skeleton);
        ctx.restore();

        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    }).catch(err => {
      console.error('[SpineAxolotl] Failed to load assets:', err);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      renderRef.current = null;
    };
  }, [size]); // re-init when life-stage changes (size steps up)

  // ── Switch animation without restarting the render loop ───────────────────
  useEffect(() => {
    const r = renderRef.current;
    if (!r) return;
    const current = r.animState.getCurrent(0);
    if (current?.animation?.name !== animation) {
      r.animState.setAnimation(0, animation, true);
    }
  }, [animation]);

  // Canvas CSS dimensions include padding on all sides so no part of the
  // Idle/Swim animation range clips against the canvas edge.
  const canvasW = Math.round(size * ASPECT * (1 + PAD_H * 2));
  const canvasH = Math.round(size * (1 + PAD_V * 2));

  return (
    <canvas
      ref={canvasRef}
      width={canvasW * SUPER}
      height={canvasH * SUPER}
      onClick={onClick}
      style={{
        display: 'block',
        width: canvasW,
        height: canvasH,
        imageRendering: 'auto', // tell WebKit to use bilinear filtering when scaling
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    />
  );
}
