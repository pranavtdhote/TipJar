import deployedContract from "./deployed-contract.json";

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  (deployedContract && deployedContract.address ? deployedContract.address : "0x5FbDB2315678afecb367f032d93F642f64180aa3");

export const READ_ONLY_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export const SEPOLIA_CHAIN_ID_DEC =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 11155111;
export const SEPOLIA_CHAIN_ID_HEX = `0x${SEPOLIA_CHAIN_ID_DEC.toString(16)}`;

export const MAX_MESSAGE_LENGTH = 280;

export const TIP_JAR_ABI = [
  "function owner() external view returns (address)",
  "function tip(string message) external payable",
  "function getTipsCount() external view returns (uint256)",
  "function getAllTips() external view returns (tuple(address sender, uint256 amount, string message, uint256 timestamp)[])",
  "function withdraw() external",
  "event NewTip(address indexed sender, uint256 amount, string message, uint256 timestamp)",
  "event Withdrawal(address indexed owner, uint256 amount)",
] as const;

export interface Tip {
  key: string;
  sender: string;
  amountEth: string;
  message: string;
  timestamp: number;
}
