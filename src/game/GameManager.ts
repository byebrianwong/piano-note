import { Piano } from '../piano/Piano';
import { audioEngine } from '../audio/AudioEngine';
import { playNote } from '../audio/PianoSynth';
import {
  type NoteDefinition,
  getRandomNote,
  getRandomNoteDifferentFrom,
  getRandomEasyNote,
  getNearbyNote,
  getNoteByName,
  NOTES,
} from '../piano/notes';
import {
  type ScoreState,
  createScoreState,
  scoreCorrect,
  scoreWrong,
  saveHighScore,
} from './scoring';
import { SONGS, type Song } from './songs';

export type GameMode = 'easy' | 'normal' | 'hard' | 'song';

export type GamePhase =
  | 'menu'
  | 'playing-reference'
  | 'playing-mystery'
  | 'awaiting-guess'
  | 'showing-result'
  | 'song-select'
  | 'song-playing'
  | 'song-guessing';

type Listener = () => void;

export class GameManager {
  piano: Piano;
  mode: GameMode = 'normal';
  phase: GamePhase = 'menu';
  scoreState: ScoreState = createScoreState();
  referenceNote: NoteDefinition | null = null;
  mysteryNotes: NoteDefinition[] = [];
  currentGuessIndex = 0;
  lastGuessCorrect = false;
  correctAnswer: NoteDefinition | null = null;

  // Song mode state
  currentSong: Song | null = null;
  songNoteIndex = 0;
  songGuessIndex = 0;

  private listeners = new Set<Listener>();

  constructor(piano: Piano) {
    this.piano = piano;
  }

  onChange(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach(fn => fn());
  }

  async startGame(mode: GameMode) {
    await audioEngine.resume();
    this.mode = mode;
    this.scoreState = createScoreState();
    this.referenceNote = null;

    if (mode === 'song') {
      this.phase = 'song-select';
      this.emit();
      return;
    }

    this.startRound();
  }

  async startRound() {
    this.piano.clearAllHighlights();
    this.piano.setEnabled(false);
    this.currentGuessIndex = 0;
    this.lastGuessCorrect = false;

    // Pick reference note
    if (!this.referenceNote) {
      this.referenceNote = this.mode === 'easy' ? getRandomEasyNote() : getRandomNote();
    }

    // Play & highlight reference
    this.phase = 'playing-reference';
    this.emit();

    this.piano.animatePress(this.referenceNote.midi);
    this.piano.highlightKey(this.referenceNote.midi, 'reference');
    playNote(this.referenceNote.frequency);

    await this.delay(1500);

    // Pick mystery note(s)
    const count = this.mode === 'hard' ? 2 : 1;
    this.mysteryNotes = [];
    let lastNote = this.referenceNote;
    for (let i = 0; i < count; i++) {
      const mystery = this.mode === 'easy'
        ? getNearbyNote(lastNote)
        : getRandomNoteDifferentFrom(lastNote);
      this.mysteryNotes.push(mystery);
      lastNote = mystery;
    }

    // Play mystery notes
    this.phase = 'playing-mystery';
    this.emit();

    for (const mystery of this.mysteryNotes) {
      this.piano.animatePress(mystery.midi);
      playNote(mystery.frequency);
      await this.delay(900);
    }

    // Await guess
    this.phase = 'awaiting-guess';
    this.piano.setEnabled(true);
    this.piano.setOnKeyClick((note) => this.handleGuess(note));
    this.emit();
  }

  private async handleGuess(guessedNote: NoteDefinition) {
    const expected = this.mysteryNotes[this.currentGuessIndex];
    const isCorrect = guessedNote.midi === expected.midi;

    this.piano.setEnabled(false);
    this.piano.setOnKeyClick(null);
    this.phase = 'showing-result';

    if (isCorrect) {
      this.piano.highlightKey(guessedNote.midi, 'correct');
      this.currentGuessIndex++;

      if (this.currentGuessIndex >= this.mysteryNotes.length) {
        // All correct
        this.lastGuessCorrect = true;
        this.correctAnswer = expected;
        this.scoreState = scoreCorrect(this.scoreState);
        this.referenceNote = this.mysteryNotes[this.mysteryNotes.length - 1];
        this.emit();

        await this.delay(1200);
        this.startRound();
      } else {
        // More notes to guess in hard mode
        this.phase = 'awaiting-guess';
        this.piano.setEnabled(true);
        this.piano.setOnKeyClick((note) => this.handleGuess(note));
        this.emit();
      }
    } else {
      // Wrong
      this.lastGuessCorrect = false;
      this.correctAnswer = expected;
      this.piano.highlightKey(guessedNote.midi, 'wrong');
      this.piano.highlightKey(expected.midi, 'correct');
      this.scoreState = scoreWrong(this.scoreState);
      if (this.mode !== 'song') {
        saveHighScore(this.mode as 'easy' | 'normal' | 'hard', this.scoreState.score);
      }
      this.emit();

      await this.delay(2000);
      this.piano.clearAllHighlights();
      this.startRound();
    }
  }

  replayRound() {
    if (!this.referenceNote) return;
    // Play reference first, then mystery note(s) after a gap
    this.piano.animatePress(this.referenceNote.midi);
    playNote(this.referenceNote.frequency);

    this.mysteryNotes.forEach((note, i) => {
      setTimeout(() => {
        this.piano.animatePress(note.midi);
        playNote(note.frequency);
      }, (i + 1) * 900);
    });
  }

  // ── Song Mode ──

  async startSong(songId: string) {
    const song = SONGS.find(s => s.id === songId);
    if (!song) return;

    this.currentSong = song;
    this.songNoteIndex = 0;
    this.songGuessIndex = 1; // first note is the reference
    this.piano.clearAllHighlights();
    this.piano.setEnabled(false);

    // Play the full melody
    this.phase = 'song-playing';
    this.emit();

    const beatDuration = 60 / song.bpm;
    const notes = song.notes.map(sn => getNoteByName(sn.name)).filter(Boolean) as NoteDefinition[];

    // Highlight and play first note as reference
    if (notes[0]) {
      this.piano.highlightKey(notes[0].midi, 'reference');
      this.referenceNote = notes[0];
    }

    let time = 0;
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const dur = song.notes[i].duration * beatDuration;
      setTimeout(() => {
        this.piano.animatePress(note.midi);
        playNote(note.frequency, { duration: dur * 0.9 });
      }, time * 1000);
      time += dur;
    }

    await this.delay(time * 1000 + 500);

    // Now user guesses
    this.phase = 'song-guessing';
    this.piano.setEnabled(true);
    this.piano.setOnKeyClick((note) => this.handleSongGuess(note, notes));
    this.emit();
  }

  private async handleSongGuess(guessedNote: NoteDefinition, fullNotes: NoteDefinition[]) {
    const expected = fullNotes[this.songGuessIndex];
    const isCorrect = guessedNote.midi === expected.midi;

    if (isCorrect) {
      this.piano.highlightKey(guessedNote.midi, 'correct');
      this.scoreState = scoreCorrect(this.scoreState);
      this.songGuessIndex++;

      if (this.songGuessIndex >= fullNotes.length) {
        // Song complete!
        this.piano.setEnabled(false);
        this.piano.setOnKeyClick(null);
        this.lastGuessCorrect = true;
        this.phase = 'showing-result';
        this.emit();

        await this.delay(2000);
        this.phase = 'song-select';
        this.piano.clearAllHighlights();
        this.emit();
      } else {
        this.emit();
      }
    } else {
      this.piano.highlightKey(guessedNote.midi, 'wrong');
      this.scoreState = scoreWrong(this.scoreState);
      this.piano.setEnabled(false);
      this.piano.setOnKeyClick(null);
      this.emit();

      await this.delay(1500);

      // Replay from beginning
      this.piano.clearAllHighlights();
      this.songGuessIndex = 1;
      this.startSong(this.currentSong!.id);
    }
  }

  replaySong() {
    if (!this.currentSong) return;
    const song = this.currentSong;
    const beatDuration = 60 / song.bpm;
    const notes = song.notes.map(sn => getNoteByName(sn.name)).filter(Boolean) as NoteDefinition[];

    let time = 0;
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const dur = song.notes[i].duration * beatDuration;
      setTimeout(() => {
        this.piano.animatePress(note.midi);
        playNote(note.frequency, { duration: dur * 0.9 });
      }, time * 1000);
      time += dur;
    }
  }

  goToMenu() {
    this.phase = 'menu';
    this.piano.clearAllHighlights();
    this.piano.setEnabled(false);
    this.piano.setOnKeyClick(null);
    this.emit();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
