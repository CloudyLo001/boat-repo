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

function normalizedWaves(): Wave[] {
  return WAVES.map((wave) => {
    const len = Math.hypot(wave.dirX, wave.dirZ);
    return { ...wave, dirX: wave.dirX / len, dirZ: wave.dirZ / len };
  });
}

const NORMALIZED = normalizedWaves();

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

  constructor(size = 2800, segments = 260) {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

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

      const waveGlsl = NORMALIZED.map((wave) => {
        const k = (Math.PI * 2) / wave.wavelength;
        return `
          {
            vec2 dir = vec2(${wave.dirX.toFixed(5)}, ${wave.dirZ.toFixed(5)});
            float k = ${k.toFixed(6)};
            float a = ${wave.amplitude.toFixed(4)} * uIntensity;
            float phase = dot(dir, worldXZ) * k + uTime * ${wave.speed.toFixed(3)};
            waveHeight += a * sin(phase);
            float slope = a * k * cos(phase);
            waveGradient += dir * slope;
          }`;
      }).join('\n');

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTime;
           uniform float uIntensity;
           uniform vec2 uOffset;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           {
             // Wave phase is world-space, so sliding the plane along with the
             // boat does not drag the swell with it.
             vec2 worldXZ = transformed.xz + uOffset;
             float waveHeight = 0.0;
             vec2 waveGradient = vec2(0.0);
             ${waveGlsl}
             transformed.y += waveHeight;
             objectNormal = normalize(vec3(-waveGradient.x, 1.0, -waveGradient.y));
             vNormal = normalize(normalMatrix * objectNormal);
           }`,
        );
    };

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
  }

  /**
   * Recentre the ocean under the boat. The plane is finite, but the course now
   * runs kilometres out, so it follows the player instead of trying to cover
   * the whole world at usable wave resolution.
   */
  setCenter(x: number, z: number): void {
    this.mesh.position.set(x, 0, z);
    this.uniforms.uOffset.value.set(x, z);
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
