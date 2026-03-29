import { NOTES, WHITE_NOTES, BLACK_NOTES_LIST, type NoteDefinition, getNoteByMidi } from './notes';
import { playNote } from '../audio/PianoSynth';
import './piano.css';

type KeyCallback = (note: NoteDefinition) => void;

// Black key offsets: position relative to the left edge of the preceding white key
const BLACK_KEY_OFFSETS: Record<string, number> = {
  'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5,
};

// Keyboard → MIDI mapping (standard virtual piano layout)
//  Octave 1 (C3-B3):  Z X C V B N M  /  S D _ G H J
//  Octave 2 (C4-B4):  Q W E R T Y U  /  2 3 _ 5 6 7
const KEY_TO_MIDI: Record<string, number> = {
  // Octave 1 white keys (bottom row)
  'z': 48, 'x': 50, 'c': 52, 'v': 53, 'b': 55, 'n': 57, 'm': 59,
  // Octave 1 black keys (home row)
  's': 49, 'd': 51, 'g': 54, 'h': 56, 'j': 58,
  // Octave 2 white keys (qwerty row)
  'q': 60, 'w': 62, 'e': 64, 'r': 65, 't': 67, 'y': 69, 'u': 71,
  // Octave 2 black keys (number row)
  '2': 61, '3': 63, '5': 66, '6': 68, '7': 70,
};

// Reverse: MIDI → keyboard label (uppercase for display)
const MIDI_TO_KEY_LABEL: Record<number, string> = {};
for (const [key, midi] of Object.entries(KEY_TO_MIDI)) {
  MIDI_TO_KEY_LABEL[midi] = key.toUpperCase();
}

export class Piano {
  private el: HTMLElement;
  private body: HTMLElement;
  private keysContainer: HTMLElement;
  private keyElements = new Map<number, HTMLElement>();
  private onKeyClick: KeyCallback | null = null;
  private mouseX = 0;
  private mouseY = 0;
  private smoothX = 0;
  private smoothY = 0;
  private enabled = true;
  private rafId = 0;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'piano-scene';

    this.body = document.createElement('div');
    this.body.className = 'piano-body';

    this.keysContainer = document.createElement('div');
    this.keysContainer.className = 'keys-container';

    this.buildWhiteKeys();
    this.buildBlackKeys();

    this.body.appendChild(this.keysContainer);
    this.el.appendChild(this.body);
    container.appendChild(this.el);

    this.startMouseTracking();
    this.startKeyboardListener();
  }

  private buildWhiteKeys() {
    WHITE_NOTES.forEach(note => {
      const key = document.createElement('div');
      key.className = 'piano-key';
      key.dataset.midi = String(note.midi);

      const top = document.createElement('div');
      top.className = 'key-top';

      const front = document.createElement('div');
      front.className = 'key-front';

      const label = document.createElement('div');
      label.className = 'key-label';
      label.textContent = note.name;

      const kbLabel = MIDI_TO_KEY_LABEL[note.midi];
      if (kbLabel) {
        const kb = document.createElement('div');
        kb.className = 'key-kb-label';
        kb.textContent = kbLabel;
        key.appendChild(kb);
      }

      key.appendChild(top);
      key.appendChild(front);
      key.appendChild(label);

      key.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleKeyPress(note);
      });

      this.keysContainer.appendChild(key);
      this.keyElements.set(note.midi, key);
    });
  }

  private buildBlackKeys() {
    const whiteKeyWidth = 53; // 52px + 1px margin

    BLACK_NOTES_LIST.forEach(note => {
      const key = document.createElement('div');
      key.className = 'piano-key-black';
      key.dataset.midi = String(note.midi);

      const baseName = note.name.replace(/\d/, '');
      const octaveOffset = (note.octave - 3) * 7;
      const posInOctave = BLACK_KEY_OFFSETS[baseName];
      const whiteIdx = octaveOffset + posInOctave;
      const leftPos = whiteIdx * whiteKeyWidth + whiteKeyWidth - 17;

      key.style.left = `${leftPos}px`;

      const top = document.createElement('div');
      top.className = 'key-top';

      const front = document.createElement('div');
      front.className = 'key-front';

      const gloss = document.createElement('div');
      gloss.className = 'key-gloss';

      const label = document.createElement('div');
      label.className = 'key-label';
      label.textContent = note.name;

      const kbLabel = MIDI_TO_KEY_LABEL[note.midi];
      if (kbLabel) {
        const kb = document.createElement('div');
        kb.className = 'key-kb-label';
        kb.textContent = kbLabel;
        key.appendChild(kb);
      }

      key.appendChild(top);
      key.appendChild(front);
      key.appendChild(gloss);
      key.appendChild(label);

      key.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleKeyPress(note);
      });

      this.keysContainer.appendChild(key);
      this.keyElements.set(note.midi, key);
    });
  }

  private handleKeyPress(note: NoteDefinition) {
    if (!this.enabled) return;
    this.animatePress(note.midi);
    playNote(note.frequency, { velocity: 0.7 });
    this.onKeyClick?.(note);
  }

  setOnKeyClick(cb: KeyCallback | null) {
    this.onKeyClick = cb;
  }

  animatePress(midi: number) {
    const el = this.keyElements.get(midi);
    if (!el) return;
    el.classList.add('pressed');
    setTimeout(() => el.classList.remove('pressed'), 200);
  }

  highlightKey(midi: number, cls: 'reference' | 'correct' | 'wrong') {
    const el = this.keyElements.get(midi);
    if (!el) return;
    el.classList.add(cls);
    if (cls === 'correct') {
      this.spawnParticles(el);
    }
  }

  clearHighlight(midi: number) {
    const el = this.keyElements.get(midi);
    if (!el) return;
    el.classList.remove('reference', 'correct', 'wrong');
  }

  clearAllHighlights() {
    NOTES.forEach(n => this.clearHighlight(n.midi));
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.body.classList.toggle('disabled', !enabled);
  }

  private spawnParticles(keyEl: HTMLElement) {
    const rect = keyEl.getBoundingClientRect();
    const bodyRect = this.el.getBoundingClientRect();
    const cx = rect.left - bodyRect.left + rect.width / 2;
    const cy = rect.top - bodyRect.top + rect.height * 0.3;
    const colors = ['#22c55e', '#4ade80', '#86efac', '#6366f1', '#fbbf24'];

    for (let i = 0; i < 10; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const dx = (Math.random() - 0.5) * 120;
      const dy = -Math.random() * 80 - 20;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      this.el.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  private heldKeys = new Set<string>();

  private startKeyboardListener() {
    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k in KEY_TO_MIDI && !this.heldKeys.has(k)) {
        this.heldKeys.add(k);
        const midi = KEY_TO_MIDI[k];
        const note = getNoteByMidi(midi);
        if (note) this.handleKeyPress(note);
      }
    });
    document.addEventListener('keyup', (e) => {
      this.heldKeys.delete(e.key.toLowerCase());
    });
  }

  private startMouseTracking() {
    document.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    const tick = () => {
      this.smoothX += (this.mouseX - this.smoothX) * 0.08;
      this.smoothY += (this.mouseY - this.smoothY) * 0.08;

      const rotY = this.smoothX * 8;
      const rotX = 25 + this.smoothY * 5;

      this.body.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy() {
    cancelAnimationFrame(this.rafId);
    this.el.remove();
  }
}
