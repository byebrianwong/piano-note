export interface SongNote {
  name: string;
  duration: number; // in beats
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bpm: number;
  notes: SongNote[];
}

export const SONGS: Song[] = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle',
    artist: 'Traditional',
    difficulty: 'easy',
    bpm: 100,
    notes: [
      { name: 'C4', duration: 1 },
      { name: 'C4', duration: 1 },
      { name: 'G4', duration: 1 },
      { name: 'G4', duration: 1 },
      { name: 'A4', duration: 1 },
      { name: 'A4', duration: 1 },
      { name: 'G4', duration: 2 },
    ],
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Beethoven',
    difficulty: 'easy',
    bpm: 108,
    notes: [
      { name: 'E4', duration: 1 },
      { name: 'E4', duration: 1 },
      { name: 'F4', duration: 1 },
      { name: 'G4', duration: 1 },
      { name: 'G4', duration: 1 },
      { name: 'F4', duration: 1 },
      { name: 'E4', duration: 1 },
      { name: 'D4', duration: 1 },
    ],
  },
  {
    id: 'jaws',
    title: 'Jaws Theme',
    artist: 'John Williams',
    difficulty: 'easy',
    bpm: 132,
    notes: [
      { name: 'E3', duration: 0.5 },
      { name: 'F3', duration: 0.5 },
      { name: 'E3', duration: 0.5 },
      { name: 'F3', duration: 0.5 },
      { name: 'E3', duration: 0.5 },
      { name: 'F3', duration: 0.5 },
      { name: 'E3', duration: 0.5 },
      { name: 'F3', duration: 0.5 },
      { name: 'G3', duration: 1 },
    ],
  },
  {
    id: 'pink-panther',
    title: 'Pink Panther',
    artist: 'Henry Mancini',
    difficulty: 'medium',
    bpm: 116,
    notes: [
      { name: 'C#4', duration: 0.5 },
      { name: 'D4', duration: 1 },
      { name: 'E4', duration: 0.5 },
      { name: 'F4', duration: 1 },
      { name: 'C#4', duration: 0.5 },
      { name: 'D4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'C#4', duration: 0.5 },
      { name: 'D4', duration: 0.5 },
      { name: 'A#3', duration: 0.5 },
      { name: 'D4', duration: 1.5 },
    ],
  },
  {
    id: 'batman',
    title: 'Batman Theme',
    artist: 'Neal Hefti',
    difficulty: 'medium',
    bpm: 140,
    notes: [
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'A#3', duration: 0.5 },
      { name: 'A#3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'B3', duration: 1 },
    ],
  },
  {
    id: 'star-wars',
    title: 'Star Wars',
    artist: 'John Williams',
    difficulty: 'medium',
    bpm: 108,
    notes: [
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'G3', duration: 0.5 },
      { name: 'C4', duration: 2 },
      { name: 'G4', duration: 2 },
      { name: 'F4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'D4', duration: 0.5 },
    ],
  },
  {
    id: 'fur-elise',
    title: 'Fur Elise',
    artist: 'Beethoven',
    difficulty: 'hard',
    bpm: 130,
    notes: [
      { name: 'E4', duration: 0.5 },
      { name: 'D#4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'D#4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'B3', duration: 0.5 },
      { name: 'D4', duration: 0.5 },
      { name: 'C4', duration: 0.5 },
      { name: 'A3', duration: 1 },
    ],
  },
  {
    id: 'mario',
    title: 'Super Mario Bros',
    artist: 'Koji Kondo',
    difficulty: 'hard',
    bpm: 180,
    notes: [
      { name: 'E4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'C4', duration: 0.5 },
      { name: 'E4', duration: 0.5 },
      { name: 'G4', duration: 1 },
      { name: 'G3', duration: 1 },
    ],
  },
];
