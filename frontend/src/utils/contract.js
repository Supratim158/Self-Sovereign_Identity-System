import { ethers } from "ethers";
import IdentitySystemABI from "./IdentitySystemABI.json";

// Replace this with your actual deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const getContract = async () => {
  if (window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, IdentitySystemABI, signer);
  } else {
    alert("Please install MetaMask to use this feature.");
    return null;
  }
};
