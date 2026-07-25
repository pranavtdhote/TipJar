"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import {
  CONTRACT_ADDRESS as DEFAULT_CONTRACT_ADDRESS,
  MAX_MESSAGE_LENGTH,
  READ_ONLY_RPC_URL,
  SEPOLIA_CHAIN_ID_DEC,
  SEPOLIA_CHAIN_ID_HEX,
  TIP_JAR_ABI,
  Tip,
} from "@/lib/contract";
import ToastContainer, { Toast } from "./ToastContainer";
import SkeletonLoader from "./SkeletonLoader";
import EmptyState from "./EmptyState";
import SuccessModal from "./SuccessModal";
import EthDiamondCanvas from "./EthDiamondCanvas";

type StatusType = "idle" | "pending" | "success" | "error";

function short(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

async function isRpcReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export default function TipJar() {
  const [account, setAccount] = useState<string | null>(null);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>("0.00");
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState(DEFAULT_CONTRACT_ADDRESS);

  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [contractBalance, setContractBalance] = useState<string>("0.00");
  const [withdrawing, setWithdrawing] = useState(false);

  const [status, setStatus] = useState<{ text: string; type: StatusType; txHash?: string }>({
    text: "",
    type: "idle",
  });
  const [sending, setSending] = useState(false);
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // UI state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>(undefined);
  const [lastConfirmedAmount, setLastConfirmedAmount] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "highest">("newest");
  const [newsletterEmail, setNewsletterEmail] = useState("");

  const browserProviderRef = useRef<BrowserProvider | null>(null);
  const localhostAliveRef = useRef<boolean | null>(null);
  const feedSectionRef = useRef<HTMLDivElement>(null);

  // Toast Helper
  const addToast = (type: Toast["type"], title: string, message?: string, txHash?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message, txHash }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Suppress unhandled ethers internal promise rejections
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const msg = String(event.reason?.message || event.reason || "");
      if (
        msg.includes("could not coalesce error") ||
        msg.includes("Failed to fetch") ||
        msg.includes("UNKNOWN_ERROR") ||
        msg.includes("too many errors") ||
        msg.includes("eth_newFilter") ||
        msg.includes("SERVER_ERROR")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  // Load contract address override from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tipjar_contract_address");
        if (saved && saved.startsWith("0x") && saved.length === 42) {
          setContractAddress(saved);
          setAddressInput(saved);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const saveContractAddress = (newAddr: string) => {
    const trimmed = newAddr.trim();
    if (trimmed.startsWith("0x") && trimmed.length === 42) {
      setContractAddress(trimmed);
      setAddressInput(trimmed);
      setEditingAddress(false);
      setIsLoadingFeed(true);
      localhostAliveRef.current = null;
      try {
        localStorage.setItem("tipjar_contract_address", trimmed);
      } catch {
        // ignore
      }
      addToast("info", "Contract Updated", `Targeting address ${short(trimmed)}`);
    } else {
      addToast("error", "Invalid Address", "Address must be a valid 42-character hex string starting with 0x.");
    }
  };

  const isSupportedNetwork = useMemo(() => {
    if (!chainId) return true;
    return chainId === SEPOLIA_CHAIN_ID_DEC || chainId === 31337 || chainId === 1337;
  }, [chainId]);

  const isOwner = useMemo(() => {
    if (!account || !contractOwner) return false;
    return account.toLowerCase() === contractOwner.toLowerCase();
  }, [account, contractOwner]);

  // Read-only contract fetcher
  const fetchContractData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setIsLoadingFeed(true);

      const activeAddress = contractAddress || DEFAULT_CONTRACT_ADDRESS;
      const readProviders: JsonRpcProvider[] = [];

      if (activeAddress.toLowerCase().startsWith("0x5fb")) {
        if (localhostAliveRef.current === null) {
          localhostAliveRef.current = await isRpcReachable("http://127.0.0.1:8545");
        }
        if (localhostAliveRef.current) {
          readProviders.push(new JsonRpcProvider("http://127.0.0.1:8545"));
        }
      }

      readProviders.push(new JsonRpcProvider(READ_ONLY_RPC_URL));

      for (const provider of readProviders) {
        try {
          const contract = new Contract(activeAddress, TIP_JAR_ABI, provider);

          try {
            const ownerAddr = await contract.owner();
            setContractOwner(ownerAddr);
            const bal = await provider.getBalance(activeAddress);
            setContractBalance(parseFloat(formatEther(bal)).toFixed(4));
          } catch {
            // skip
          }

          let rawTips: any[] = [];
          try {
            rawTips = await contract.getAllTips();
          } catch {
            try {
              const count: bigint = await contract.getTipsCount();
              rawTips = [];
              for (let i = BigInt(0); i < count; i++) {
                rawTips.push(await contract.tips(i));
              }
            } catch {
              try {
                const events = await contract.queryFilter(
                  contract.filters.NewTip(),
                  -10000,
                  "latest"
                );
                rawTips = events.map((ev: any) => ev.args);
              } catch {
                rawTips = [];
              }
            }
          }

          if (Array.isArray(rawTips)) {
            const parsedTips: Tip[] = rawTips.map((t: any, idx: number) => ({
              key: `tip-${idx}-${(t[3] ?? t.timestamp ?? idx).toString()}`,
              sender: t[0] ?? t.sender,
              amountEth: formatEther(t[1] ?? t.amount),
              message: t[2] ?? t.message,
              timestamp: Number(t[3] ?? t.timestamp),
            }));

            setTips(parsedTips);
            setIsLoadingFeed(false);
            return;
          }
        } catch {
          // try next
        }
      }
      setIsLoadingFeed(false);
    },
    [contractAddress]
  );

  // Background polling every 5 seconds
  useEffect(() => {
    fetchContractData(true);
    const interval = setInterval(() => {
      fetchContractData(false).catch(() => { });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchContractData]);

  // Wallet event listeners
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const reload = () => window.location.reload();
    window.ethereum.on("accountsChanged", reload);
    window.ethereum.on("chainChanged", reload);
    return () => {
      window.ethereum?.removeListener("accountsChanged", reload);
      window.ethereum?.removeListener("chainChanged", reload);
    };
  }, []);

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setStatus({ text: "No MetaMask wallet found in browser.", type: "error" });
      addToast("error", "No MetaMask Found", "Please install MetaMask extension in your browser.");
      return;
    }
    setConnecting(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      browserProviderRef.current = provider;
      const accounts = (await provider.send("eth_requestAccounts", [])) as string[];
      setAccount(accounts[0]);

      try {
        const bal = await provider.getBalance(accounts[0]);
        setUserBalance(parseFloat(formatEther(bal)).toFixed(2));
      } catch {
        setUserBalance("0.00");
      }

      try {
        const name = await provider.lookupAddress(accounts[0]);
        if (name) setEnsName(name);
      } catch {
        setEnsName(null);
      }

      const network = await provider.getNetwork();
      setChainId(Number(network.chainId));
      setStatus({ text: "", type: "idle" });
      addToast("success", "Wallet Connected", `Connected to ${short(accounts[0])}`);
      await fetchContractData(false);
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 4001) {
        setStatus({ text: "Wallet connection was rejected.", type: "error" });
        addToast("error", "Connection Rejected", "User rejected wallet connection request.");
      } else {
        setStatus({ text: "Failed to connect wallet.", type: "error" });
        addToast("error", "Connection Failed", "Could not establish connection to wallet.");
      }
    } finally {
      setConnecting(false);
    }
  }, [fetchContractData]);

  const switchToSepolia = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
      setChainId(SEPOLIA_CHAIN_ID_DEC);
      addToast("info", "Network Switched", "Switched network to Ethereum Sepolia.");
    } catch (err: unknown) {
      const e = err as { code?: number };
      if (e.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID_HEX,
                chainName: "Sepolia",
                nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: [READ_ONLY_RPC_URL],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
          addToast("success", "Network Added", "Sepolia network added to wallet.");
        } catch {
          setStatus({ text: "Could not add Sepolia network to your wallet.", type: "error" });
          addToast("error", "Network Error", "Could not add Sepolia network.");
        }
      } else if (e.code === 4001) {
        setStatus({ text: "Network switch was rejected.", type: "error" });
        addToast("error", "Switch Rejected", "Network switch request was rejected.");
      } else {
        setStatus({ text: "Could not switch network.", type: "error" });
      }
    }
  }, []);

  const sendTip = useCallback(async () => {
    if (!account || !browserProviderRef.current) {
      setStatus({ text: "Connect your wallet first.", type: "error" });
      addToast("error", "Wallet Not Connected", "Please connect MetaMask before sending a tip.");
      return;
    }
    const provider = browserProviderRef.current;
    const activeAddress = contractAddress || DEFAULT_CONTRACT_ADDRESS;
    const trimmedAmount = amount.trim();
    const trimmedMessage = message.trim();

    if (!trimmedAmount || Number(trimmedAmount) <= 0) {
      setStatus({ text: "Enter an amount greater than 0 ETH.", type: "error" });
      addToast("error", "Invalid Amount", "Tip amount must be greater than 0 ETH.");
      return;
    }
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setStatus({ text: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`, type: "error" });
      addToast("error", "Message Too Long", `Maximum message length is ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    try {
      setSending(true);
      setStatus({ text: "Confirm transaction in MetaMask…", type: "pending" });
      addToast("pending", "Wallet Action Required", "Please confirm transaction in MetaMask.");
      const signer = await provider.getSigner();
      const writeContract = new Contract(activeAddress, TIP_JAR_ABI, signer);
      const tx = await writeContract.tip(trimmedMessage, { value: parseEther(trimmedAmount) });

      setStatus({ text: "Transaction broadcasted to mempool. Waiting for block validation…", type: "pending", txHash: tx.hash });
      addToast("pending", "Tx Broadcasted", "Transaction submitted to Ethereum mempool…", tx.hash);

      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        setStatus({ text: "Tip permanently confirmed on-chain! Thank you for your support 🎉", type: "success", txHash: tx.hash });
        addToast("success", "Tip Confirmed!", `Your ${trimmedAmount} ETH tip is recorded on-chain.`, tx.hash);
        setLastTxHash(tx.hash);
        setLastConfirmedAmount(`${trimmedAmount} ETH`);
        setShowSuccessModal(true);
        setAmount("");
        setMessage("");

        // Refresh balance
        try {
          const bal = await provider.getBalance(account);
          setUserBalance(parseFloat(formatEther(bal)).toFixed(2));
        } catch {
          // ignore
        }

        await fetchContractData(false);
      } else {
        setStatus({ text: "Transaction failed on-chain.", type: "error" });
        addToast("error", "Transaction Failed", "The transaction reverted on-chain.");
      }
    } catch (err: unknown) {
      const e = err as { code?: string | number; shortMessage?: string };
      if (e.code === "ACTION_REJECTED" || e.code === 4001) {
        setStatus({ text: "Transaction rejected in wallet.", type: "error" });
        addToast("error", "Rejected", "Transaction was rejected in wallet.");
      } else if (e.code === "INSUFFICIENT_FUNDS") {
        setStatus({ text: "Insufficient funds in your wallet for tip + gas.", type: "error" });
        addToast("error", "Insufficient Funds", "Your ETH balance is too low for this tip + gas fee.");
      } else {
        setStatus({ text: e.shortMessage || "Transaction failed. Please try again.", type: "error" });
        addToast("error", "Error", e.shortMessage || "Transaction failed.");
      }
    } finally {
      setSending(false);
    }
  }, [account, amount, message, contractAddress, fetchContractData]);

  const withdrawFunds = useCallback(async () => {
    if (!account || !browserProviderRef.current || !isOwner) return;
    const provider = browserProviderRef.current;
    const activeAddress = contractAddress || DEFAULT_CONTRACT_ADDRESS;

    try {
      setWithdrawing(true);
      setStatus({ text: "Confirm owner withdrawal in wallet…", type: "pending" });
      addToast("pending", "Owner Withdrawal", "Confirm vault withdrawal in MetaMask.");
      const signer = await provider.getSigner();
      const writeContract = new Contract(activeAddress, TIP_JAR_ABI, signer);
      const tx = await writeContract.withdraw();
      setStatus({ text: "Withdrawal broadcasted. Waiting for block validation…", type: "pending", txHash: tx.hash });
      addToast("pending", "Withdrawal Broadcasted", "Processing vault withdrawal on-chain…", tx.hash);
      const receipt = await tx.wait();
      if (receipt && receipt.status === 1) {
        setStatus({ text: "Vault balance withdrawn successfully to owner address! 💰", type: "success", txHash: tx.hash });
        addToast("success", "Withdrawal Successful", "Vault balance transferred to creator wallet.", tx.hash);
        await fetchContractData(false);
      } else {
        setStatus({ text: "Withdrawal failed on-chain.", type: "error" });
        addToast("error", "Withdrawal Failed", "Transaction reverted on-chain.");
      }
    } catch (err: any) {
      setStatus({ text: err.shortMessage || "Withdrawal failed.", type: "error" });
      addToast("error", "Withdrawal Failed", err.shortMessage || "Action cancelled.");
    } finally {
      setWithdrawing(false);
    }
  }, [account, isOwner, contractAddress, fetchContractData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    addToast("info", "Copied", `${label} copied to clipboard!`);
  };

  const scrollToFeed = () => {
    feedSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Filtered & Sorted Feed
  const filteredTips = useMemo(() => {
    let result = [...tips];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) => t.sender.toLowerCase().includes(q) || t.message.toLowerCase().includes(q)
      );
    }
    if (sortBy === "highest") {
      result.sort((a, b) => Number(b.amountEth) - Number(a.amountEth));
    } else {
      result.sort((a, b) => b.timestamp - a.timestamp);
    }
    return result;
  }, [tips, searchQuery, sortBy]);

  const totalVolumeEth = useMemo(() => {
    return tips.reduce((acc, curr) => acc + Number(curr.amountEth), 0).toFixed(2);
  }, [tips]);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes("@")) {
      addToast("error", "Invalid Email", "Please enter a valid email address.");
      return;
    }
    addToast("success", "Subscribed!", "You're subscribed to TipJar Protocol updates.");
    setNewsletterEmail("");
  };

  return (
    <div className="relative min-h-screen bg-background text-on-surface">
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          txHash={lastTxHash}
          amount={lastConfirmedAmount}
          isSepolia={chainId === SEPOLIA_CHAIN_ID_DEC}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#0a1612]/70 backdrop-blur-xl border-b border-[#b4d177]/15 shadow-[0_0_20px_rgba(180,209,119,0.05)]">
        <div className="flex justify-between items-center px-6 md:px-16 py-4 w-full max-w-[1440px] mx-auto">
          <div className="font-label-mono text-2xl font-black tracking-tighter text-[#d8e5df] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#b4d177] shadow-[0_0_10px_#ddfb9c]" />
            TipJar
          </div>
          <nav className="hidden md:flex items-center gap-10">
            <a className="text-[#ffb783] border-b-2 border-[#ffb783] pb-1 font-medium text-sm" href="#features">Features</a>
            <a className="text-[#a7c36a] hover:text-[#ffb783] transition-colors font-medium text-sm" onClick={scrollToFeed} style={{ cursor: "pointer" }}>Supporters</a>
            <a className="text-[#a7c36a] hover:text-[#ffb783] transition-colors font-medium text-sm" href="#protocol">Protocol</a>
            <a className="text-[#a7c36a] hover:text-[#ffb783] transition-colors font-medium text-sm" href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer">Audits</a>
          </nav>
          <button
            className="btn-metamask"
            onClick={connectWallet}
            disabled={connecting || !!account}
          >
            {account ? short(account) : connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="min-h-screen pt-32 px-6 md:px-16 flex flex-col md:flex-row items-center max-w-[1440px] mx-auto gap-12">
          <div className="flex-1 animate-fade-in-up">
            <span className="font-label-mono text-xs text-[#b4d177] mb-6 block uppercase tracking-[0.2em]">
              Web3 Creator Economy
            </span>
            <h1 className="font-extrabold text-4xl md:text-6xl text-[#d8e5df] mb-8 leading-[1.1] tracking-tight">
              Support Creators.<br />
              <span className="text-[#ffb783]">Own Every Contribution.</span>
            </h1>
            <p className="text-lg text-[#9eb3aa] max-w-xl mb-12 leading-relaxed">
              Transparent Ethereum recording for every tip. No middleman. No hidden fees.
              Just direct support between fans and the creators they love.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                className="btn-metamask text-lg"
                onClick={connectWallet}
                disabled={connecting || !!account}
              >
                {account ? "Wallet Connected ✓" : "Connect Wallet 🦊"}
              </button>
              <button
                className="btn-outline-lime text-lg"
                onClick={scrollToFeed}
              >
                View Live Supporters ↗
              </button>
            </div>
          </div>

          {/* 3D Interactive Three.js Ethereum Diamond */}
          <div className="flex-1 w-full h-[500px] md:h-[600px] relative">
            <EthDiamondCanvas />
          </div>
        </section>

        {/* Contract Config Bar */}
        <section className="px-6 md:px-16 max-w-[1440px] mx-auto mb-8">
          <div className="glass-card p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-label-mono text-xs text-[#a7c36a]">SMART CONTRACT:</span>
              <button
                className="font-label-mono text-xs text-[#b4d177] hover:underline"
                onClick={() => copyToClipboard(contractAddress, "Contract address")}
              >
                {short(contractAddress)} 📋
              </button>
            </div>
            <button
              className="btn-outline-lime text-xs py-2 px-4"
              onClick={() => setEditingAddress(!editingAddress)}
            >
              {editingAddress ? "Close Edit" : "Change Contract Address"}
            </button>
          </div>

          {editingAddress && (
            <div className="glass-card p-6 mt-4 animate-fade-in-up">
              <label className="font-label-mono text-xs text-[#b4d177] block mb-2">TARGET DEPLOYED SMART CONTRACT</label>
              <div className="flex gap-4">
                <input
                  className="cinematic-input flex-1"
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="0x..."
                />
                <button
                  className="btn-metamask text-xs"
                  onClick={() => saveContractAddress(addressInput)}
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Creator Admin Panel (if Owner) */}
        {isOwner && (
          <section className="px-6 md:px-16 max-w-[1440px] mx-auto mb-8">
            <div className="glass-card p-6 border-l-4 border-l-[#ffb783] bg-[#072E2A]/70">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <div className="font-label-mono text-xs text-[#ffb783] uppercase tracking-widest">
                    👑 Creator Vault Admin
                  </div>
                  <div className="font-label-mono text-xl text-[#d8e5df] mt-1">
                    Contract Vault Balance: <span className="text-[#b4d177]">{contractBalance} ETH</span>
                  </div>
                </div>
                <button
                  className="btn-metamask"
                  onClick={withdrawFunds}
                  disabled={withdrawing || Number(contractBalance) <= 0}
                >
                  {withdrawing ? "Withdrawing…" : "Withdraw Vault Balance 💰"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Wallet & Send Tip Section */}
        <section className="px-6 md:px-16 max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 py-8">
          {/* Glassmorphic Wallet Card */}
          <div className="glass-card p-8 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 right-0 p-4 font-label-mono text-[10px] text-[#b4d177]/60">
              NETWORK: {chainId === SEPOLIA_CHAIN_ID_DEC ? "ETHEREUM SEPOLIA" : `CHAIN ID ${chainId || "31337"}`}
            </div>

            <div className="mb-8">
              <h3 className="font-label-mono text-[10px] text-[#b4d177] mb-1 uppercase tracking-widest">Connected Wallet</h3>
              <div className="font-label-mono text-2xl md:text-3xl text-[#d8e5df] truncate flex items-center gap-2">
                <span>{account ? (ensName ? `${ensName} (${short(account)})` : short(account)) : "Not Connected"}</span>
                {account && (
                  <button
                    onClick={() => copyToClipboard(account, "Wallet address")}
                    className="text-xs text-[#b4d177] hover:opacity-80"
                    title="Copy Address"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-12 mb-8">
              <div>
                <div className="font-label-mono text-[10px] text-[#9eb3aa] mb-1">YOUR BALANCE</div>
                <div className="font-label-mono text-xl text-[#b4d177]">{userBalance} ETH</div>
              </div>
              <div className="border-l border-[#b4d177]/15 pl-12">
                <div className="font-label-mono text-[10px] text-[#9eb3aa] mb-1">TOTAL TIPPED (ALL)</div>
                <div className="font-label-mono text-xl text-[#d8e5df]">{totalVolumeEth} ETH</div>
              </div>
            </div>

            <div className="border-t border-[#b4d177]/15 pt-6 flex items-center justify-between">
              <span className="text-sm text-[#9eb3aa]">
                {account ? "Identity verified via MetaMask / ENS" : "Click Connect Wallet to start tipping"}
              </span>
              <div className={`w-3 h-3 rounded-full ${account ? "bg-[#b4d177] shadow-[0_0_10px_#ddfb9c]" : "bg-gray-500"}`} />
            </div>

            {!isSupportedNetwork && account && (
              <div className="mt-4 pt-4 border-t border-[#b4d177]/15 flex justify-between items-center">
                <span className="text-xs text-[#ffb4ab]">Wrong Network</span>
                <button className="btn-outline-lime text-xs py-1 px-3" onClick={switchToSepolia}>
                  Switch to Sepolia Network
                </button>
              </div>
            )}
          </div>

          {/* Send Tip Section */}
          <div className="glass-card p-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="font-label-mono text-[10px] text-[#b4d177] mb-6 uppercase tracking-widest">Send a Tip</h3>

            <div className="space-y-4 mb-6">
              <div className="relative">
                <input
                  className="cinematic-input text-2xl font-bold pr-16"
                  placeholder="0.00"
                  type="number"
                  min="0"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-label-mono text-xs text-[#b4d177]">
                  ETH
                </span>
              </div>

              {/* Preset Chips */}
              <div className="flex gap-2">
                {["0.001", "0.005", "0.01", "0.05"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`preset-chip flex-1 ${amount === preset ? "active" : ""}`}
                    onClick={() => setAmount(preset)}
                  >
                    {preset} ETH
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  className="cinematic-textarea h-24"
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Message (optional) — Recorded permanently on-chain"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div className="font-label-mono text-[10px] text-[#9eb3aa] text-right mt-1">
                  {message.length}/{MAX_MESSAGE_LENGTH}
                </div>
              </div>
            </div>

            <button
              className="btn-metamask w-full py-4 text-sm"
              onClick={sendTip}
              disabled={sending || !account || !isSupportedNetwork}
            >
              {sending ? (
                <>
                  <div className="spinner" />
                  <span>Confirming Transaction…</span>
                </>
              ) : (
                "Confirm Transaction ⚡"
              )}
            </button>

            {/* Compact Transaction Timeline */}
            <div className="mt-6 flex items-center gap-6">
              <div className={`flex items-center gap-2 ${status.type === "pending" ? "animate-pulse" : ""}`}>
                <div className={`w-2 h-2 rounded-full ${sending ? "bg-[#f6851b]" : "bg-[#b4d177]"}`} />
                <div className="font-label-mono text-[10px] text-[#9eb3aa]">
                  {sending ? "Mempool Ingestion" : "Ready"}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-2 h-2 rounded-full bg-[#b4d177]" />
                <div className="font-label-mono text-[10px] text-[#9eb3aa]">On-Chain Record</div>
              </div>
            </div>

            {status.text && (
              <div className={`mt-4 p-3 rounded text-xs font-label-mono ${status.type === "error" ? "bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/30" : status.type === "success" ? "bg-[#b4d177]/10 text-[#b4d177] border border-[#b4d177]/30" : "bg-[#f6851b]/10 text-[#ffb783] border border-[#f6851b]/30"}`}>
                <div>{status.text}</div>
                {status.txHash && (
                  <div className="mt-1 text-[10px] opacity-80 word-break-all">
                    Tx: {status.txHash}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Live Supporter Feed */}
        <section ref={feedSectionRef} className="py-20 px-6 md:px-16 bg-[#06100d]/50 relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="font-extrabold text-3xl md:text-5xl text-[#d8e5df] mb-4">
                  Live Supporter Feed
                </h2>
                <p className="text-lg text-[#9eb3aa]">
                  Immutable records of appreciation from across the globe.
                </p>
              </div>

              <div className="font-label-mono text-xs text-[#b4d177] border border-[#b4d177]/20 px-6 py-3 flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 rounded-full bg-[#b4d177]" />
                {tips.length} ACTIVE CONTRIBUTORS
              </div>
            </div>

            {/* Filter & Search Bar */}
            {tips.length > 0 && (
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <input
                  className="cinematic-input text-xs flex-1"
                  type="text"
                  placeholder="Filter supporters by address or message…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                  className="cinematic-input text-xs w-full md:w-48 cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "newest" | "highest")}
                >
                  <option value="newest">Newest First</option>
                  <option value="highest">Highest Tip</option>
                </select>
              </div>
            )}

            <div>
              {isLoadingFeed ? (
                <SkeletonLoader count={3} />
              ) : filteredTips.length === 0 ? (
                <EmptyState onActionClick={() => {
                  const input = document.querySelector<HTMLInputElement>("input[type='number']");
                  input?.focus();
                }} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTips.map((t) => {
                    const isTopTip = Number(t.amountEth) >= 0.05;
                    return (
                      <div
                        key={t.key}
                        className={`glass-card p-6 hover:scale-[1.02] transition-all ${isTopTip ? "border-l-4 border-l-[#ffb783]" : ""}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3 items-center">
                            <div className="w-10 h-10 bg-[#b4d177]/10 flex items-center justify-center rounded">
                              <span className="material-symbols-outlined text-[#b4d177]">
                                {isTopTip ? "verified" : "person"}
                              </span>
                            </div>
                            <div>
                              <button
                                className="font-label-mono text-xs text-[#d8e5df] hover:underline block text-left"
                                onClick={() => copyToClipboard(t.sender, "Supporter address")}
                              >
                                {short(t.sender)} 📋
                              </button>
                              <div className="font-label-mono text-[10px] text-[#9eb3aa]">
                                {t.timestamp > 0 ? new Date(t.timestamp * 1000).toLocaleTimeString() : "JUST NOW"}
                              </div>
                            </div>
                          </div>
                          <div className="font-label-mono text-xl font-bold text-[#b4d177]">
                            {t.amountEth} ETH
                          </div>
                        </div>

                        {t.message ? (
                          <p className="text-sm text-[#9eb3aa] leading-relaxed italic">
                            &ldquo;{t.message}&rdquo;
                          </p>
                        ) : (
                          <p className="text-xs text-[#9eb3aa]/50 italic">No note attached</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section id="features" className="py-24 px-6 md:px-16 max-w-[1440px] mx-auto">
          <h2 className="font-extrabold text-3xl md:text-5xl text-[#d8e5df] mb-16 text-center">
            Built for Scale &amp; Security
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-card p-8 hover-glow">
              <span className="material-symbols-outlined text-4xl text-[#b4d177] mb-4">shield</span>
              <h3 className="font-label-mono text-lg text-[#d8e5df] mb-2 uppercase">Secure Transactions</h3>
              <p className="text-sm text-[#9eb3aa]">Military-grade smart contract architecture audited for maximum EVM execution safety.</p>
            </div>

            <div className="glass-card p-8 hover-glow">
              <span className="material-symbols-outlined text-4xl text-[#b4d177] mb-4">save_as</span>
              <h3 className="font-label-mono text-lg text-[#d8e5df] mb-2 uppercase">Direct-to-Wallet</h3>
              <p className="text-sm text-[#9eb3aa]">No platform custody. Funds flow directly into your creator Ethereum address instantly.</p>
            </div>

            <div className="glass-card p-8 hover-glow">
              <span className="material-symbols-outlined text-4xl text-[#b4d177] mb-4">cloud</span>
              <h3 className="font-label-mono text-lg text-[#d8e5df] mb-2 uppercase">On-Chain Permanence</h3>
              <p className="text-sm text-[#9eb3aa]">All messages and tip metadata stored permanently on the Ethereum blockchain network.</p>
            </div>

            <div className="glass-card p-8 hover-glow">
              <span className="material-symbols-outlined text-4xl text-[#b4d177] mb-4">monitoring</span>
              <h3 className="font-label-mono text-lg text-[#d8e5df] mb-2 uppercase">Real-time Audits</h3>
              <p className="text-sm text-[#9eb3aa]">Every tip is verifiable on Etherscan within seconds of block confirmation.</p>
            </div>

            <div className="glass-card p-8 hover-glow">
              <span className="material-symbols-outlined text-4xl text-[#b4d177] mb-4">payments</span>
              <h3 className="font-label-mono text-lg text-[#d8e5df] mb-2 uppercase">Zero Commission</h3>
              <p className="text-sm text-[#9eb3aa]">We take 0% of your earnings. The only cost is standard network gas fees.</p>
            </div>

            <div className="glass-card p-8 hover-glow">
              <span className="material-symbols-outlined text-4xl text-[#b4d177] mb-4">hub</span>
              <h3 className="font-label-mono text-lg text-[#d8e5df] mb-2 uppercase">Global Reach</h3>
              <p className="text-sm text-[#9eb3aa]">Connect with supporters from any corner of the world without traditional banking borders.</p>
            </div>
          </div>
        </section>

        {/* Protocol Workflow: Cinematic Stepper */}
        <section id="protocol" className="py-24 px-6 md:px-16 bg-[#121e1a]/30 overflow-hidden">
          <div className="max-w-[1440px] mx-auto">
            <h2 className="font-extrabold text-3xl md:text-5xl text-[#d8e5df] mb-20 text-center">
              Protocol Workflow
            </h2>

            <div className="relative space-y-20">
              {/* Step 1 */}
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1 lg:text-right">
                  <h3 className="font-label-mono text-xl text-[#b4d177] mb-2">Step 01</h3>
                  <h4 className="font-extrabold text-2xl text-[#d8e5df] mb-4 uppercase">Connect &amp; Identity</h4>
                  <p className="text-[#9eb3aa] text-base">Link your MetaMask wallet. TipJar reads ENS records to populate public supporter identity instantly.</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#b4d177] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(180,209,119,0.4)]">
                  <span className="material-symbols-outlined text-[#0a1612] font-bold">link</span>
                </div>
                <div className="flex-1 w-full h-56 glass-card overflow-hidden">
                  <img className="w-full h-full object-cover grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700" alt="Connect" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCz7kJBl7L8jCf1c8-5klOcSyV3_aiu98J532Ot46gtfpA6BFO35wcvNDymurENMp2OqcUdn5u2sjN0RSr9NLXhTrr_C37sJ8sxcLGwQ0Mw_36DgMXkfQE8fVRh5AJvnwAr4oIJgVVCSnIOVpy0NKeNb5C6Wgss2I6ovtt9OMG7rOVSfgnGQBV_4jGkxTp-Lifw68GtA_ZlQuP1f2aIIbS2l9scBsvus97VNu22GmJ4m6KsrBP2DtgnjcnIaw48PS22BFWPNvYx0PA" />
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col lg:flex-row-reverse items-center gap-12">
                <div className="flex-1">
                  <h3 className="font-label-mono text-xl text-[#ffb783] mb-2">Step 02</h3>
                  <h4 className="font-extrabold text-2xl text-[#d8e5df] mb-4 uppercase">Configure Treasury</h4>
                  <p className="text-[#9eb3aa] text-base">Select custom tip presets or specify exact ETH contributions with encrypted optional notes.</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#f6851b] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(246,133,27,0.4)]">
                  <span className="material-symbols-outlined text-white font-bold">settings_input_component</span>
                </div>
                <div className="flex-1 w-full h-56 glass-card overflow-hidden">
                  <img className="w-full h-full object-cover grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700" alt="Configure" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_jZli71qpZ8pDWmAW1GgmGjponTZbeZKbO3gW0UcgN94kuCEpRjAzm1E1pVFlR506Eklcif-B7PYlhrdRtK3vJE_wdUNgID1G-ja4fZQlW0cHzi8FBedENC6eMvFDaJ7U-BnwwthcjW23lSxoz0TE6FZvKiygLhCrHnTHWafykS1eRQyUAMjAVBnZ7V7tVzAun-USMHEjW0SqQCDQnzEmmvix1MLNATdPbvCPc8WXr8mQKo6y306-wDvVT8Uw5GUIYNa_zERw8j0" />
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col lg:flex-row items-center gap-12">
                <div className="flex-1 lg:text-right">
                  <h3 className="font-label-mono text-xl text-[#b4d177] mb-2">Step 03</h3>
                  <h4 className="font-extrabold text-2xl text-[#d8e5df] mb-4 uppercase">Share &amp; Receive</h4>
                  <p className="text-[#9eb3aa] text-base">Watch as real-time supporter events update the decentralized thank-you wall live on-chain.</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-[#b4d177] flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(180,209,119,0.4)]">
                  <span className="material-symbols-outlined text-[#0a1612] font-bold">rocket_launch</span>
                </div>
                <div className="flex-1 w-full h-56 glass-card overflow-hidden">
                  <img className="w-full h-full object-cover grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-700" alt="Share" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLqucn_l-q69yH-8Kvk2xt8KT8zhrqn-TE8S87fc0AR1Hxwhp3LLEe_h2sR7rd9QLnxXFa4B4MNDbCIXiFH8sEH8FW60EJDikps3OzoZMD3TvQX1o-fQ63lRLnxoPRG_RPdYi1tLl0qJSC1wvyORI0jdSBNuIirN4WYrjDX7_Q9oN58b4Z4QDcCjT_W2W4CdP8xU1YuQ3OJMYbc0cxzMTlGL3DFttdGK2uni1A4irwlL0TYXnIeynVtBNZzxxJm198CoLli5d99zE" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#06100d] w-full py-16 px-6 md:px-16 border-t border-[#b4d177]/15 mt-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1440px] mx-auto">
          <div className="flex flex-col gap-4">
            <div className="font-label-mono text-sm text-[#ffb783] uppercase tracking-widest">TIPJAR PROTOCOL</div>
            <p className="text-sm text-[#9eb3aa]">Building infrastructure for the next generation of sovereign web3 creators.</p>
            <div className="text-xs text-[#b4d177] font-label-mono mt-2">© 2026 TipJar Protocol. Securely cinematic.</div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-label-mono text-xs text-[#d8e5df] uppercase mb-2">Protocol</div>
            <a className="text-sm text-[#9eb3aa] hover:text-[#b4d177] transition-all" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a className="text-sm text-[#9eb3aa] hover:text-[#b4d177] transition-all" href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer">Security Audits</a>
            <a className="text-sm text-[#9eb3aa] hover:text-[#b4d177] transition-all" href="#">Documentation</a>
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-label-mono text-xs text-[#d8e5df] uppercase mb-2">Network</div>
            <span className="text-sm text-[#9eb3aa]">Deployed: Ethereum Sepolia</span>
            <span className="text-sm text-[#9eb3aa]">Local: Hardhat Node (8545)</span>
            <span className="text-sm text-[#9eb3aa]">Challenge: MetaMask Pune</span>
          </div>

          <div className="flex flex-col gap-3">
            <div className="font-label-mono text-xs text-[#d8e5df] uppercase mb-1">Newsletter</div>
            <form onSubmit={handleNewsletterSubmit} className="flex border border-[#b4d177]/20 p-1 bg-[#072E2A]">
              <input
                className="bg-transparent border-none outline-none text-xs text-[#d8e5df] px-2 flex-1"
                placeholder="Email address"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
              />
              <button type="submit" className="bg-[#b4d177] text-[#0a1612] px-3 py-1 font-label-mono text-xs font-bold uppercase">
                Join
              </button>
            </form>
          </div>
        </div>
      </footer>
    </div>
  );
}
