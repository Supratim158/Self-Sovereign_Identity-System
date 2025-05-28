

import { BrowserProvider, Contract } from "ethers";
import ContractABI from "./IdentitySystemABI.json";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export async function getContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const contract = new Contract(CONTRACT_ADDRESS, ContractABI, signer);

  return contract;
}


