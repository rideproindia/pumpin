const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TokenFactory", function () {
  let TokenFactory;
  let ERC20Token;
  let tokenFactory;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  const TOKEN_NAME = "Test Token";
  const TOKEN_SYMBOL = "TEST";
  const TOTAL_SUPPLY = ethers.parseEther("1000000");
  const MAX_WALLET_SIZE = ethers.parseEther("10000");
  const MAX_TX_AMOUNT = ethers.parseEther("5000");
  const TIMELOCK_DURATION = 3600; // 1 hour

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    
    TokenFactory = await ethers.getContractFactory("TokenFactory");
    tokenFactory = await TokenFactory.deploy();
    await tokenFactory.waitForDeployment();
  });

  describe("Token Creation", function () {
    it("Should enforce maximum supply limit", async function () {
      const EXCEED_MAX_SUPPLY = ethers.parseEther("1000000000000000000"); // 1e27 + 1
      await expect(
        tokenFactory.createTokenAdvanced(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          EXCEED_MAX_SUPPLY,
          MAX_WALLET_SIZE,
          MAX_TX_AMOUNT,
          true,
          TIMELOCK_DURATION,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(tokenFactory, "ExceedsMaxSupply");
    });

    it("Should validate timelock duration", async function () {
      const INVALID_TIMELOCK = 1800; // 30 minutes (less than MIN_LAUNCH_DURATION)
      await expect(
        tokenFactory.createTokenAdvanced(
          TOKEN_NAME,
          TOKEN_SYMBOL,
          TOTAL_SUPPLY,
          MAX_WALLET_SIZE,
          MAX_TX_AMOUNT,
          true,
          INVALID_TIMELOCK,
          ethers.ZeroHash
        )
      ).to.be.revertedWithCustomError(tokenFactory, "InvalidTimeLock");
    });
  });

  describe("Vesting Schedule Edge Cases", function () {
    let tokenAddress;
    let tokenContract;

    beforeEach(async function () {
      const tx = await tokenFactory.createTokenAdvanced(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOTAL_SUPPLY,
        MAX_WALLET_SIZE,
        MAX_TX_AMOUNT,
        true,
        TIMELOCK_DURATION,
        ethers.ZeroHash
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const decoded = tokenFactory.interface.parseLog(log);
          return decoded.name === "TokenCreated";
        } catch (e) {
          return false;
        }
      });
      
      const decodedEvent = tokenFactory.interface.parseLog(event);
      tokenAddress = decodedEvent.args.tokenAddress;
      tokenContract = await ethers.getContractAt("ERC20Token", tokenAddress);

      // Launch token
      const initialPrice = ethers.parseEther("0.001");
      await tokenFactory.launchToken(tokenAddress, initialPrice);
    });

    it("Should revert with zero duration", async function () {
      const amount = ethers.parseEther("1000");
      await tokenContract.approve(await tokenFactory.getAddress(), amount);

      await expect(
        tokenFactory.createVestingSchedule(
          tokenAddress,
          addr1.address,
          amount,
          0, // zero duration
          86400,
          0,
          true
        )
      ).to.be.revertedWithCustomError(tokenFactory, "InvalidVestingParameters");
    });

    it("Should revert with interval greater than duration", async function () {
      const amount = ethers.parseEther("1000");
      await tokenContract.approve(await tokenFactory.getAddress(), amount);

      await expect(
        tokenFactory.createVestingSchedule(
          tokenAddress,
          addr1.address,
          amount,
          86400, // 1 day duration
          172800, // 2 days interval
          0,
          true
        )
      ).to.be.revertedWithCustomError(tokenFactory, "InvalidVestingParameters");
    });

    it("Should revert with cliff duration greater than total duration", async function () {
      const amount = ethers.parseEther("1000");
      await tokenContract.approve(await tokenFactory.getAddress(), amount);

      await expect(
        tokenFactory.createVestingSchedule(
          tokenAddress,
          addr1.address,
          amount,
          86400, // 1 day duration
          3600, // 1 hour interval
          172800, // 2 days cliff
          true
        )
      ).to.be.revertedWithCustomError(tokenFactory, "InvalidVestingParameters");
    });
  });

  describe("Transfer Functionality", function () {
    let tokenAddress;
    let tokenContract;

    beforeEach(async function () {
      const tx = await tokenFactory.createTokenAdvanced(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOTAL_SUPPLY,
        MAX_WALLET_SIZE,
        MAX_TX_AMOUNT,
        true,
        TIMELOCK_DURATION,
        ethers.ZeroHash
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const decoded = tokenFactory.interface.parseLog(log);
          return decoded.name === "TokenCreated";
        } catch (e) {
          return false;
        }
      });
      
      const decodedEvent = tokenFactory.interface.parseLog(event);
      tokenAddress = decodedEvent.args.tokenAddress;
      tokenContract = await ethers.getContractAt("ERC20Token", tokenAddress);
    });

    it("Should not allow transfers before launch", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        tokenContract.transfer(addr1.address, amount)
      ).to.be.revertedWithCustomError(tokenContract, "TokenNotLaunched");
    });

    it("Should allow transfers after launch", async function () {
      await tokenFactory.launchToken(tokenAddress, ethers.parseEther("0.001"));
      
      const amount = ethers.parseEther("100");
      await tokenContract.transfer(addr1.address, amount);
      expect(await tokenContract.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should allow transfers after timelock period", async function () {
      await tokenFactory.launchToken(tokenAddress, ethers.parseEther("0.001"));
      await time.increase(TIMELOCK_DURATION + 1);

      const amount = ethers.parseEther("100");
      await tokenContract.transfer(addr1.address, amount);
      expect(await tokenContract.balanceOf(addr1.address)).to.equal(amount);
    });
  });

  describe("Token Configuration", function () {
    let tokenAddress;
    let tokenContract;

    beforeEach(async function () {
      const tx = await tokenFactory.createTokenAdvanced(
        TOKEN_NAME,
        TOKEN_SYMBOL,
        TOTAL_SUPPLY,
        MAX_WALLET_SIZE,
        MAX_TX_AMOUNT,
        true,
        TIMELOCK_DURATION,
        ethers.ZeroHash
      );
      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          const decoded = tokenFactory.interface.parseLog(log);
          return decoded.name === "TokenCreated";
        } catch (e) {
          return false;
        }
      });
      
      const decodedEvent = tokenFactory.interface.parseLog(event);
      tokenAddress = decodedEvent.args.tokenAddress;
      tokenContract = await ethers.getContractAt("ERC20Token", tokenAddress);
    });

    it("Should store correct token configuration", async function () {
      const tokenDetails = await tokenFactory.tokens(tokenAddress);
      expect(tokenDetails.name).to.equal(TOKEN_NAME);
      expect(tokenDetails.symbol).to.equal(TOKEN_SYMBOL);
      expect(tokenDetails.totalSupply).to.equal(TOTAL_SUPPLY);
      expect(tokenDetails.maxWalletSize).to.equal(MAX_WALLET_SIZE);
      expect(tokenDetails.maxTransactionAmount).to.equal(MAX_TX_AMOUNT);
      expect(tokenDetails.hasAntiBot).to.be.true;
      expect(tokenDetails.timeLockDuration).to.equal(TIMELOCK_DURATION);
    });

    it("Should correctly set token owner", async function () {
      const tokenDetails = await tokenFactory.tokens(tokenAddress);
      expect(tokenDetails.owner).to.equal(owner.address);
      expect(await tokenContract.owner()).to.equal(owner.address);
    });
  });
});
