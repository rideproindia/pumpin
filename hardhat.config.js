require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

if (!process.env.PRIVATE_KEY) {
    throw new Error("❌ PRIVATE_KEY is missing in .env file");
}

module.exports = {
    solidity: {
        version: "0.8.28",  // Ensure this matches your contract's pragma
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        polygon: {
            url: process.env.ALCHEMY_POLYGON_RPC || "https://polygon-rpc.com",
            accounts: [process.env.PRIVATE_KEY]
        }
    }
};

