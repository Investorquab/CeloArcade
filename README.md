# 🎮 CeloArcade — Onchain Game Hub

> Play. Predict. Battle. Every move is onchain on Celo.

**Live:** [your-url-here]  
**Contract:** [your-contract-here]  
**Network:** Celo Mainnet · Chain ID 42220

---

## Games

| | Game | Txs per session |
|---|------|----------------|
| 🧠 | **QuizBlitz** — 5 categories, stake CELO, 1.8x payout, streak multipliers | ~10 |
| 🎯 | **Predict & Win** — daily predictions, pool-based rewards | ~3 |
| ⚡ | **Speed Run** — 60 sec math sprints & word scrambles | ~20 |
| ⚔️ | **1v1 Battle** — create rooms, challenge wallets, winner takes all | ~4 |

## Onboarding

- Connect wallet → click Register → receive **0.05 CELO** gas from contract
- Zero deposit needed to start playing
- Auto-connects in Opera MiniPay

## Scoring System

- Every game action = onchain transaction
- XP earned per correct answer
- Level up every 500 XP
- Daily streak multiplier (up to ×1.2)
- Referral system — earn 3% of referee winnings forever

## Tech Stack

- **Smart Contract:** Solidity 0.8.20, Celo Mainnet
- **Frontend:** HTML/CSS/JS + ethers.js v6, single file
- **Wallet:** MiniPay native auto-connect + MetaMask
- **No backend** — fully onchain

## Deploy

```bash
cd contracts
npm install
cp .env.example .env
# add PRIVATE_KEY to .env
npx hardhat run scripts/deploy.js --network celo
```

Then update `frontend/index.html`:
```js
const CONTRACT_ADDRESS = "0xYourDeployedAddress";
```

## Built For

Celo Proof of Ship Season 2 — [talent.app](https://talent.app/earn/celo-proof-of-ship)

## License

MIT
