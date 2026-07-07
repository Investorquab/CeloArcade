/**
 * withdraw-all.js
 * Withdraws full CELO balance from CeloArcade, CeloFaucet, and DailyRewards.
 * ArcadeBadges is skipped — it never holds CELO (no payable functions).
 *
 * Requires: npm install ethers dotenv
 *
 * Set these in a .env file (DO NOT hardcode your private key in this file):
 *   OWNER_PRIVATE_KEY=0x...
 *   CELO_RPC_URL=https://forno.celo.org
 *   CELOARCADE_ADDRESS=0x...
 *   CELOFAUCET_ADDRESS=0x...
 *   DAILYREWARDS_ADDRESS=0x...
 */

require('dotenv').config();
const { ethers } = require('ethers');

const WITHDRAW_ABI = [
  "function withdraw(uint256 amount) external",
  "function owner() view returns (address)"
];

const CONTRACTS = [
  { name: 'CeloArcade',   address: process.env.CELOARCADE_ADDRESS },
  { name: 'CeloFaucet',   address: process.env.CELOFAUCET_ADDRESS },
  { name: 'DailyRewards', address: process.env.DAILYREWARDS_ADDRESS },
];

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.CELO_RPC_URL || 'https://forno.celo.org');
  const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);

  console.log(`Using wallet: ${wallet.address}\n`);

  for (const c of CONTRACTS) {
    if (!c.address) {
      console.log(`⚠️  Skipping ${c.name} — no address set in .env\n`);
      continue;
    }

    const contract = new ethers.Contract(c.address, WITHDRAW_ABI, wallet);

    try {
      // Confirm we're actually the owner before attempting
      const onchainOwner = await contract.owner();
      if (onchainOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.log(`⛔ ${c.name}: wallet is NOT owner (owner is ${onchainOwner}). Skipping.\n`);
        continue;
      }

      const balance = await provider.getBalance(c.address);
      if (balance === 0n) {
        console.log(`ℹ️  ${c.name}: balance is 0, nothing to withdraw.\n`);
        continue;
      }

      console.log(`💰 ${c.name}: balance = ${ethers.formatEther(balance)} CELO`);
      console.log(`   Withdrawing full balance to owner (${onchainOwner})...`);

      const tx = await contract.withdraw(balance);
      console.log(`   tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ confirmed in block ${receipt.blockNumber}\n`);

    } catch (err) {
      console.error(`❌ ${c.name} failed:`, err.reason || err.message, '\n');
    }
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
