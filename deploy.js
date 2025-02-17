const hre = require("hardhat");

async function main() {
    const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");
    console.log("🚀 Deploying TokenFactory contract...");
    
    const tokenFactory = await TokenFactory.deploy();
    await tokenFactory.deployed();
    
    console.log("✅ TokenFactory deployed to:", tokenFactory.address);
    console.log("🔍 Verifying contract on Polygonscan...");

    try {
        await hre.run("verify:verify", {
            address: tokenFactory.address,
            constructorArguments: [],
        });
        console.log("✅ Contract verified on Polygonscan!");
    } catch (err) {
        console.error("⚠️ Verification failed:", err.message);
    }
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
});

