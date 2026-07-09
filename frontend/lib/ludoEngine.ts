// lib/ludoEngine.ts
// Simplified but real Ludo rules:
// relPos per token: 0 = in yard, 1-51 = on shared track (relative to own start),
// 52-57 = home stretch, 58 = finished.

export interface GameState {
  tokens: number[][]; // tokens[seat][tokenIndex] = relPos
  turn: number; // seat index whose turn it is
  consecutiveSixes: number;
  winner: number | null; // seat index, or null if no winner yet
}

export const TRACK_LEN = 51;
export const FINISHED = 58;

export function startOffset(seat: number, totalSeats: number): number {
  const spacing = Math.floor(52 / totalSeats);
  return seat * spacing;
}

export function absoluteSquare(seat: number, relPos: number, totalSeats: number): number | null {
  if (relPos < 1 || relPos > TRACK_LEN) return null;
  return (startOffset(seat, totalSeats) + relPos - 1) % 52;
}

export function isSafeSquare(square: number, totalSeats: number): boolean {
  for (let s = 0; s < totalSeats; s++) {
    if (startOffset(s, totalSeats) === square) return true;
  }
  return false;
}

export function initGame(numSeats: number): GameState {
  return {
    tokens: Array.from({ length: numSeats }, () => [0, 0, 0, 0]),
    turn: 0,
    consecutiveSixes: 0,
    winner: null,
  };
}

export function movableTokens(state: GameState, seat: number, dice: number): number[] {
  const result: number[] = [];
  state.tokens[seat].forEach((pos, i) => {
    if (pos === 0) {
      if (dice === 6) result.push(i);
    } else if (pos + dice <= FINISHED) {
      result.push(i);
    }
  });
  return result;
}

export function applyMove(
  state: GameState,
  seat: number,
  tokenIndex: number,
  dice: number,
  totalSeats: number
): { state: GameState; captured: boolean } {
  const tokens = state.tokens.map((arr) => [...arr]);
  const current = tokens[seat][tokenIndex];
  const next = current === 0 ? 1 : current + dice;
  tokens[seat][tokenIndex] = next;

  let captured = false;

  // Capture: landing on an opponent's token on a non-safe shared square sends it home
  if (next >= 1 && next <= TRACK_LEN) {
    const sq = absoluteSquare(seat, next, totalSeats);
    if (sq !== null && !isSafeSquare(sq, totalSeats)) {
      for (let s = 0; s < totalSeats; s++) {
        if (s === seat) continue;
        tokens[s] = tokens[s].map((p) => {
          if (p >= 1 && p <= TRACK_LEN && absoluteSquare(s, p, totalSeats) === sq) {
            captured = true;
            return 0;
          }
          return p;
        });
      }
    }
  }

  const won = tokens[seat].every((p) => p === FINISHED);

  return { state: { ...state, tokens, winner: won ? seat : state.winner }, captured };
}

// Simple AI heuristic: exit yard on a 6 if possible, otherwise move the token
// that's furthest along (closest to finishing), preferring captures if available.
export function pickAIMove(state: GameState, seat: number, dice: number, totalSeats: number): number {
  const movable = movableTokens(state, seat, dice);
  if (movable.length === 0) return -1;
  if (movable.length === 1) return movable[0];

  // Prefer bringing a token out of the yard
  const yardMove = movable.find((i) => state.tokens[seat][i] === 0);
  if (yardMove !== undefined && dice === 6) return yardMove;

  // Otherwise, move whichever token is furthest along
  return movable.reduce((best, i) =>
    state.tokens[seat][i] > state.tokens[seat][best] ? i : best
  , movable[0]);
}

export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}
