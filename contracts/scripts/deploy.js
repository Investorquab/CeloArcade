const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n🚀 Deploying CeloArcade on Celo Mainnet`);
  console.log(`   Deployer: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${hre.ethers.formatEther(balance)} CELO`);

  const CeloArcade = await hre.ethers.getContractFactory("CeloArcade");
  const contract = await CeloArcade.deploy({
    value: hre.ethers.parseEther("19.0") // fund with 19 CELO, keep 2 for gas
  });
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`\n✅ CeloArcade deployed: ${address}`);
  console.log(`   Funded with: 19 CELO`);
  console.log(`   Welcome bonuses: covers ~380 new wallets at 0.05 CELO each`);
  console.log(`\n📋 Next step:`);
  console.log(`   Open frontend/index.html`);
  console.log(`   Find: YOUR_CONTRACT_ADDRESS`);
  console.log(`   Replace with: ${address}`);
  console.log(`\n🔗 Verify on explorer:`);
  console.log(`   https://celoscan.io/address/${address}`);
}

main().catch(e => { console.error(e); process.exit(1); });
