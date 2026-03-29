import { audioEngine } from './AudioEngine';

interface PlayOptions {
  duration?: number;
  velocity?: number;
}

export function playNote(frequency: number, options: PlayOptions = {}): void {
  const { duration = 1.2, velocity = 0.8 } = options;
  const ctx = audioEngine.context;
  const now = ctx.currentTime;

  // ── Master envelope with two-stage piano decay ──
  const envelope = ctx.createGain();
  envelope.gain.setValueAtTime(0, now);

  const attack = 0.003;
  const decayFast = Math.min(0.12, duration * 0.15);
  const peakLevel = velocity;
  const sustainLevel = 0.25 * velocity;
  const release = Math.min(0.5, duration * 0.3);
  const sustainEnd = Math.max(now + attack + decayFast + 0.1, now + duration - release);

  // Fast attack → quick drop to half → slow fade to sustain
  envelope.gain.linearRampToValueAtTime(peakLevel, now + attack);
  envelope.gain.exponentialRampToValueAtTime(peakLevel * 0.5, now + attack + decayFast);
  envelope.gain.exponentialRampToValueAtTime(Math.max(sustainLevel, 0.01), sustainEnd);
  envelope.gain.exponentialRampToValueAtTime(0.001, sustainEnd + release);

  const totalDuration = sustainEnd - now + release;

  // ── Bright lowpass filter (piano is a bright instrument) ──
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(8000, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + totalDuration);
  filter.Q.value = 1.0;

  filter.connect(envelope);
  envelope.connect(audioEngine.output);

  const oscillators: OscillatorNode[] = [];

  // ── Harmonic partials (sine waves at integer multiples) ──
  const partials: [number, number, number][] = [
    // [freqMultiplier, gain, detuneCents]
    [1,   0.50, 0],      // fundamental
    [1,   0.20, 1.5],    // detuned fundamental (chorus/warmth)
    [2,   0.18, 0],      // 1st partial
    [3,   0.10, 0],      // 2nd partial
    [4,   0.05, 0],      // 3rd partial
    [5,   0.025, 0],     // 4th partial
  ];

  for (const [mult, gain, detune] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * mult;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(filter);
    oscillators.push(osc);
  }

  // ── Percussive hammer noise burst ──
  const noiseLength = 0.03;
  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * noiseLength, ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = Math.min(frequency * 4, 10000);
  noiseFilter.Q.value = 0.5;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.35 * velocity, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseLength);

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(envelope);

  // ── Start and stop ──
  oscillators.forEach(o => {
    o.start(now);
    o.stop(now + totalDuration + 0.05);
  });
  noiseSrc.start(now);
  noiseSrc.stop(now + noiseLength + 0.01);
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
