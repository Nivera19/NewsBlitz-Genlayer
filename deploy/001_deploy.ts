import { readFileSync } from "fs";
import path from "path";
import {
  TransactionHash,
  TransactionStatus,
  GenLayerClient,
  DecodedDeployData,
  GenLayerChain,
} from "genlayer-js/types";
import { localnet, testnetBradbury } from "genlayer-js/chains";

export default async function main(client: GenLayerClient<any>) {
  const filePath = path.resolve(process.cwd(), "contracts/news_blitz.py");
  console.log("📰 Deploying NewsBlitz contract...");
  console.log(`   Contract: ${filePath}`);

  try {
    const contractCode = new Uint8Array(readFileSync(filePath));

    console.log("⚙️  Initializing consensus smart contract...");
    await client.initializeConsensusSmartContract();

    console.log("🚀 Deploying contract...");
    const deployTx = await client.deployContract({
      code: contractCode,
      args: [],
    });

    console.log(`   Deploy tx hash: ${deployTx}`);
    console.log("⏳ Waiting for transaction to be accepted...");

    const receipt = await client.waitForTransactionReceipt({
      hash: deployTx as TransactionHash,
      status: TransactionStatus.ACCEPTED,
      retries: 200,
    });

    const isAccepted =
      receipt.status === 5 ||
      receipt.status === 6 ||
      receipt.statusName === "ACCEPTED" ||
      receipt.statusName === "FINALIZED";

    if (!isAccepted) {
      throw new Error(`Deployment failed. Receipt: ${JSON.stringify(receipt, null, 2)}`);
    }

    const contractAddress =
      (client.chain as GenLayerChain).id === localnet.id
        ? receipt.data?.contract_address
        : (receipt.txDataDecoded as DecodedDeployData)?.contractAddress;

    console.log("\n✅ NewsBlitz deployed successfully!");
    console.log(`   Contract address: ${contractAddress}`);
    console.log(`\n   Save this address in frontend/src/config.js:`);
    console.log(`   export const CONTRACT_ADDRESS = "${contractAddress}";`);
  } catch (error) {
    throw new Error(`Deployment error: ${error}`);
  }
}
