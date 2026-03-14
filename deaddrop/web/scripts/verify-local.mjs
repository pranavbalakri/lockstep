import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  getAddress,
  http,
  parseEther
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactPath = path.resolve(
  __dirname,
  "../../contracts/out/DeadDrop.sol/DeadDrop.json"
);
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

const chain = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [process.env.VERIFY_RPC_URL ?? "http://127.0.0.1:8545"]
    }
  }
});

const clientAccount = privateKeyToAccount(
  process.env.VERIFY_CLIENT_PRIVATE_KEY ??
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
);
const freelancerAccount = privateKeyToAccount(
  process.env.VERIFY_FREELANCER_PRIVATE_KEY ??
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
);
const depositAmount = parseEther(process.env.VERIFY_DEPOSIT_ETH ?? "1");

const transport = http(chain.rpcUrls.default.http[0]);
const publicClient = createPublicClient({ chain, transport });
const clientWallet = createWalletClient({
  account: clientAccount,
  chain,
  transport
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log(`RPC: ${chain.rpcUrls.default.http[0]}`);
  console.log(`Client: ${clientAccount.address}`);
  console.log(`Freelancer: ${freelancerAccount.address}`);

  const deployHash = await clientWallet.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    args: [clientAccount.address, freelancerAccount.address]
  });
  const deployReceipt = await publicClient.waitForTransactionReceipt({
    hash: deployHash
  });
  const contractAddress = deployReceipt.contractAddress;

  assert(contractAddress, "Contract deployment did not return an address.");
  console.log(`Contract: ${contractAddress}`);

  const freelancerBalanceBefore = await publicClient.getBalance({
    address: freelancerAccount.address
  });

  const depositHash = await clientWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "deposit",
    value: depositAmount
  });
  await publicClient.waitForTransactionReceipt({ hash: depositHash });

  const fundedState = await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "state"
  });
  const contractBalanceAfterDeposit = await publicClient.getBalance({
    address: contractAddress
  });

  assert(
    fundedState === 1,
    `Expected state=1 (Funded) after deposit, received ${fundedState}.`
  );
  assert(
    contractBalanceAfterDeposit === depositAmount,
    `Expected contract balance ${depositAmount}, received ${contractBalanceAfterDeposit}.`
  );

  const releaseHash = await clientWallet.writeContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "release"
  });
  await publicClient.waitForTransactionReceipt({ hash: releaseHash });

  const releasedState = await publicClient.readContract({
    address: contractAddress,
    abi: artifact.abi,
    functionName: "state"
  });
  const freelancerBalanceAfter = await publicClient.getBalance({
    address: freelancerAccount.address
  });
  const contractBalanceAfterRelease = await publicClient.getBalance({
    address: contractAddress
  });

  assert(
    releasedState === 2,
    `Expected state=2 (Released) after payout, received ${releasedState}.`
  );
  assert(
    contractBalanceAfterRelease === 0n,
    `Expected contract balance 0 after payout, received ${contractBalanceAfterRelease}.`
  );
  assert(
    freelancerBalanceAfter - freelancerBalanceBefore === depositAmount,
    `Expected freelancer balance to increase by ${depositAmount}, increased by ${
      freelancerBalanceAfter - freelancerBalanceBefore
    }.`
  );

  console.log("Verification passed.");
  console.log(`Deposited: ${formatEther(depositAmount)} ETH`);
  console.log(
    `Freelancer received: ${formatEther(
      freelancerBalanceAfter - freelancerBalanceBefore
    )} ETH`
  );
  console.log(`Contract address checksum: ${getAddress(contractAddress)}`);
}

main().catch((error) => {
  console.error("Verification failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
