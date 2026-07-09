"use client";

import { FINISHED } from "@/lib/ludoEngine";

// Standard Ludo colors matching the classic board: red, blue, yellow, green
const SEAT_HEX = ["#ef4444", "#3b82f6", "#eab308", "#22c55e"];
const CELL = 20; // each of the 15x15 board cells is 20x20 units, board is 300x300

// The 52-cell shared track, built with 4-fold rotational symmetry around the
// center — one 13-cell block per color's arm of the cross.
const RING_PATH: [number, number][] = [
  // Red's arm (left)
  [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [6, 6],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  // Blue's arm (top)
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  // Yellow's arm (right)
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [8, 8],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  // Green's arm (bottom)
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6], [8, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
];

// Each seat's private home stretch (relPos 52-57), leading into the center
const HOME_STRETCH: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // red
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // blue
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // yellow
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // green
];

// Fixed slots within each color's yard for the 4 tokens waiting there
const YARD_SLOTS: [number, number][][] = [
  [[1.5, 1.5], [4.5, 1.5], [1.5, 4.5], [4.5, 4.5]], // red, top-left
  [[9.5, 1.5], [12.5, 1.5], [9.5, 4.5], [12.5, 4.5]], // blue, top-right
  [[9.5, 9.5], [12.5, 9.5], [9.5, 12.5], [12.5, 12.5]], // yellow, bottom-right
  [[1.5, 9.5], [4.5, 9.5], [1.5, 12.5], [4.5, 12.5]], // green, bottom-left
];

function cellToPixel(row: number, col: number) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

function tokenPixel(seat: number, relPos: number, totalSeats: number) {
  if (relPos === 0) {
    const [row, col] = YARD_SLOTS[seat % 4][0]; // placeholder, refined below with tokenIndex
    return cellToPixel(row, col);
  }
  if (relPos === FINISHED) {
    return { x: 150, y: 150 };
  }
  if (relPos >= 52) {
    const [row, col] = HOME_STRETCH[seat % 4][relPos - 52];
    return cellToPixel(row, col);
  }
  // relPos 1-51: shared ring, offset by this seat's starting position (13 apart)
  const spacing = Math.floor(52 / totalSeats);
  const ringIndex = (seat * spacing + relPos - 1) % 52;
  const [row, col] = RING_PATH[ringIndex];
  return cellToPixel(row, col);
}

export function LudoBoard({
  tokens,
  totalSeats,
}: {
  tokens: number[][];
  totalSeats: number;
}) {
  return (
    <svg viewBox="0 0 300 300" className="w-full rounded-xl bg-gray-950 border border-gray-800">
      {/* Yard boxes, one per active seat */}
      {[0, 1, 2, 3].map((seat) => {
        const boxes = [
          { x: 0, y: 0 }, // red TL
          { x: 180, y: 0 }, // blue TR
          { x: 180, y: 180 }, // yellow BR
          { x: 0, y: 180 }, // green BL
        ];
        const active = seat < totalSeats;
        return (
          <rect
            key={`yard-${seat}`}
            x={boxes[seat].x}
            y={boxes[seat].y}
            width={120}
            height={120}
            fill={SEAT_HEX[seat]}
            opacity={active ? 0.18 : 0.05}
            stroke={SEAT_HEX[seat]}
            strokeWidth={1}
          />
        );
      })}

      {/* Shared track cells */}
      {RING_PATH.map(([row, col], i) => (
        <rect
          key={`ring-${i}`}
          x={col * CELL}
          y={row * CELL}
          width={CELL}
          height={CELL}
          fill="#1a1f2b"
          stroke="#2a2f3a"
          strokeWidth={0.5}
        />
      ))}

      {/* Start squares highlighted in each color */}
      {[0, 1, 2, 3].map((seat) => {
        if (seat >= totalSeats) return null;
        const spacing = Math.floor(52 / totalSeats);
        const [row, col] = RING_PATH[seat * spacing];
        return (
          <rect
            key={`start-${seat}`}
            x={col * CELL}
            y={row * CELL}
            width={CELL}
            height={CELL}
            fill={SEAT_HEX[seat]}
            opacity={0.4}
          />
        );
      })}

      {/* Home stretch cells, colored per seat */}
      {[0, 1, 2, 3].map((seat) =>
        seat < totalSeats
          ? HOME_STRETCH[seat].map(([row, col], i) => (
              <rect
                key={`home-${seat}-${i}`}
                x={col * CELL}
                y={row * CELL}
                width={CELL}
                height={CELL}
                fill={SEAT_HEX[seat]}
                opacity={0.3}
              />
            ))
          : null
      )}

      {/* Center home triangle area */}
      <rect x={120} y={120} width={60} height={60} fill="#111827" stroke="#374151" strokeWidth={1} />
      <text x={150} y={155} textAnchor="middle" fontSize="14">🏆</text>

      {/* Tokens */}
      {tokens.map((seatTokens, seat) =>
        seatTokens.map((relPos, tokenIndex) => {
          let pos;
          if (relPos === 0) {
            const [row, col] = YARD_SLOTS[seat % 4][tokenIndex];
            pos = cellToPixel(row, col);
          } else {
            pos = tokenPixel(seat, relPos, totalSeats);
          }
          return (
            <circle
              key={`${seat}-${tokenIndex}`}
              cx={pos.x}
              cy={pos.y}
              r={relPos === FINISHED ? 3 : 7}
              fill={SEAT_HEX[seat % 4]}
              stroke="#0a0e17"
              strokeWidth={1.5}
              opacity={relPos === FINISHED ? 0.5 : 1}
            />
          );
        })
      )}
    </svg>
  );
}
