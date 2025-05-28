
import { ethers } from "ethers";
import ContractABI from "./IdentitySystemABI.json";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace this

let contract;

export const getContract = async () => {
  if (contract) return contract;

  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  contract = new ethers.Contract(contractAddress, ContractABI.abi, signer);
  return contract;
};


