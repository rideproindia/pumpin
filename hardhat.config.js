require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

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
            url: process.env.ALCHEMY_POLYGON_RPC,
            accounts: [process.env.PRIVATE_KEY]
        }
    }
};

