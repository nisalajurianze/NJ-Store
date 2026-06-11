import { cn } from '@njstore/utils/cn';
import { useEffect, useRef } from 'react';

interface MouseReactiveParticlesProps {
  particleCount?: number;
  interactionStrength?: number;
  targetFps?: number;
  className?: string;
}

type ThemeMode = 'dark' | 'light';

interface PaletteTone {
  hue: number;
  saturation: number;
  lightness: number;
  glowLightness: number;
}

interface Particle {
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  radius: number;
  depth: number;
  alpha: number;
  blur: number;
  orbitX: number;
  orbitY: number;
  orbitPhaseX: number;
  orbitPhaseY: number;
  speed: number;
  polarity: number;
  fieldBias: number;
  stretch: number;
  angle: number;
  toneIndex: number;
  lightnessShift: number;
}

interface PointerState {
  x: number;
  y: number;
  smoothX: number;
  smoothY: number;
  lastX: number;
  lastY: number;
  inside: boolean;
  lastMoveAt: number;
  boost: number;
  boostTarget: number;
}

interface RuntimeQuality {
  maxDpr: number;
  particleScale: number;
  shadowScale: number;
  activeTargetFps: number;
  idleTargetFps: number;
}

const TAU = Math.PI * 2;
const PARTICLE_LERP = 0.08;
const DARK_TONES: PaletteTone[] = [
  { hue: 194, saturation: 96, lightness: 68, glowLightness: 78 },
  { hue: 223, saturation: 98, lightness: 72, glowLightness: 82 },
  { hue: 44, saturation: 95, lightness: 68, glowLightness: 78 },
  { hue: 328, saturation: 82, lightness: 73, glowLightness: 82 }
];
const LIGHT_TONES: PaletteTone[] = [
  { hue: 204, saturation: 88, lightness: 54, glowLightness: 70 },
  { hue: 224, saturation: 88, lightness: 60, glowLightness: 74 },
  { hue: 40, saturation: 90, lightness: 54, glowLightness: 68 },
  { hue: 342, saturation: 74, lightness: 58, glowLightness: 72 }
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

const lerp = (current: number, target: number, factor: number): number => current + (target - current) * factor;

const lerpAngle = (current: number, target: number, factor: number): number => {
  let delta = target - current;

  while (delta > Math.PI) {
    delta -= TAU;
  }

  while (delta < -Math.PI) {
    delta += TAU;
  }

  return current + delta * factor;
};

const resolveThemeMode = (): ThemeMode => {
  if (typeof document === 'undefined') {
    return 'dark';
  }

  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
};

const isJsdomCanvasEnvironment = (): boolean =>
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

const resolveRuntimeQuality = (): RuntimeQuality => {
  if (typeof navigator === 'undefined') {
    return { maxDpr: 1.75, particleScale: 1, shadowScale: 0.96, activeTargetFps: 60, idleTargetFps: 30 };
  }

  const navigatorHints = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  const deviceMemory = typeof navigatorHints.deviceMemory === 'number' ? navigatorHints.deviceMemory : 8;
  const hardwareConcurrency =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;
  const prefersReducedData = Boolean(navigatorHints.connection?.saveData);
  const hasCoarsePointer =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  if (prefersReducedData || deviceMemory <= 2 || hardwareConcurrency <= 2) {
    return { maxDpr: 1, particleScale: 0.52, shadowScale: 0.72, activeTargetFps: 30, idleTargetFps: 30 };
  }

  if (deviceMemory <= 4 || hardwareConcurrency <= 4 || hasCoarsePointer) {
    return { maxDpr: 1.35, particleScale: 0.72, shadowScale: 0.84, activeTargetFps: 30, idleTargetFps: 30 };
  }

  return { maxDpr: 1.75, particleScale: 0.95, shadowScale: 0.96, activeTargetFps: 60, idleTargetFps: 30 };
};

const toHsla = (tone: PaletteTone, alpha: number, lightnessShift: number, glow = false): string => {
  const lightness = glow ? tone.glowLightness : tone.lightness;
  return `hsla(${tone.hue} ${tone.saturation}% ${clamp(lightness + lightnessShift, 26, 92)}% / ${clamp(alpha, 0, 1)})`;
};

const createParticle = (width: number, height: number): Particle => {
  const anchorX = randomBetween(-0.04, 1.04) * width;
  const anchorY = randomBetween(-0.04, 1.04) * height;
  const depth = randomBetween(0.6, 1.7);
  const radius = randomBetween(0.8, 1.7) * (0.74 + depth * 0.2);

  return {
    anchorX,
    anchorY,
    x: anchorX,
    y: anchorY,
    radius,
    depth,
    alpha: randomBetween(0.28, 0.78),
    blur: randomBetween(10, 20) * depth,
    orbitX: randomBetween(5, 18) * depth,
    orbitY: randomBetween(4, 16) * depth,
    orbitPhaseX: randomBetween(0, TAU),
    orbitPhaseY: randomBetween(0, TAU),
    speed: randomBetween(0.55, 1.45),
    polarity: Math.random() > 0.52 ? 1 : -1,
    fieldBias: randomBetween(-1, 1),
    stretch: randomBetween(1.15, 1.95),
    angle: randomBetween(0, TAU),
    toneIndex: Math.floor(Math.random() * DARK_TONES.length),
    lightnessShift: randomBetween(-8, 8)
  };
};

export const MouseReactiveParticles = ({
  particleCount = 108,
  interactionStrength = 1,
  targetFps,
  className
}: MouseReactiveParticlesProps): JSX.Element => {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;

    if (!root || !canvas) {
      return undefined;
    }

    if (isJsdomCanvasEnvironment()) {
      return undefined;
    }

    const host = root.parentElement instanceof HTMLElement ? root.parentElement : root;
    let context: CanvasRenderingContext2D | null = null;

    try {
      context = canvas.getContext('2d', { alpha: true, desynchronized: true } as CanvasRenderingContext2DSettings);
    } catch {
      context = null;
    }

    if (!context) {
      return undefined;
    }

    const particles: Particle[] = [];
    const dimensions = {
      width: 0,
      height: 0,
      dpr: 1
    };
    const pointer: PointerState = {
      x: 0,
      y: 0,
      smoothX: 0,
      smoothY: 0,
      lastX: 0,
      lastY: 0,
      inside: false,
      lastMoveAt: 0,
      boost: 0,
      boostTarget: 0
    };
    const visibility = {
      inView: true
    };
    const theme = {
      mode: resolveThemeMode()
    };
    const runtimeQuality = resolveRuntimeQuality();
    const totalParticles = clamp(Math.round(particleCount * runtimeQuality.particleScale), 24, 220);
    const forceScale = clamp(interactionStrength, 0.15, 2.4);
    let animationFrameId: number | null = null;
    let animationTimeoutId: number | null = null;
    let lastFrameTime = 0;

    const clearAnimationSchedule = (): void => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (animationTimeoutId !== null) {
        window.clearTimeout(animationTimeoutId);
        animationTimeoutId = null;
      }
    };

    const scheduleAnimationTick = (delay = 0): void => {
      if (animationFrameId !== null || animationTimeoutId !== null) {
        return;
      }

      if (delay > 0) {
        animationTimeoutId = window.setTimeout(() => {
          animationTimeoutId = null;
          animationFrameId = window.requestAnimationFrame(tick);
        }, delay);
        return;
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    const syncCanvasSize = () => {
      const rect = root.getBoundingClientRect();
      const width = Math.max(rect.width, 0);
      const height = Math.max(rect.height, 0);
      const dpr = clamp(window.devicePixelRatio || 1, 1, runtimeQuality.maxDpr);

      if (width === 0 || height === 0) {
        return;
      }

      if (dimensions.width === width && dimensions.height === height && dimensions.dpr === dpr) {
        return;
      }

      dimensions.width = width;
      dimensions.height = height;
      dimensions.dpr = dpr;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      particles.length = 0;

      for (let index = 0; index < totalParticles; index += 1) {
        particles.push(createParticle(width, height));
      }

      if (!pointer.inside) {
        const centerX = width / 2;
        const centerY = height / 2;

        pointer.x = centerX;
        pointer.y = centerY;
        pointer.smoothX = centerX;
        pointer.smoothY = centerY;
        pointer.lastX = centerX;
        pointer.lastY = centerY;
      }
    };

    const setPointerPosition = (clientX: number, clientY: number) => {
      const rect = root.getBoundingClientRect();
      const nextX = clamp(clientX - rect.left, 0, dimensions.width);
      const nextY = clamp(clientY - rect.top, 0, dimensions.height);
      const now = performance.now();

      if (!pointer.inside) {
        pointer.smoothX = nextX;
        pointer.smoothY = nextY;
      }

      if (pointer.lastMoveAt > 0) {
        const distance = Math.hypot(nextX - pointer.lastX, nextY - pointer.lastY);
        const delta = Math.max(now - pointer.lastMoveAt, 16);
        const velocity = distance / delta;

        pointer.boostTarget = clamp(velocity * 1.65, 0, 1.35);
      }

      pointer.inside = true;
      pointer.x = nextX;
      pointer.y = nextY;
      pointer.lastX = nextX;
      pointer.lastY = nextY;
      pointer.lastMoveAt = now;
    };

    let pointerFrameId: number | null = null;
    let pendingPointerPosition: { x: number; y: number } | null = null;

    const flushPointerPosition = () => {
      pointerFrameId = null;

      if (!pendingPointerPosition) {
        return;
      }

      const { x, y } = pendingPointerPosition;
      pendingPointerPosition = null;
      setPointerPosition(x, y);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        return;
      }

      pendingPointerPosition = { x: event.clientX, y: event.clientY };

      if (pointerFrameId === null) {
        pointerFrameId = window.requestAnimationFrame(flushPointerPosition);
      }
    };

    const handlePointerLeave = () => {
      if (pointerFrameId !== null) {
        window.cancelAnimationFrame(pointerFrameId);
        pointerFrameId = null;
      }

      pendingPointerPosition = null;
      pointer.inside = false;
      pointer.boostTarget = 0;
      pointer.lastMoveAt = 0;
    };

    const clearCanvas = () => {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
    };

    const drawFieldGlow = () => {
      if (!pointer.inside) {
        return;
      }

      const radius = 72 + pointer.boost * 94;
      const gradient = context.createRadialGradient(pointer.smoothX, pointer.smoothY, 0, pointer.smoothX, pointer.smoothY, radius);
      const innerColor = theme.mode === 'light' ? 'rgba(96, 165, 250, 0.09)' : 'rgba(125, 211, 252, 0.11)';
      const outerColor = theme.mode === 'light' ? 'rgba(250, 204, 21, 0.02)' : 'rgba(96, 165, 250, 0)';

      gradient.addColorStop(0, innerColor);
      gradient.addColorStop(0.6, outerColor);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

      context.save();
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(pointer.smoothX, pointer.smoothY, radius, 0, TAU);
      context.fill();
      context.restore();
    };

    const tick = (time: number) => {
      animationFrameId = null;

      if (dimensions.width === 0 || dimensions.height === 0) {
        scheduleAnimationTick(120);
        return;
      }

      const isPointerActive = pointer.inside || pointer.boost > 0.01 || pointer.boostTarget > 0.01;
      const frameTarget = clamp(
        targetFps ?? (isPointerActive ? runtimeQuality.activeTargetFps : runtimeQuality.idleTargetFps),
        1,
        60
      );
      const minimumFrameDuration = 1000 / frameTarget;

      if (lastFrameTime > 0 && time - lastFrameTime < minimumFrameDuration) {
        scheduleAnimationTick(minimumFrameDuration - (time - lastFrameTime));
        return;
      }

      const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 16.6667, 2) : 1;
      const motionTime = time * 0.001;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      const pointerTargetX = pointer.inside ? pointer.x : centerX;
      const pointerTargetY = pointer.inside ? pointer.y : centerY;
      const parallaxX = (pointer.smoothX - centerX) / Math.max(dimensions.width, 1);
      const parallaxY = (pointer.smoothY - centerY) / Math.max(dimensions.height, 1);
      const palette = theme.mode === 'light' ? LIGHT_TONES : DARK_TONES;

      lastFrameTime = time;

      if (!pointer.inside) {
        pointer.boostTarget = 0;
      } else if (time - pointer.lastMoveAt > 120) {
        pointer.boostTarget = 0;
      }

      pointer.smoothX = lerp(pointer.smoothX, pointerTargetX, 0.12 * delta);
      pointer.smoothY = lerp(pointer.smoothY, pointerTargetY, 0.12 * delta);
      pointer.boost = lerp(pointer.boost, pointer.boostTarget, 0.16 * delta);

      clearCanvas();
      drawFieldGlow();

      for (const particle of particles) {
        const idleX = Math.sin(motionTime * (1.1 + particle.speed * 0.65) + particle.orbitPhaseX) * particle.orbitX;
        const idleY = Math.cos(motionTime * (1.05 + particle.speed * 0.55) + particle.orbitPhaseY) * particle.orbitY;
        let targetX = particle.anchorX + idleX + parallaxX * 18 * particle.depth;
        let targetY = particle.anchorY + idleY + parallaxY * 12 * particle.depth;

        if (pointer.inside) {
          const deltaX = pointer.smoothX - particle.anchorX;
          const deltaY = pointer.smoothY - particle.anchorY;
          const distance = Math.hypot(deltaX, deltaY) || 1;
          const influenceRadius = 104 + particle.depth * 78 + pointer.boost * 58;

          if (distance < influenceRadius) {
            const falloff = 1 - distance / influenceRadius;
            const easedFalloff = falloff * falloff;
            const directionX = deltaX / distance;
            const directionY = deltaY / distance;
            const tangentialX = -directionY;
            const tangentialY = directionX;
            const wave = Math.sin(motionTime * (2 + particle.depth * 0.4) + distance * 0.05 + particle.fieldBias * Math.PI);
            const magneticForce = particle.polarity * forceScale * (12 + particle.depth * 9) * easedFalloff * (0.7 + pointer.boost * 0.95);
            const waveForce = wave * forceScale * 7.5 * easedFalloff * particle.depth;

            targetX += directionX * magneticForce + tangentialX * waveForce;
            targetY += directionY * magneticForce + tangentialY * waveForce;
          }
        }

        const previousX = particle.x;
        const previousY = particle.y;

        particle.x = lerp(particle.x, targetX, PARTICLE_LERP * delta);
        particle.y = lerp(particle.y, targetY, PARTICLE_LERP * delta);

        const velocityAngle = Math.atan2(particle.y - previousY, particle.x - previousX);
        const targetAngle = Number.isFinite(velocityAngle) ? velocityAngle : particle.angle;
        const stretchBoost = 1 + pointer.boost * 0.18;
        const glowAlpha = particle.alpha * (theme.mode === 'light' ? 0.18 : 0.24) * (1 + pointer.boost * 0.35);
        const coreAlpha = clamp(particle.alpha * (0.82 + particle.depth * 0.08 + pointer.boost * 0.14), 0.18, 0.95);
        const glowSizeX = particle.radius * particle.stretch * (2.9 + particle.depth * 0.45 + pointer.boost * 0.55);
        const glowSizeY = particle.radius * (2.2 + particle.depth * 0.35 + pointer.boost * 0.4);
        const tone = palette[particle.toneIndex % palette.length];

        particle.angle = lerpAngle(particle.angle, targetAngle, 0.18 * delta);

        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.angle);
        context.fillStyle = toHsla(tone, glowAlpha, particle.lightnessShift, true);
        context.shadowColor = toHsla(tone, glowAlpha * 1.1, particle.lightnessShift, true);
        context.shadowBlur = particle.blur * runtimeQuality.shadowScale * (1 + pointer.boost * 0.5);
        context.beginPath();
        context.ellipse(0, 0, glowSizeX, glowSizeY, 0, 0, TAU);
        context.fill();

        context.shadowBlur = 0;
        context.fillStyle = toHsla(tone, coreAlpha, particle.lightnessShift);
        context.beginPath();
        context.ellipse(0, 0, particle.radius * particle.stretch * stretchBoost, particle.radius * stretchBoost, 0, 0, TAU);
        context.fill();
        context.restore();
      }

      scheduleAnimationTick(minimumFrameDuration);
    };

    const syncAnimation = () => {
      const shouldRun = visibility.inView && !document.hidden;

      if (shouldRun && animationFrameId === null && animationTimeoutId === null) {
        lastFrameTime = 0;
        scheduleAnimationTick();
      }

      if (!shouldRun) {
        clearAnimationSchedule();
      }
    };

    let resizeFrameId: number | null = null;

    const scheduleSyncCanvasSize = () => {
      if (resizeFrameId !== null) {
        return;
      }

      resizeFrameId = window.requestAnimationFrame(() => {
        resizeFrameId = null;
        syncCanvasSize();
      });
    };

    syncCanvasSize();
    syncAnimation();

    host.addEventListener('pointermove', handlePointerMove, { passive: true });
    host.addEventListener('pointerenter', handlePointerMove, { passive: true });
    host.addEventListener('pointerleave', handlePointerLeave);
    document.addEventListener('visibilitychange', syncAnimation);
    window.addEventListener('resize', scheduleSyncCanvasSize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleSyncCanvasSize);
      resizeObserver.observe(root);
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visibility.inView = entry?.isIntersecting ?? true;
          syncAnimation();
        },
        { threshold: 0.08 }
      );
      intersectionObserver.observe(root);
    }

    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      themeObserver = new MutationObserver(() => {
        theme.mode = resolveThemeMode();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class']
      });
    }

    return () => {
      clearAnimationSchedule();

      if (pointerFrameId !== null) {
        window.cancelAnimationFrame(pointerFrameId);
      }

      if (resizeFrameId !== null) {
        window.cancelAnimationFrame(resizeFrameId);
      }

      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      host.removeEventListener('pointermove', handlePointerMove);
      host.removeEventListener('pointerenter', handlePointerMove);
      host.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', syncAnimation);
      window.removeEventListener('resize', scheduleSyncCanvasSize);
    };
  }, [interactionStrength, particleCount, targetFps]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ borderRadius: 'inherit' }}
    >
      <canvas ref={canvasRef} className="h-full w-full" style={{ borderRadius: 'inherit' }} />
    </div>
  );
};
