// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — genlayer-js has no bundled TS declarations
import { createClient, chains } from "genlayer-js";

const CHAIN = chains.studionet;

let _readClient: ReturnType<typeof createClient> | null = null;
let _writeClient: ReturnType<typeof createClient> | null = null;
let _connectedAddress: string | null = null;

export function getReadClient() {
  if (!_readClient) {
    _readClient = createClient({ chain: CHAIN });
  }
  return _readClient!;
}

export function getWriteClient() {
  if (!_writeClient) throw new Error("Wallet not connected");
  return _writeClient!;
}

export function getConnectedAddress(): string | null {
  return _connectedAddress;
}

export function isConnected(): boolean {
  return !!_connectedAddress;
}

// ── MetaMask connection ────────────────────────────────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (data: unknown) => void) => void;
    };
  }
}

export async function connectMetaMask(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected. Please install it from metamask.io");
  }

  // Add / switch to GenLayer Studio network
  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0xF22F",         // 61999 in hex
        chainName: "GenLayer Studio",
        nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
        rpcUrls: ["https://studio.genlayer.com/api"],
        blockExplorerUrls: [],
      }],
    });
  } catch {
    // wallet may reject addChain but still allow signing — continue
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  }) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found in MetaMask");
  }

  _connectedAddress = accounts[0];
  _writeClient = createClient({
    chain: CHAIN,
    provider: window.ethereum,
    account: _connectedAddress as `0x${string}`,
  });

  window.ethereum.on("accountsChanged", (newAccounts: unknown) => {
    const accounts = newAccounts as string[];
    if (accounts.length === 0) {
      disconnect();
      window.dispatchEvent(new Event("wallet:disconnected"));
    } else {
      _connectedAddress = accounts[0];
      _writeClient = createClient({
        chain: CHAIN,
        provider: window.ethereum,
        account: _connectedAddress as `0x${string}`,
      });
      window.dispatchEvent(
        new CustomEvent("wallet:changed", { detail: accounts[0] })
      );
    }
  });

  return _connectedAddress;
}

export function disconnect(): void {
  _writeClient = null;
  _connectedAddress = null;
}
