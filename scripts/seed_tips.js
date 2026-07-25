const hre = require("hardhat");

async function main() {
  const [owner, tipper1, tipper2, tipper3] = await hre.ethers.getSigners();
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const tipJar = await hre.ethers.getContractAt("TipJar", contractAddress);

  console.log("Seeding initial tips...");
  await tipJar.connect(tipper1).tip("Amazing dApp! Keep building! 🚀", { value: hre.ethers.parseEther("0.01") });
  await tipJar.connect(tipper2).tip("Super clean interface and event feed! ☕", { value: hre.ethers.parseEther("0.05") });
  await tipJar.connect(tipper3).tip("Great job on Ethereum Sepolia / Hardhat! 🔥", { value: hre.ethers.parseEther("0.02") });

  console.log("Total tips on contract:", (await tipJar.getTipsCount()).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
