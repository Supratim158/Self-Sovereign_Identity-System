import React, { useState } from "react";
import { ethers } from "ethers";
import contractABI from "../utils/IdentitySystemABI.json";
import "./IdentityForm.css";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function IdentityForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [metadata, setMetadata] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  // Function to create identity on blockchain
  async function createIdentity() {
    setError("");
    setSuccess("");
    if (!window.ethereum) {
      setError("MetaMask not detected");
      return;
    }
    if (!name || !email || !dob || !aadhar) {
      setError("Please fill all required fields");
      return;
    }
    try {
      setLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      // Combine dob, aadhar, and metadata into a single metadata string
      const meta = JSON.stringify({
        dob,
        aadhar,
        additional: metadata || "No metadata",
      });

      const tx = await contract.createIdentity(name, email, meta);
      await tx.wait();

      setSuccess("Identity created successfully!");
      setName("");
      setEmail("");
      setDob("");
      setAadhar("");
      setMetadata("");

      // Update history locally
      setHistory((prev) => [
        ...prev,
        { name, email, dob, aadhar, metadata: meta },
      ]);
    } catch (err) {
      console.error(err);
      setError("Transaction failed: " + (err.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  // Toggle history visibility
  function toggleHistory() {
    setShowHistory(!showHistory);
  }

  return (
    <div className="identity-form-container">
      <h2>Self-Sovereign Identity Form</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createIdentity();
        }}
      >
        <label>Name*</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          required
        />

        <label>Email*</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />

        <label>Date of Birth*</label>
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          required
        />

        <label>Aadhar Number*</label>
        <input
          type="text"
          value={aadhar}
          onChange={(e) => setAadhar(e.target.value)}
          placeholder="Enter your Aadhar number"
          required
          maxLength={12}
          pattern="\d{12}"
          title="Aadhar number must be exactly 12 digits"
        />

        <label>Metadata</label>
        <input
          type="text"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="Additional metadata (optional)"
        />

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Create Identity"}
        </button>
      </form>

      <button onClick={toggleHistory} style={{ marginTop: "20px" }}>
        {showHistory ? "Hide History" : "Show History"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: "1rem", textAlign: "center" }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "lightgreen", marginTop: "1rem", textAlign: "center" }}>
          {success}
        </p>
      )}

      {showHistory && (
        <div className="history-section">
          <h3>Identity History</h3>
          <ul>
            {history.length > 0 ? (
              history.map((item, index) => (
                <li key={index}>
                  <strong>Name:</strong> {item.name} | <strong>Email:</strong>{" "}
                  {item.email} | <strong>DOB:</strong> {item.dob} |{" "}
                  <strong>Aadhar:</strong> {item.aadhar} |{" "}
                  <strong>Metadata:</strong> {item.metadata}
                </li>
              ))
            ) : (
              <li>No history found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}