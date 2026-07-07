const hre = require("hardhat");

async function main(){
  const contract = await hre.ethers.getContractAt(
    ["function withdraw(uint256 amount) external",
     "function contractBalance() external view returns (uint256)"],
    "0x0d8b87e33C6cFD73ad11a355711A2EDDF9c390a3"
  );
  const bal = await contract.contractBalance();
  console.log("Balance:", hre.ethers.formatEther(bal), "CELO");
  
  const withdrawAmt = hre.ethers.parseEther("15");
  const tx = await contract.withdraw(withdrawAmt, {
    gasPrice: hre.ethers.parseUnits("240", "gwei")
  });
  await tx.wait();
  console.log("✅ Withdrew 15 CELO back to wallet");
}
main().catch(console.error);