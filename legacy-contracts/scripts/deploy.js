const hre = require("hardhat");

const ARCADE   = "0x0d8b87e33C6cFD73ad11a355711A2EDDF9c390a3";
const FAUCET   = "0x3C308BA47FaB3f7Fe17c4b5D9EB30FDd61d5CF14";
const REWARDS  = "0x40215A0965596e1831bB9e5a6A0cc0E161A87599";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${hre.ethers.formatEther(bal)} CELO\n`);

  console.log(`📦 Deploying ArcadeBadges...`);
  const Badges = await hre.ethers.getContractFactory("ArcadeBadges");
  const badges = await Badges.deploy(ARCADE);
  await badges.waitForDeployment();
  const badgesAddr = await badges.getAddress();
  console.log(`   ✅ ArcadeBadges: ${badgesAddr}`);

  console.log(`\n${'═'.repeat(55)}`);
  console.log(`  ALL 4 CONTRACTS READY:`);
  console.log(`${'═'.repeat(55)}`);
  console.log(`  CONTRACT_ADDRESS = "${ARCADE}"`);
  console.log(`  FAUCET_ADDRESS   = "${FAUCET}"`);
  console.log(`  REWARDS_ADDRESS  = "${REWARDS}"`);
  console.log(`  BADGES_ADDRESS   = "${badgesAddr}"`);
  console.log(`\n  Add all 4 to talent.app`);
}

main().catch(e => { console.error(e); process.exit(1); });