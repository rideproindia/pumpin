const hre = require("hardhat");

async function main() {
    // Set addresses for constructor parameters
    const uniswapRouter = "0x1F98431c8aD98523631AE4a59f267346ea31F984";  // Replace with actual Uniswap Router address
    const uniswapFactory = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Replace with actual Uniswap Factory address
    const feeReceiver = "0x3E2765D6838f909f5a8DC2e24468957A10D3Bd14";       // Replace with actual Fee Receiver address

    // Deploy TokenFactory with required constructor arguments
    const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");
    const tokenFactory = await TokenFactory.deploy(uniswapRouter, uniswapFactory, feeReceiver);
    
    await tokenFactory.deployed();

    console.log("TokenFactory deployed to:", tokenFactory.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

