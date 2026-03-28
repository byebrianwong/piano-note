export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  get context(): AudioContext {
    if (!this.ctx) this.init();
    return this.ctx!;
  }

  get output(): AudioNode {
    if (!this.masterGain) this.init();
    return this.masterGain!;
  }

  private init() {
    this.ctx = new AudioContext();
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.compressor.connect(this.ctx.destination);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.compressor);
  }

  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  get currentTime(): number {
    return this.context.currentTime;
  }
}

export const audioEngine = new AudioEngine();
