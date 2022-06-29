const { ethers } = require("hardhat");
require("dotenv").config;

const { RPC_SERVER, PRIVATE_KEY } = process.env;
const ETH_TO_SEND = "10";
const RECEIVER_ADDRESS = "0x687b2a6fdC3C3103533b805648276F61CfABA849";

const main = async () => {
  let provider = new ethers.providers.JsonRpcProvider(RPC_SERVER);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(wallet);
  let sendEthTx = {
    to: RECEIVER_ADDRESS,
    value: ethers.utils.parseEther(ETH_TO_SEND),
  };
  let tx = await wallet.sendTransaction(sendEthTx);
  let txReceipt = await tx.wait();
  console.log(txReceipt);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });
