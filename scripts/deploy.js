const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("==========================================");
  console.log(" Deploying TipJar Smart Contract");
  console.log(" Network:", hre.network.name);
  console.log("==========================================");

  const TipJar = await hre.ethers.getContractFactory("TipJar");
  const tipJar = await TipJar.deploy();
  await tipJar.waitForDeployment();

  const address = await tipJar.getAddress();
  const deployTx = tipJar.deploymentTransaction();

  console.log("✔ TipJar deployed to address:", address);
  console.log("✔ Deployment Tx Hash:", deployTx?.hash);

  // Sync address & ABI to Next.js frontend config
  const frontendConfigDir = path.join(__dirname, "../frontend-nextjs/lib");
  if (!fs.existsSync(frontendConfigDir)) {
    fs.mkdirSync(frontendConfigDir, { recursive: true });
  }

  const contractArtifact = await hre.artifacts.readArtifact("TipJar");
  const deployedInfo = {
    address,
    network: hre.network.name,
    chainId: hre.network.config.chainId || 31337,
    abi: contractArtifact.abi,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(frontendConfigDir, "deployed-contract.json"),
    JSON.stringify(deployedInfo, null, 2)
  );
  console.log("✔ Exported deployment artifact to frontend-nextjs/lib/deployed-contract.json");

  // Auto-verify on Etherscan if API key is provided and on Sepolia
  if (process.env.ETHERSCAN_API_KEY && hre.network.name === "sepolia") {
    console.log("Waiting for block confirmations before Etherscan verification...");
    await deployTx.wait(5);
    try {
      await hre.run("verify:verify", {
        address,
        constructorArguments: [],
      });
      console.log("✔ Contract verified on Etherscan!");
    } catch (err) {
      console.log("Verification skipped/failed:", err.message);
    }
  }

  console.log("==========================================");
  console.log(" Deployment Completed Successfully!");
  console.log("==========================================");
}

main().catch((error) => {
  console.error("Deployment Error:", error);
  process.exitCode = 1;
});
