import React, { useEffect, useRef } from 'react';
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

      // Scale so the skeleton's HEIGHT fills `size` pixels (with 10% breathing room)
      const scale = (canvas.height * 0.9) / boundsSize.y;
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

  // Skeleton aspect ratio: 631.55 × 339.72 ≈ 1.86 : 1
  const ASPECT = 631.55 / 339.72;
  const canvasW = Math.round(size * ASPECT);
  const canvasH = size;

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
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
