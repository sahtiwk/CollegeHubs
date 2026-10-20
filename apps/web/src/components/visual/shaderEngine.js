import { createShader } from 'shaders/js';
import { componentDefinition } from 'shaders/core/FlowingGradient';
// Original local composition; no preset/account, remote media or telemetry.
export async function mountShader(canvas, gpu, onError) {
  const instance = await createShader(canvas, { components: [{ id: 'campus-field', type: 'FlowingGradient', props: {
    colorA: '#111827', colorB: '#4930B5', colorC: '#145B63', colorD: '#111827', speed: .25, distortion: .3, seed: 7,
  } }] }, { components: [componentDefinition], gpu, colorSpace: 'srgb', disableTelemetry: true, observeElement: false, onError });
  instance.resize(480, 280);
  return instance;
}
