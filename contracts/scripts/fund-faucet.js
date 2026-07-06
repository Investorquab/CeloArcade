const hre = require("hardhat");

async function main(){
  const faucet = await hre.ethers.getContractAt(
    ["function fund() external payable",
     "function getStats() external view returns (uint256,uint256,uint256,uint256)"],
    "0x3C308BA47FaB3f7Fe17c4b5D9EB30FDd61d5CF14"
  );

  const tx = await faucet.fund({
    value: hre.ethers.parseEther("10"),
    gasPrice: hre.ethers.parseUnits("240", "gwei")
  });
  await tx.wait();

  const stats = await faucet.getStats();
  console.log("✅ Faucet funded!");
  console.log("   Balance:", hre.ethers.formatEther(stats[0]), "CELO");
  console.log("   Covers:", Math.floor(Number(hre.ethers.formatEther(stats[0]))/0.1), "daily claims");
}
main().catch(console.error);