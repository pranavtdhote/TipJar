require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { QUICKNODE_RPC, QUICKNODE_SEPOLIA_URL, SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;

const isValidPrivateKey = (key) => {
  return typeof key === "string" && /^0x[a-fA-F0-9]{64}$/.test(key);
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: QUICKNODE_RPC || QUICKNODE_SEPOLIA_URL || SEPOLIA_RPC_URL || "https://rpc.ankr.com/eth_sepolia",
      accounts: isValidPrivateKey(PRIVATE_KEY) ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "",
    },
  },
};

