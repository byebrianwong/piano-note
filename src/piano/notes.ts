export interface NoteDefinition {
  name: string;
  midi: number;
  frequency: number;
  isBlack: boolean;
  octave: number;
  whiteIndex: number;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_NOTES = new Set([1, 3, 6, 8, 10]); // semitone indices that are black keys

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function buildNoteRange(startMidi: number, endMidi: number): NoteDefinition[] {
  const notes: NoteDefinition[] = [];
  let whiteIdx = 0;
  for (let midi = startMidi; midi <= endMidi; midi++) {
    const semitone = midi % 12;
    const octave = Math.floor(midi / 12) - 1;
    const isBlack = BLACK_NOTES.has(semitone);
    notes.push({
      name: `${NOTE_NAMES[semitone]}${octave}`,
      midi,
      frequency: midiToFrequency(midi),
      isBlack,
      octave,
      whiteIndex: isBlack ? -1 : whiteIdx,
    });
    if (!isBlack) whiteIdx++;
  }
  return notes;
}

// C3 (midi 48) to B4 (midi 71) = 2 octaves
export const NOTES = buildNoteRange(48, 71);
export const WHITE_NOTES = NOTES.filter(n => !n.isBlack);
export const BLACK_NOTES_LIST = NOTES.filter(n => n.isBlack);

export function getNoteByName(name: string): NoteDefinition | undefined {
  return NOTES.find(n => n.name === name);
}

export function getNoteByMidi(midi: number): NoteDefinition | undefined {
  return NOTES.find(n => n.midi === midi);
}

export function getRandomNote(): NoteDefinition {
  return NOTES[Math.floor(Math.random() * NOTES.length)];
}

export function getRandomNoteDifferentFrom(exclude: NoteDefinition): NoteDefinition {
  let note: NoteDefinition;
  do {
    note = getRandomNote();
  } while (note.midi === exclude.midi);
  return note;
}
