import './style.css';
import { Piano } from './piano/Piano';
import { GameManager, type GamePhase, type GameMode } from './game/GameManager';
import { SONGS } from './game/songs';
import { loadHighScores } from './game/scoring';
import { getNoteByName, type NoteDefinition } from './piano/notes';

const app = document.getElementById('app')!;

// Create piano
const pianoContainer = document.createElement('div');
pianoContainer.style.cssText = 'position: absolute; bottom: 60px; width: 100%; display: flex; justify-content: center;';
app.appendChild(pianoContainer);

const piano = new Piano(pianoContainer);

// UI layer
const uiLayer = document.createElement('div');
uiLayer.className = 'ui-layer';
app.appendChild(uiLayer);

// Game manager
const game = new GameManager(piano);

let prevScore = 0;

function render() {
  const phase = game.phase;

  uiLayer.innerHTML = '';

  switch (phase) {
    case 'menu':
      renderMenu();
      break;
    case 'song-select':
      renderSongSelect();
      break;
    case 'song-playing':
    case 'song-guessing':
      renderSongHud();
      break;
    default:
      renderGameHud();
      break;
  }
}

function renderMenu() {
  const scores = loadHighScores();
  const screen = el('div', 'menu-screen');
  screen.innerHTML = `
    <span class="menu-title">Relative Pitch</span>
    <span class="menu-subtitle">Train your ear, one note at a time</span>
    <div class="mode-cards">
      <div class="mode-card" data-mode="normal">
        <span class="mode-card-icon">🎵</span>
        <div class="mode-card-title">Normal</div>
        <div class="mode-card-desc">Identify one mystery note after hearing a reference</div>
        ${scores.normal > 0 ? `<div style="font-size:11px;color:var(--amber);margin-top:8px">Best: ${scores.normal}</div>` : ''}
      </div>
      <div class="mode-card" data-mode="hard">
        <span class="mode-card-icon">🔥</span>
        <div class="mode-card-title">Hard</div>
        <div class="mode-card-desc">Two mystery notes — identify them both in order</div>
        ${scores.hard > 0 ? `<div style="font-size:11px;color:var(--amber);margin-top:8px">Best: ${scores.hard}</div>` : ''}
      </div>
      <div class="mode-card" data-mode="song">
        <span class="mode-card-icon">🎹</span>
        <div class="mode-card-title">Songs</div>
        <div class="mode-card-desc">Identify notes from famous melodies</div>
      </div>
    </div>
  `;

  screen.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      const mode = (card as HTMLElement).dataset.mode as GameMode;
      game.startGame(mode);
    });
  });

  uiLayer.appendChild(screen);
}

function renderGameHud() {
  const s = game.scoreState;
  const hud = el('div', 'game-hud');

  const modeName = game.mode === 'hard' ? 'HARD MODE' : 'NORMAL MODE';

  let promptHtml = '';
  switch (game.phase) {
    case 'playing-reference':
      promptHtml = `Listen to the <span class="highlight">reference note</span>...`;
      break;
    case 'playing-mystery':
      promptHtml = `Listen to the <span class="highlight">mystery note${game.mode === 'hard' ? 's' : ''}</span>...`;
      break;
    case 'awaiting-guess':
      if (game.mode === 'hard' && game.currentGuessIndex > 0) {
        promptHtml = `Now identify mystery note <span class="highlight">#${game.currentGuessIndex + 1}</span>`;
      } else {
        promptHtml = `Which note was that? <span style="color:var(--text-dim)">(click a key)</span>`;
      }
      break;
    case 'showing-result':
      if (game.lastGuessCorrect) {
        promptHtml = `<span class="correct-text">Correct!</span> It was <span class="highlight">${game.correctAnswer?.name}</span>`;
      } else {
        promptHtml = `<span class="wrong-text">Not quite</span> — it was <span class="highlight">${game.correctAnswer?.name}</span>`;
      }
      break;
  }

  const streakHtml = s.streak >= 3
    ? `<span class="streak-fire">🔥</span> ${s.streak}`
    : s.streak > 0
    ? `${s.streak} streak`
    : '';

  hud.innerHTML = `
    <div class="hud-top-bar">
      <button class="btn-back">&larr; Menu</button>
      <span class="mode-badge">${modeName}</span>
      <span class="score-display ${s.score !== prevScore && s.score > 0 ? 'bump' : ''}">${s.score}</span>
      <span class="streak-display">${streakHtml}</span>
    </div>
    <div class="hud-prompt">${promptHtml}</div>
    ${game.phase === 'awaiting-guess' ? `
      <div class="replay-buttons">
        <button class="btn-replay" data-action="replay-ref">Replay Reference</button>
        <button class="btn-replay" data-action="replay-mystery">Replay Mystery</button>
      </div>
    ` : ''}
  `;

  prevScore = s.score;

  hud.querySelector('.btn-back')?.addEventListener('click', () => game.goToMenu());
  hud.querySelector('[data-action="replay-ref"]')?.addEventListener('click', () => game.replayReference());
  hud.querySelector('[data-action="replay-mystery"]')?.addEventListener('click', () => game.replayMystery());

  uiLayer.appendChild(hud);
}

function renderSongSelect() {
  const screen = el('div', 'song-select-screen');

  const cardsHtml = SONGS.map(song => `
    <div class="song-card" data-song="${song.id}">
      <div class="song-card-title">${song.title}</div>
      <div class="song-card-artist">${song.artist}</div>
      <span class="song-card-diff ${song.difficulty}">${song.difficulty}</span>
    </div>
  `).join('');

  screen.innerHTML = `
    <button class="btn-back" style="align-self:center">&larr; Menu</button>
    <span class="song-select-title">Choose a Song</span>
    <div class="song-grid">${cardsHtml}</div>
  `;

  screen.querySelector('.btn-back')?.addEventListener('click', () => game.goToMenu());
  screen.querySelectorAll('.song-card').forEach(card => {
    card.addEventListener('click', () => {
      const songId = (card as HTMLElement).dataset.song!;
      game.startSong(songId);
    });
  });

  uiLayer.appendChild(screen);
}

function renderSongHud() {
  const song = game.currentSong;
  if (!song) return;

  const s = game.scoreState;
  const hud = el('div', 'song-hud');

  const notes = song.notes.map(sn => getNoteByName(sn.name)).filter(Boolean) as NoteDefinition[];
  const total = notes.length - 1; // minus reference
  const guessed = game.songGuessIndex - 1;
  const pct = total > 0 ? (guessed / total) * 100 : 0;

  let promptHtml = '';
  if (game.phase === 'song-playing') {
    promptHtml = 'Listen to the melody...';
  } else if (game.phase === 'song-guessing') {
    promptHtml = `Identify note <span class="highlight">${guessed + 1}</span> of ${total}`;
  } else if (game.phase === 'showing-result') {
    promptHtml = game.lastGuessCorrect
      ? `<span class="correct-text">Song complete!</span>`
      : `<span class="wrong-text">Wrong note</span> — replaying...`;
  }

  hud.innerHTML = `
    <div class="hud-top-bar">
      <button class="btn-back">&larr; Songs</button>
      <span class="mode-badge">SONG MODE</span>
      <span class="score-display ${s.score !== prevScore && s.score > 0 ? 'bump' : ''}">${s.score}</span>
    </div>
    <span class="song-title-display">${song.title}</span>
    <div class="song-progress-bar"><div class="song-progress-fill" style="width:${pct}%"></div></div>
    <div class="hud-prompt">${promptHtml}</div>
    ${game.phase === 'song-guessing' ? `
      <div class="replay-buttons">
        <button class="btn-replay" data-action="replay-song">Replay Melody</button>
      </div>
    ` : ''}
  `;

  prevScore = s.score;

  hud.querySelector('.btn-back')?.addEventListener('click', () => {
    game.phase = 'song-select';
    game.piano.clearAllHighlights();
    game.piano.setEnabled(false);
    game.piano.setOnKeyClick(null);
    render();
  });
  hud.querySelector('[data-action="replay-song"]')?.addEventListener('click', () => game.replaySong());

  uiLayer.appendChild(hud);
}

function el(tag: string, className: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}

// Subscribe to game state changes
game.onChange(() => render());

// Initial render
render();
