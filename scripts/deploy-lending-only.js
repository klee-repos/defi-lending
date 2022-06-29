const { ethers } = require("hardhat");
require("dotenv").config;

async function deployLending() {
  let LendingFactory = await ethers.getContractFactory("Lending");
  let Lending = await LendingFactory.deploy();
  let LendingAddress = Lending.address;
  return [Lending, LendingAddress];
}

const main = async () => {
  // deploy lending
  let [Lending, LendingAddress] = await deployLending();
  console.log(`Lending address: ${LendingAddress}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
