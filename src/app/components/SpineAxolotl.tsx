import React, { useCallback, useEffect, useRef } from 'react';
import {
  TextureAtlas,
  AtlasAttachmentLoader,
  SkeletonJson,
  Skeleton,
  SkeletonData,
  AnimationState,
  AnimationStateData,
  Physics,
  Vector2,
  ManagedWebGLRenderingContext,
  GLTexture,
  SceneRenderer,
} from '@esotericsoftware/spine-webgl';

// Skeleton aspect ratio measured from the Spine project: 631.55 × 339.72 ≈ 1.86 : 1
const ASPECT = 631.55 / 339.72;

// Extra canvas space beyond the skeleton bounds so nothing clips.
const PAD_H = 0.35;
const PAD_V = 0.20;

// Internal supersampling multiplier on top of devicePixelRatio.
// The drawing buffer is SSAA × DPR times larger than the CSS canvas; the
// browser compositor downsamples it with bilinear filtering, which acts as
// a free anti-aliasing pass that removes the fuzzy edge artefacts that appear
// when a small CSS canvas rasterises fine Spine mesh edges at low resolution.
const SSAA = 2;

// ── Raw asset cache — loaded once, shared across all instances ───────────────
// GLTextures are per-WebGL-context and cannot be shared, but the raw source
// data (atlas text, JSON, decoded images) can be reused.
type RawAssets = {
  atlasText: string;
  jsonData:  unknown;
  images:    Map<string, HTMLImageElement>;
};
let rawAssets: RawAssets | null = null;
let rawLoadPromise: Promise<RawAssets> | null = null;

function loadRawAssets(): Promise<RawAssets> {
  if (rawAssets) return Promise.resolve(rawAssets);
  if (rawLoadPromise) return rawLoadPromise;

  const base = import.meta.env.BASE_URL;

  rawLoadPromise = (async () => {
    const [atlasText, jsonData] = await Promise.all([
      fetch(`${base}spine/axolotl/Axolotl.atlas`).then(r => r.text()),
      fetch(`${base}spine/axolotl/Axolotl.json`).then(r => r.json()),
    ]);

    // Parse atlas text once to discover page filenames, then load images.
    const probe = new TextureAtlas(atlasText);
    const images = new Map<string, HTMLImageElement>();
    await Promise.all(
      probe.pages.map(
        page =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload  = () => { images.set(page.name, img); resolve(); };
            img.onerror = reject;
            img.src = `${base}spine/axolotl/${page.name}`;
          }),
      ),
    );

    rawAssets = { atlasText, jsonData, images };
    return rawAssets;
  })();

  return rawLoadPromise;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SpineAnimation = 'Idle' | 'Swim';

interface SpineAxolotlProps {
  /** Height in px — width is derived from the skeleton's aspect ratio. */
  size: number;
  animation: SpineAnimation;
  facingLeft: boolean;
  onClick?: React.MouseEventHandler<HTMLCanvasElement>;
  style?: React.CSSProperties;
}

// ── Per-context state ─────────────────────────────────────────────────────────

type GlState = {
  context:      ManagedWebGLRenderingContext;
  sceneRenderer: SceneRenderer;
  skeleton:     Skeleton;
  animState:    AnimationState;
  unitScale:    number; // scale factor that makes the skeleton exactly 1 px tall
  cx:           number; // visual-centre X in Spine's local coordinate space
  cy:           number; // visual-centre Y in Spine's local coordinate space
};

// ── useSpineRenderer — game-loop-driven hook (no internal RAF) ────────────────
//
// Owns its own transparent WebGL overlay canvas, exposed via `canvasRef`.
// update(delta, animation, tilt?) steps the skeleton for one tick.
// render(x, y, h, facingLeft, logicalW, logicalH) draws the current frame.
// Callers work in logical game coords: top-left origin, y increasing downward.

export function useSpineRenderer() {
  const stateRef   = useRef<GlState | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);

  const buildGlState = useCallback((el: HTMLCanvasElement, raw: RawAssets) => {
    const context = new ManagedWebGLRenderingContext(el, {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    });

    // Build a fresh TextureAtlas for this context and assign GL textures.
    const atlas = new TextureAtlas(raw.atlasText);
    for (const page of atlas.pages) {
      const img = raw.images.get(page.name);
      if (img) page.setTexture(new GLTexture(context, img));
    }

    const attachmentLoader = new AtlasAttachmentLoader(atlas);
    const skeletonJson     = new SkeletonJson(attachmentLoader);
    const skeletonData: SkeletonData = skeletonJson.readSkeletonData(raw.jsonData as object);

    const skeleton      = new Skeleton(skeletonData);
    const animStateData = new AnimationStateData(skeletonData);
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
      context,
      sceneRenderer: new SceneRenderer(el, context),
      skeleton,
      animState,
      unitScale: 1 / boundsSize.y,
      cx: offset.x + boundsSize.x / 2,
      cy: offset.y + boundsSize.y / 2,
    };
  }, []);

  // Callback ref — fires when the canvas element mounts or unmounts.
  const canvasRef = useCallback((el: HTMLCanvasElement | null) => {
    canvasElRef.current = el;

    if (stateRef.current) {
      stateRef.current.sceneRenderer.dispose();
      stateRef.current.context.dispose();
      stateRef.current = null;
    }

    if (!el) return;

    loadRawAssets()
      .then(raw => {
        if (canvasElRef.current !== el) return; // canvas was replaced while loading
        buildGlState(el, raw);
      })
      .catch(err => console.error('[useSpineRenderer] asset load failed:', err));
  }, [buildGlState]);

  /** Step the skeleton by `delta` seconds. */
  const update = useCallback((delta: number, animation: SpineAnimation) => {
    const s = stateRef.current;
    if (!s) return;
    const cur = s.animState.getCurrent(0);
    if (cur?.animation?.name !== animation) {
      s.animState.setAnimation(0, animation, true);
    }
    s.animState.update(delta);
    s.animState.apply(s.skeleton);
    s.skeleton.updateWorldTransform(Physics.update);
  }, []);

  /**
   * Draw one frame centred on (x, y) in logical game coords.
   * logicalW × logicalH define the coordinate space; the canvas buffer is
   * resized to match on the first call (or if dimensions change).
   */
  const render = useCallback((
    x:        number,
    y:        number,
    h:        number,
    facingLeft: boolean,
    logicalW: number,
    logicalH: number,
    tilt = 0,
  ) => {
    const s      = stateRef.current;
    const canvas = canvasElRef.current;
    if (!s || !canvas) return;

    // Drawing buffer is SSAA × DPR times the logical size.
    // CSS display size is controlled by the caller's style — we only touch
    // the pixel buffer here so the compositor can downsample for free AA.
    const ss   = SSAA * (window.devicePixelRatio || 1);
    const bufW = Math.round(logicalW * ss);
    const bufH = Math.round(logicalH * ss);
    if (canvas.width !== bufW || canvas.height !== bufH) {
      canvas.width  = bufW;
      canvas.height = bufH;
    }

    const { context, sceneRenderer, skeleton } = s;
    const { gl } = context;

    // Camera: centre at the buffer midpoint in WebGL's y-up world space.
    sceneRenderer.camera.position.set(bufW / 2, bufH / 2, 0);
    sceneRenderer.camera.setViewport(bufW, bufH);
    sceneRenderer.camera.update();
    gl.viewport(0, 0, bufW, bufH);

    // Map game coord (x, y) → WebGL world (wx, wy), scaled to buffer space.
    // Game uses y-down; WebGL / Spine use y-up.
    const scale = h * ss * s.unitScale;
    const flip  = facingLeft ? -1 : 1;
    const wx    = x * ss;
    const wy    = (logicalH - y) * ss;

    // Offset skeleton so its visual centre lands at (wx, wy).
    skeleton.scaleX = flip * scale;
    skeleton.scaleY = scale;
    skeleton.x = wx - s.cx * flip * scale;
    skeleton.y = wy - s.cy * scale;

    // Tilt: save the root bone's current rotation, add the visual-only tilt,
    // draw, then restore. animState.apply() only writes bones that have
    // keyframes — if root rotation is unkeyed in the animation it is never
    // reset, so without the save/restore the tilt accumulates across frames
    // and spins the axolotl into a full rotation.
    const root = skeleton.getRootBone();
    const savedRootRotation = root ? root.rotation : 0;
    if (tilt !== 0 && root) root.rotation += tilt * (180 / Math.PI);

    skeleton.updateWorldTransform(Physics.none);

    // Clear to transparent and render.
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    sceneRenderer.begin();
    // Textures are uploaded as straight (non-premultiplied) alpha by default.
    // Passing false uses SRC_ALPHA blending so zero-alpha edge texels
    // contribute nothing — prevents the white fringe and fixes additive slots.
    sceneRenderer.drawSkeleton(skeleton, false);
    sceneRenderer.end();

    // Restore root rotation and reset skeleton transform so the next
    // update()'s Physics.update sees the skeleton at its natural rest state.
    if (root) root.rotation = savedRootRotation;
    skeleton.x = 0;
    skeleton.y = 0;
    skeleton.scaleX = 1;
    skeleton.scaleY = 1;
  }, []);

  // Dispose GL resources when the hook owner unmounts.
  useEffect(() => {
    return () => {
      if (stateRef.current) {
        stateRef.current.sceneRenderer.dispose();
        stateRef.current.context.dispose();
        stateRef.current = null;
      }
    };
  }, []);

  return { canvasRef, update, render };
}

// ── SpineAxolotl component — standalone with its own RAF loop ─────────────────

export function SpineAxolotl({ size, animation, facingLeft, onClick, style }: SpineAxolotlProps) {
  const { canvasRef, update, render } = useSpineRenderer();

  // Mutable refs so the RAF loop always sees the latest props without being
  // recreated on every prop change.
  const animRef   = useRef(animation);
  const facingRef = useRef(facingLeft);
  animRef.current   = animation;
  facingRef.current = facingLeft;

  const rafRef  = useRef(0);
  const lastRef = useRef(0);

  const canvasW = Math.round(size * ASPECT * (1 + PAD_H * 2));
  const canvasH = Math.round(size * (1 + PAD_V * 2));

  // Stable refs for canvas dimensions so the loop closure doesn't need to
  // capture the values at creation time.
  const cwRef = useRef(canvasW);
  const chRef = useRef(canvasH);
  const szRef = useRef(size);
  cwRef.current = canvasW;
  chRef.current = canvasH;
  szRef.current = size;

  useEffect(() => {
    let active = true;
    const loop = (now: number) => {
      if (!active) return;
      const delta = Math.min((now - (lastRef.current || now)) / 1000, 0.064);
      lastRef.current = now;
      update(delta, animRef.current);
      render(cwRef.current / 2, chRef.current / 2, szRef.current, facingRef.current, cwRef.current, chRef.current);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [update, render]);

  // Set the buffer to its final SSAA size immediately so the first render()
  // call never needs to resize — a resize clears the canvas and triggers a
  // layout reflow that causes a visible flicker in the aquarium.
  const dpr  = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const bufW = Math.round(canvasW * SSAA * dpr);
  const bufH = Math.round(canvasH * SSAA * dpr);

  return (
    <canvas
      ref={canvasRef}
      width={bufW}
      height={bufH}
      onClick={onClick}
      style={{
        display: 'block',
        width: canvasW,
        height: canvasH,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    />
  );
}
