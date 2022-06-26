const { ethers } = require("hardhat");
const { assert } = require("chai");
require("dotenv").config;

const { WALLET_ADDRESS } = process.env;

// ERC20
const TOTAL_SUPPLY = "1000000";

// Lending
const APPROVAL_AMOUNT = "1000";
const DEPOSIT_AMOUNT = "110";
const WITHDRAW_AMOUNT = "10";
const BORROW_AMOUNT = "20";
const LIQUIDATION_THRESHOLD = "30";
const REPAY_AMOUNT = "10";

// MockV3Aggregator
const AGGREGATOR_DECIMALS = "18";
const INITIAL_PRICE = "2";

// for building tests
function log(value) {
  console.log(value);
}

describe("Lending unit tests", function () {
  // test variables
  let SimpleERC20Factory, SimpleERC20, SimpleERC20Address;
  let LendingFactory, Lending, LendingAddress;
  let MockV3AggregatorFactory, MockV3Aggregator, MockV3AggregatorAddress;
  let CurrentTokenBalance;
  let BorrowValue, CollateralValue;

  describe("deploy ERC20 contract", function () {
    it("deploy contract", async () => {
      SimpleERC20Factory = await ethers.getContractFactory("SimpleERC20");
      SimpleERC20 = await SimpleERC20Factory.deploy(
        ethers.utils.parseEther(TOTAL_SUPPLY)
      );
      SimpleERC20Address = SimpleERC20.address;
      assert(SimpleERC20Address, "No contract address");
    });

    it("check total supply", async () => {
      let totalSupply = await SimpleERC20.totalSupply();
      assert(
        totalSupply.toString() ===
          ethers.utils.parseEther(TOTAL_SUPPLY).toString(),
        "total supply not what user entered"
      );
    });

    it("check owner", async () => {
      let owner = await SimpleERC20.owner();
      assert(owner === WALLET_ADDRESS, "missing owner address");
    });
  });

  describe("deploy Lending contract", function () {
    it("deploy contract", async () => {
      LendingFactory = await ethers.getContractFactory("Lending");
      Lending = await LendingFactory.deploy();
      LendingAddress = Lending.address;
      assert(LendingAddress, "No contract address");
    });

    it("check owner", async () => {
      let owner = await Lending.owner();
      assert(owner === WALLET_ADDRESS, "missing owner address");
    });
  });

  describe("deploy MockV3Aggregator contract", function () {
    it("deploy contract", async () => {
      MockV3AggregatorFactory = await ethers.getContractFactory(
        "MockV3Aggregator"
      );
      MockV3Aggregator = await MockV3AggregatorFactory.deploy(
        AGGREGATOR_DECIMALS,
        INITIAL_PRICE
      );
      MockV3AggregatorAddress = MockV3Aggregator.address;
      assert(MockV3AggregatorAddress, "missing contract address");
    });
  });

  describe("set erc20 to allow list", function () {
    it("set allowed token", async () => {
      let tx = await Lending.setAllowedToken(
        SimpleERC20Address,
        MockV3AggregatorAddress
      );
      let txReceipt = await tx.wait();
      assert(txReceipt.events[0].event == "AllowedTokenSet");
    });
    it("confirm token is allowed", async () => {
      let tx = await Lending.s_tokenToPriceFeed(SimpleERC20Address);
      assert(tx == MockV3AggregatorAddress, "token is not allowed");
    });
  });

  describe("deposit erc20 into Lending contract", async () => {
    it("approve deposit with erc20 contract", async () => {
      let tx = await SimpleERC20.approve(
        LendingAddress,
        ethers.utils.parseEther(APPROVAL_AMOUNT)
      );
      let txReceipt = await tx.wait();
      assert(
        txReceipt.events[0].event === "Approval",
        "approval was not successful"
      );
    });

    it("make erc20 deposit", async () => {
      let tx = await Lending.deposit(
        SimpleERC20Address,
        ethers.utils.parseEther(DEPOSIT_AMOUNT)
      );
      let txReceipt = await tx.wait();
      assert(txReceipt.events[0].event === "Deposit", "deposit unsuccessful");
    });

    it("check the erc20 balance", async () => {
      let tx = await Lending.getTokenBalance(SimpleERC20Address);
      assert(
        tx.toString() === ethers.utils.parseEther(DEPOSIT_AMOUNT).toString(),
        "not the expected token balance"
      );
    });
  });

  describe("withdraw erc20 from Lending contract", async () => {
    it("withdraw erc20", async () => {
      let tx = await Lending.withdraw(
        SimpleERC20Address,
        ethers.utils.parseEther(WITHDRAW_AMOUNT)
      );
      let txReceipt = await tx.wait();
      assert(txReceipt.events[0].event === "Withdraw", "withdraw unsuccessful");
    });

    it("check the erc20 balance", async () => {
      let tx = await Lending.getTokenBalance(SimpleERC20Address);
      CurrentTokenBalance = (
        Number(DEPOSIT_AMOUNT) - Number(WITHDRAW_AMOUNT)
      ).toString();
      assert(
        tx.toString() ===
          ethers.utils.parseEther(CurrentTokenBalance).toString(),
        "not the expected token balance"
      );
    });
  });

  describe("borrow erc20 from Lending contract", function () {
    it("borrow some tokens", async () => {
      tx = await Lending.borrow(
        SimpleERC20Address,
        ethers.utils.parseEther(BORROW_AMOUNT)
      );
      let txReceipt = await tx.wait();
      assert(txReceipt.events[0].event === "Borrow", "borrow was unsuccessful");
    });
  });

  describe("check account information", function () {
    it("get account information", async () => {
      let tx = await Lending.getAccountInformation(WALLET_ADDRESS);
      assert(
        tx[0] && tx[1],
        "unexpected results from get account information function"
      );
    });
  });

  describe("check health factor", function () {
    it("verify account collateral value", async () => {
      let tx = await Lending.getAccountCollateralValue(WALLET_ADDRESS);
      CollateralValue = (
        Number(CurrentTokenBalance) * Number(INITIAL_PRICE)
      ).toString();
      assert(
        CollateralValue === tx.toString(),
        "unexpected collateral value given deposited balance"
      );
    });

    it("verify account borrowed value", async () => {
      let tx = await Lending.getAccountBorrowedValue(WALLET_ADDRESS);
      BorrowValue = (Number(BORROW_AMOUNT) * Number(INITIAL_PRICE)).toString();
      assert(
        BorrowValue === tx.toString(),
        "unexpected borrowed value given borrowed amount"
      );
    });

    it("verify health score", async () => {
      let tx = await Lending.healthFactor(WALLET_ADDRESS);
      let collateralAdjustedForThreshold =
        (Number(CollateralValue) * Number(LIQUIDATION_THRESHOLD)) / 100;
      let expected = ethers.utils.parseEther(
        (collateralAdjustedForThreshold / Number(BorrowValue)).toString()
      );
      assert(tx.toString() === expected.toString(), "unexpected health score");
    });
  });

  describe("repay borrowed amount", function () {
    it("repay some erc20", async () => {
      let tx = await Lending.repay(
        SimpleERC20Address,
        ethers.utils.parseEther(REPAY_AMOUNT)
      );
      let txReceipt = await tx.wait();
      assert(txReceipt.events[0].event === "Repay", "repay transaction failed");
    });
  });
});
