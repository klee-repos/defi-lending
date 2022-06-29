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

const main = async () => {
  // deploy er20
  let [SimpleERC20, SimpleERC20Address] = await deploySimpleERC20();
  console.log(`ERC20 address: ${SimpleERC20Address}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
