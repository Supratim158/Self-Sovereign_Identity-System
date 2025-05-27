import { BrowserProvider, Contract } from "ethers";
import abi from "./IdentitySystemABI.json";

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const getContract = async () => {
  if (window.ethereum) {
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new Contract(CONTRACT_ADDRESS, abi, signer);
  } else {
    alert("MetaMask not found. Please install it.");
    return null;
  }
};
