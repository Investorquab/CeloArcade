// Real deployed addresses from deployments.json
export const ADDRESSES = {
  ArcadeTournament: "0xedEBd53DDb7Ea6385b7D8F6bF45609dE25EdE8ef",
  TournamentBadges: "0xb4b5c8403EA9f3E659f02829F745702A209Bf6f3",
  GameRooms: "0xD058ffcC5e04a59CC30C5e7482b5b9cb0910b16c",
  BotFaucet: "0x7284CE519bd039c3CD4b5695C661D0e13c6D3CD9",
} as const;

// Minimal ABIs — just the functions the frontend needs to call/read.
// Expand these as we build out each screen's functionality.

export const GAME_ROOMS_ABI = [
  {
    inputs: [
      { name: "gameType", type: "uint8" },
      { name: "maxPlayers", type: "uint8" },
      { name: "stakeAmount", type: "uint256" },
      { name: "vsAI", type: "bool" },
    ],
    name: "createRoom",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "joinRoom",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "getRoom",
    outputs: [
      { name: "host", type: "address" },
      { name: "gameType", type: "uint8" },
      { name: "maxPlayers", type: "uint8" },
      { name: "stakeAmount", type: "uint256" },
      { name: "vsAI", type: "bool" },
      { name: "status", type: "uint8" },
      { name: "pot", type: "uint256" },
      { name: "winner", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "id", type: "uint256" }],
    name: "getRoomPlayers",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "limit", type: "uint256" }],
    name: "getOpenRooms",
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "roomCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const BOT_FAUCET_ABI = [
  {
    inputs: [{ name: "recipient", type: "address" }],
    name: "canReceive",
    outputs: [
      { name: "eligible", type: "bool" },
      { name: "secondsUntilNext", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "dispensed", type: "uint256" },
      { name: "uniqueRecipients", type: "uint256" },
      { name: "dispensedToday", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
