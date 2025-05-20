const hre = require("hardhat");

async function main() {
  const IdentitySystem = await hre.ethers.getContractFactory("SelfSovereignIdentitySystem");
  const contract = await IdentitySystem.deploy();
  await contract.waitForDeployment();

  console.log("Contract deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
