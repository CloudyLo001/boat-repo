import * as THREE from 'three';

interface Wave {
  dirX: number;
  dirZ: number;
  amplitude: number;
  wavelength: number;
  speed: number;
}

// Same wave sum runs on GPU (vertex displacement) and CPU (buoyancy sampling),
// so boats sit exactly on the rendered surface.
const WAVES: Wave[] = [
  { dirX: 1, dirZ: 0.35, amplitude: 0.22, wavelength: 23, speed: 1.4 },
  { dirX: -0.6, dirZ: 1, amplitude: 0.16, wavelength: 15, speed: 1.9 },
  { dirX: 0.4, dirZ: -1, amplitude: 0.1, wavelength: 8.5, speed: 2.6 },
  { dirX: 1, dirZ: 1, amplitude: 0.34, wavelength: 61, speed: 0.9 },
];

// Shading-only ripples. Their wavelengths are far below the vertex spacing, so
// they exist purely in the fragment normal — they never move the surface and
// never desync the CPU buoyancy sampler from what is drawn.
const DETAIL: Wave[] = [
  { dirX: 0.8, dirZ: 0.6, amplitude: 0.035, wavelength: 5.1, speed: 3.4 },
  { dirX: -0.35, dirZ: 0.94, amplitude: 0.022, wavelength: 3.2, speed: 4.1 },
  { dirX: 0.95, dirZ: -0.3, amplitude: 0.013, wavelength: 1.7, speed: 5.2 },
];

function normalized(waves: Wave[]): Wave[] {
  return waves.map((wave) => {
    const len = Math.hypot(wave.dirX, wave.dirZ);
    return { ...wave, dirX: wave.dirX / len, dirZ: wave.dirZ / len };
  });
}

const NORMALIZED = normalized(WAVES);
const NORMALIZED_DETAIL = normalized(DETAIL);

/** GLSL that accumulates height and surface gradient for a set of waves. */
function waveGlsl(waves: Wave[]): string {
  return waves
    .map((wave) => {
      const k = (Math.PI * 2) / wave.wavelength;
      return `
        {
          vec2 dir = vec2(${wave.dirX.toFixed(5)}, ${wave.dirZ.toFixed(5)});
          float k = ${k.toFixed(6)};
          float a = ${wave.amplitude.toFixed(4)} * intensity;
          float phase = dot(dir, p) * k + t * ${wave.speed.toFixed(3)};
          height += a * sin(phase);
          grad += dir * (a * k * cos(phase));
        }`;
    })
    .join('\n');
}

const WAVE_FUNCTIONS = `
  void sampleSwell(vec2 p, float t, float intensity, out float height, out vec2 grad) {
    height = 0.0;
    grad = vec2(0.0);
    ${waveGlsl(NORMALIZED)}
  }

  void sampleDetail(vec2 p, float t, float intensity, out float height, out vec2 grad) {
    height = 0.0;
    grad = vec2(0.0);
    ${waveGlsl(NORMALIZED_DETAIL)}
  }`;

export class Water {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    /** World offset of the plane, so waves stay locked to the world as it follows the boat. */
    uOffset: { value: new THREE.Vector2(0, 0) },
  };
  private intensity = 1;
  /** World-space spacing between vertices; the plane only ever moves in whole steps. */
  private readonly gridStep: number;

  constructor(size = 2800, segments = 260) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    this.gridStep = size / segments;

    this.material = new THREE.MeshStandardMaterial({
      color: '#1c4a66',
      roughness: 0.32,
      metalness: 0.04,
      flatShading: false,
    });

    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      shader.uniforms.uIntensity = this.uniforms.uIntensity;
      shader.uniforms.uOffset = this.uniforms.uOffset;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform float uIntensity;
           uniform vec2 uOffset;
           varying vec2 vWaveXZ;
           ${WAVE_FUNCTIONS}`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           {
             // Wave phase is world-space, so sliding the plane along with the
             // boat does not drag the swell with it.
             vec2 worldXZ = transformed.xz + uOffset;
             float waveHeight;
             vec2 waveGradient;
             sampleSwell(worldXZ, uTime, uIntensity, waveHeight, waveGradient);
             transformed.y += waveHeight;
             vWaveXZ = worldXZ;
             objectNormal = normalize(vec3(-waveGradient.x, 1.0, -waveGradient.y));
             vNormal = normalize(normalMatrix * objectNormal);
           }`,
        );

      // Vertices sit ~11 m apart, far coarser than the swell they carry, so
      // interpolated vertex normals facet and crawl as the plane scrolls.
      // Re-deriving the gradient per pixel makes the shading smooth and adds
      // ripple detail the geometry could never resolve.
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform float uIntensity;
           varying vec2 vWaveXZ;
           ${WAVE_FUNCTIONS}`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
           {
             float swellHeight;
             vec2 swellGrad;
             sampleSwell(vWaveXZ, uTime, uIntensity, swellHeight, swellGrad);
             float detailHeight;
             vec2 detailGrad;
             sampleDetail(vWaveXZ, uTime, uIntensity, detailHeight, detailGrad);

             // Fine slopes alias into sparkle noise once a pixel spans several
             // ripples, so fade them out with distance instead.
             float viewDist = length(vViewPosition);
             float detailFade = 1.0 - smoothstep(40.0, 260.0, viewDist);
             float swellFade = mix(1.0, 0.35, smoothstep(220.0, 1100.0, viewDist));

             vec2 grad = swellGrad * swellFade + detailGrad * detailFade;
             // The plane's world matrix is a pure translation, so the surface
             // normal is already world-space; viewMatrix takes it to view space.
             vec3 worldNormal = normalize(vec3(-grad.x, 1.0, -grad.y));
             normal = normalize(mat3(viewMatrix) * worldNormal);
             nonPerturbedNormal = normal;
           }`,
        );
    };

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
  }

  /**
   * Recentre the ocean under the boat. The plane is finite, but the course now
   * runs kilometres out, so it follows the player instead of trying to cover
   * the whole world at usable wave resolution. Movement is quantised to the
   * vertex grid: every vertex then stays pinned to the same world position, so
   * the coarse tessellation no longer swims through the swell as the boat runs.
   */
  setCenter(x: number, z: number): void {
    const snappedX = Math.round(x / this.gridStep) * this.gridStep;
    const snappedZ = Math.round(z / this.gridStep) * this.gridStep;
    this.mesh.position.set(snappedX, 0, snappedZ);
    this.uniforms.uOffset.value.set(snappedX, snappedZ);
  }

  setIntensity(value: number): void {
    this.intensity = value;
    this.uniforms.uIntensity.value = value;
  }

  update(time: number): void {
    this.uniforms.uTime.value = time;
  }

  /** Highest crest the current settings can produce. */
  maxAmplitude(): number {
    return NORMALIZED.reduce((sum, wave) => sum + wave.amplitude, 0) * this.intensity;
  }

  /** CPU mirror of the GPU wave sum, used for buoyancy. */
  heightAt(x: number, z: number, time: number): number {
    let height = 0;
    for (const wave of NORMALIZED) {
      const k = (Math.PI * 2) / wave.wavelength;
      const phase = (wave.dirX * x + wave.dirZ * z) * k + time * wave.speed;
      height += wave.amplitude * this.intensity * Math.sin(phase);
    }
    return height;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
