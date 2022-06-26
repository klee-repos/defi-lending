const { ethers } = require("hardhat");
require("dotenv").config;

const { WALLET_ADDRESS } = process.env;
const TOTAL_SUPPLY = "1000000";

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

const main = async () => {
  let [SimpleERC20, SimpleERC20Address] = await deploySimpleERC20();
  console.log(`ERC20 address: ${SimpleERC20Address}`);
  let [Lending, LendingAddress] = await deployLending();
  console.log(`Lending address: ${LendingAddress}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
