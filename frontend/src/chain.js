import { createClient, chains } from "genlayer-js";

const CHAIN = chains.studionet;

let _readClient = null;
let _writeClient = null;
let _connectedAddress = null;

export function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: CHAIN });
  }
  return _readClient;
}

export function getWriteClient() {
  if (!_writeClient) throw new Error("Wallet not connected");
  return _writeClient;
}

export function getConnectedAddress() {
  return _connectedAddress;
}

export function isConnected() {
  return !!_connectedAddress;
}

// ── MetaMask connection ────────────────────────────────────────────────────

export async function connectMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected. Please install it from metamask.io");
  }

  // Add / switch to GenLayer Studio network so wallet simulates correctly
  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0xF22F",          // 61999 in hex
        chainName: "GenLayer Studio",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: ["https://studio.genlayer.com/api"],
        blockExplorerUrls: [],
      }],
    });
  } catch {
    // wallet may reject addChain but still allow signing — continue
  }

  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found in MetaMask");
  }

  _connectedAddress = accounts[0];
  _writeClient = createClient({ chain: CHAIN, provider: window.ethereum, account: _connectedAddress });

  window.ethereum.on("accountsChanged", (newAccounts) => {
    if (newAccounts.length === 0) {
      disconnect();
      window.dispatchEvent(new Event("wallet:disconnected"));
    } else {
      _connectedAddress = newAccounts[0];
      _writeClient = createClient({ chain: CHAIN, provider: window.ethereum, account: _connectedAddress });
      window.dispatchEvent(new CustomEvent("wallet:changed", { detail: newAccounts[0] }));
    }
  });

  return _connectedAddress;
}

export function disconnect() {
  _writeClient = null;
  _connectedAddress = null;
}
