import { audioEngine } from './AudioEngine';

interface PlayOptions {
  duration?: number;
  velocity?: number;
}

export function playNote(frequency: number, options: PlayOptions = {}): void {
  const { duration = 1.2, velocity = 0.8 } = options;
  const ctx = audioEngine.context;
  const now = ctx.currentTime;

  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);

  // ADSR
  const attack = 0.005;
  const decay = 0.3;
  const sustainLevel = 0.35 * velocity;
  const release = 0.8;

  envelope.gain.linearRampToValueAtTime(velocity, now + attack);
  envelope.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
  envelope.gain.setValueAtTime(sustainLevel, now + duration - release);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Lowpass filter to soften
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(4000, now);
  filter.frequency.exponentialRampToValueAtTime(1500, now + duration);
  filter.Q.value = 0.7;

  filter.connect(envelope);
  envelope.connect(audioEngine.output);

  const oscillators: OscillatorNode[] = [];

  // 1. Triangle at fundamental
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = frequency;
  const g1 = ctx.createGain();
  g1.gain.value = 0.6;
  osc1.connect(g1);
  g1.connect(filter);
  oscillators.push(osc1);

  // 2. Sine at fundamental + slight detune (chorus)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = frequency;
  osc2.detune.value = 3;
  const g2 = ctx.createGain();
  g2.gain.value = 0.3;
  osc2.connect(g2);
  g2.connect(filter);
  oscillators.push(osc2);

  // 3. 1st harmonic (octave above) - brightness
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = frequency * 2;
  const g3 = ctx.createGain();
  g3.gain.value = 0.12;
  osc3.connect(g3);
  g3.connect(filter);
  oscillators.push(osc3);

  // 4. 2nd harmonic - presence
  const osc4 = ctx.createOscillator();
  osc4.type = 'sine';
  osc4.frequency.value = frequency * 3;
  const g4 = ctx.createGain();
  g4.gain.value = 0.06;
  osc4.connect(g4);
  g4.connect(filter);
  oscillators.push(osc4);

  oscillators.forEach(o => {
    o.start(now);
    o.stop(now + duration + 0.1);
  });
}

export function playNoteSequence(
  frequencies: number[],
  interval: number = 0.8,
  startDelay: number = 0
): Promise<void> {
  const ctx = audioEngine.context;
  const startTime = ctx.currentTime + startDelay;
  const totalDuration = (frequencies.length - 1) * interval + 1.2;

  frequencies.forEach((freq, i) => {
    const noteStart = startTime + i * interval;
    setTimeout(() => {
      playNote(freq);
    }, (noteStart - ctx.currentTime) * 1000);
  });

  return new Promise(resolve => {
    setTimeout(resolve, (startDelay + totalDuration) * 1000);
  });
}
