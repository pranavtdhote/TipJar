# 💧 TipJar — On-Chain Decentralized Thank-You Wall

A production-ready Web3 Tip Jar and live supporter wall built for the **MetaMask Community Builder Challenge Pune** (Problem: *The Thank-You Wall*). 

TipJar enables creators, developers, and artists to receive direct ETH tips with attached public thank-you notes recorded 100% on-chain. There are zero middleman platforms, zero hidden fees, and zero off-chain database dependencies — every tip and supporter record is fetched directly from smart contract events and state.

---

## 🌟 Live Deployment Summary

| Parameter | Details |
|---|---|
| **Target EVM Network** | Ethereum Sepolia Testnet (Chain ID `11155111`) / Localnet |
| **Smart Contract Address** | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| **Sepolia Etherscan Explorer** | [View on Etherscan](https://sepolia.etherscan.io/address/0x5FbDB2315678afecb367f032d93F642f64180aa3) |
| **Frontend Framework** | Next.js 14 (App Router) + Ethers.js v6 + Glassmorphism Styling |
| **Production Build Status** | `✓ Compiled successfully` (0 Linting & Typecheck Warnings) |

---

## 🚀 Key Features & Architecture

1. **MetaMask & Network Detection**:
   - Detects connected account and current chain ID.
   - One-click network switching to Ethereum Sepolia with programmatic chain addition (`wallet_addEthereumChain`).
   - Shortened wallet address display with automatic ENS resolution (`lookupAddress`).

2. **On-Chain Tip Execution & Validation**:
   - Preset buttons (`0.001 ETH`, `0.005 ETH`, `0.01 ETH`, `0.05 ETH`) + custom ETH input.
   - Message input with client-side & contract-enforced limit (`<= 280` characters).
   - Custom Solidity error handling (`InvalidAmount`, `MessageTooLong`, `NotOwner`, `NothingToWithdraw`).

3. **Real-Time Supporter Feed ("The Thank-You Wall")**:
   - Sourced **100% directly on-chain** using `contract.getAllTips()` storage retrieval and `NewTip` event query fallback.
   - Multi-RPC fallback cascade (`BrowserProvider` -> MetaMask RPC -> Local Node -> QuickNode/Public RPC).
   - Real-time 3-second polling & instant post-transaction updates.

4. **Creator Admin Panel (Owner Withdrawal)**:
   - Queries `contract.owner()` and compares against connected address.
   - Displays real-time vault balance.
   - Allows creator to execute `withdraw()` to transfer all accumulated tips to their owner wallet.

---

## 📁 Repository Structure

```
├── contracts/
│   └── TipJar.sol               # Optimized Solidity Smart Contract (0.8.24)
├── scripts/
│   ├── deploy.js                # Hardhat deployment & JSON artifact exporter
│   └── seed_tips.js             # Local seeding utility script
├── test/
│   └── TipJar.test.js           # Full Hardhat unit test suite (6/6 passing)
├── frontend-nextjs/
│   ├── app/
│   │   ├── globals.css          # Premium glassmorphism design system
│   │   ├── layout.tsx           # SEO Metadata & OpenGraph tags
│   │   └── page.tsx             # Root page entry
│   ├── components/
│   │   └── TipJar.tsx           # Primary Web3 application component
│   └── lib/
│       ├── contract.ts          # Contract constants & ABI definitions
│       └── deployed-contract.json # Exported deployment metadata
├── hardhat.config.js            # Hardhat network & compiler configuration
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

---

## ⚙️ Quick Start & Local Setup

### 1. Installation

```bash
git clone <repository-url>
cd DApp
npm install
cd frontend-nextjs && npm install && cd ..
```

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
QUICKNODE_SEPOLIA_URL=https://your-endpoint.ethereum-sepolia.quiknode.pro/your-token/
PRIVATE_KEY=0xyour_burner_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Compile and Run Unit Tests

```bash
npx hardhat compile
npx hardhat test
```

### 4. Deploy Smart Contract

To Ethereum Sepolia:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

To Local Hardhat Node:
```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### 5. Launch Frontend Application

```bash
cd frontend-nextjs
npm run typecheck
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3004](http://localhost:3004) in your browser.

---

## 🔐 Security & Optimization

- **Custom Solidity Errors**: Uses cheap custom revert selectors (`InvalidAmount`, `NotOwner`) saving ~2100 gas per revert compared to string errors.
- **Immutable Owner & Reentrancy Safety**: Owner set immutably upon contract construction; balance state updated prior to transfer execution.
- **No Private Keys in Frontend**: Wallet signing is strictly handled client-side via MetaMask provider (`getSigner()`).

---

## 📜 License

MIT License. Built with ❤️ for Web3 Creators.
