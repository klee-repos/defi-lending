const { ethers } = require("hardhat");
require("dotenv").config;

const { WALLET_ADDRESS } = process.env;

// ERC20
const TOTAL_SUPPLY = "1000000";

// MockV3Aggregator
const AGGREGATOR_DECIMALS = "18";
const INITIAL_PRICE = "2";

async function deploySimpleERC20() {
  let SimpleERC20Factory = await ethers.getContractFactory("SimpleERC20");
  let SimpleERC20 = await SimpleERC20Factory.deploy(
    ethers.utils.parseEther(TOTAL_SUPPLY)
  );
  let SimpleERC20Address = SimpleERC20.address;
  return [SimpleERC20, SimpleERC20Address];
}

async function deployLending() {
  let LendingFactory = await ethers.getContractFactory("Lending");
  let Lending = await LendingFactory.deploy();
  let LendingAddress = Lending.address;
  return [Lending, LendingAddress];
}

async function deployMockV3Aggregator() {
  let MockV3AggregatorFactory = await ethers.getContractFactory(
    "MockV3Aggregator"
  );
  let MockV3Aggregator = await MockV3AggregatorFactory.deploy(
    AGGREGATOR_DECIMALS,
    INITIAL_PRICE
  );
  let MockV3AggregatorAddress = MockV3Aggregator.address;
  return [MockV3Aggregator, MockV3AggregatorAddress];
}

const main = async () => {
  // deploy er20
  let [SimpleERC20, SimpleERC20Address] = await deploySimpleERC20();
  console.log(`ERC20 address: ${SimpleERC20Address}`);
  // deploy lending
  let [Lending, LendingAddress] = await deployLending();
  console.log(`Lending address: ${LendingAddress}`);
  // deploy mock aggregator
  let [MockV3Aggregator, MockV3AggregatorAddress] =
    await deployMockV3Aggregator();
  console.log(`MockV3Aggregator address: ${MockV3AggregatorAddress}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
