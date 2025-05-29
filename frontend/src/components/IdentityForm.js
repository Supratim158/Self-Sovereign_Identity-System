import React, { useState } from "react";
import { ethers } from "ethers";
import contractABI from "../utils/IdentitySystemABI.json";
import { validateAadhar, encryptData, decryptData } from "../utils/cryptoUtils";
import "./IdentityForm.css";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export default function IdentityForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [metadata, setMetadata] = useState("");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [customAttributes, setCustomAttributes] = useState([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [txHash, setTxHash] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [aadharError, setAadharError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  async function createIdentity() {
    setError("");
    setSuccess("");
    setAadharError("");
    setEmailError("");
    if (!window.ethereum) {
      setError("MetaMask not detected");
      return;
    }
    if (!name || !email || !dob || !aadhar || !encryptionKey) {
      setError("Please fill all required fields");
      return;
    }
    if (!validateAadhar(aadhar)) {
      setAadharError("Invalid Aadhar number");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email format");
      return;
    }
    try {
      setLoading(true);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);

      const customMeta = customAttributes.reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value;
        return acc;
      }, {});
      const meta = JSON.stringify({
        dob,
        aadhar: encryptData(aadhar, encryptionKey),
        additional: metadata || "No metadata",
        custom: customMeta,
      });

      const tx = await contract.createIdentity(name, email, meta);
      const receipt = await tx.wait();

      setSuccess("Identity created successfully!");
      setTxHash(receipt.hash);
      const newIdentity = {
        name,
        email,
        dob,
        aadhar: encryptData(aadhar, encryptionKey),
        metadata: meta,
        status: Math.random() > 0.5 ? "Verified" : "Pending",
        txHash: receipt.hash,
      };

      if (editingIndex !== null) {
        setHistory((prev) =>
          prev.map((item, i) => (i === editingIndex ? newIdentity : item))
        );
        setEditingIndex(null);
      } else {
        setHistory((prev) => [...prev, newIdentity]);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      setError("Transaction failed: " + (err.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setName("");
    setEmail("");
    setDob("");
    setAadhar("");
    setMetadata("");
    setEncryptionKey("");
    setCustomAttributes([{ key: "", value: "" }]);
    setAadharError("");
    setEmailError("");
    setTxHash(null);
    setEditingIndex(null);
  }

  function toggleHistory() {
    setShowHistory(!showHistory);
  }

  function handleExport() {
    const dataStr = JSON.stringify(history);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", "identities.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported) && imported.every(item => item.name && item.email && item.dob && item.aadhar && item.metadata)) {
          setHistory(imported);
          setSuccess("Identities imported successfully!");
        } else {
          setError("Invalid JSON format");
        }
      } catch {
        setError("Failed to import identities");
      }
    };
    reader.readAsText(file);
  }

  function handleDelete(index) {
    setHistory((prev) => prev.filter((_, i) => i !== index));
    setSuccess("Identity deleted successfully!");
  }

  function handleEdit(index) {
    const item = history[index];
    setName(item.name);
    setEmail(item.email);
    setDob(item.dob);
    setAadhar(encryptionKey && decryptData(item.aadhar, encryptionKey) ? decryptData(item.aadhar, encryptionKey) : "");
    setMetadata(JSON.parse(item.metadata).additional || "");
    const custom = JSON.parse(item.metadata).custom || {};
    setCustomAttributes(
      Object.entries(custom).map(([key, value]) => ({ key, value }))
    );
    setEditingIndex(index);
  }

  function addCustomAttribute() {
    setCustomAttributes((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateCustomAttribute(index, field, value) {
    setCustomAttributes((prev) =>
      prev.map((attr, i) => (i === index ? { ...attr, [field]: value } : attr))
    );
  }

  const filteredHistory = history.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="identity-form-container">
      {loading && <div className="loading-spinner"></div>}
      <h2 className="form-heading">Self-Sovereign Identity Form</h2>
      {txHash && (
        <p className="tx-hash">
          Transaction Hash:{" "}
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {txHash.slice(0, 6)}...
          </a>
        </p>
      )}

      <div className="form-wrapper">
        <div className="form-content">
          <div className="input-group">
            <label htmlFor="name">Name*</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email*</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)
                    ? ""
                    : "Invalid email format"
                );
              }}
              placeholder="Enter your email"
              required
            />
            {emailError && <p className="error-message">{emailError}</p>}
          </div>

          <div className="input-group">
            <label htmlFor="dob">Date of Birth*</label>
            <input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="aadhar">Aadhar Number*</label>
            <input
              id="aadhar"
              type="text"
              value={aadhar}
              onChange={(e) => {
                setAadhar(e.target.value);
                setAadharError(validateAadhar(e.target.value) ? "" : "Invalid Aadhar number");
              }}
              placeholder="Enter your Aadhar number"
              required
              maxLength={12}
              pattern="\d{12}"
              title="Aadhar number must be exactly 12 digits"
            />
            {aadharError && <p className="error-message">{aadharError}</p>}
          </div>

          <div className="input-group">
            <label htmlFor="encryptionKey">Encryption Key*</label>
            <input
              id="encryptionKey"
              type="password"
              value={encryptionKey}
              onChange={(e) => setEncryptionKey(e.target.value)}
              placeholder="Enter encryption key"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="metadata">Metadata</label>
            <input
              id="metadata"
              type="text"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder="Additional metadata (optional)"
            />
          </div>

          <div className="input-group">
            <label>Custom Attributes</label>
            {customAttributes.map((attr, index) => (
              <div key={index} className="custom-attribute-group">
                <input
                  type="text"
                  value={attr.key}
                  onChange={(e) => updateCustomAttribute(index, "key", e.target.value)}
                  placeholder="Attribute key"
                />
                <input
                  type="text"
                  value={attr.value}
                  onChange={(e) => updateCustomAttribute(index, "value", e.target.value)}
                  placeholder="Attribute value"
                />
              </div>
            ))}
            <button type="button" onClick={addCustomAttribute}>
              Add Attribute
            </button>
          </div>

          <div className="button-group">
            <button onClick={createIdentity} disabled={loading}>
              {loading ? "Submitting..." : editingIndex !== null ? "Update Identity" : "Create Identity"}
            </button>
            <button onClick={resetForm}>Reset Form</button>
            <button className="history-toggle-btn" onClick={toggleHistory}>
              {showHistory ? "Hide History" : "Show History"}
            </button>
            <button onClick={handleExport}>Export Identities</button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: "none" }}
              id="import-input"
            />
            <button
              onClick={() => document.getElementById("import-input").click()}
            >
              Import Identities
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
        </div>

        {showHistory && (
          <div className="history-section">
            <h3>Identity History</h3>
            <div className="search-bar">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email"
              />
            </div>
            <ul>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((item, index) => (
                  <li key={index}>
                    <strong>Name:</strong> {item.name} | <strong>Email:</strong>{" "}
                    {item.email} | <strong>DOB:</strong> {item.dob} |{" "}
                    <strong>Aadhar:</strong>{" "}
                    {encryptionKey && decryptData(item.aadhar, encryptionKey)
                      ? decryptData(item.aadhar, encryptionKey)
                      : "Encrypted"} | <strong>Metadata:</strong> {item.metadata} |{" "}
                    <strong>Status:</strong>{" "}
                    <span className={`status-${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                    <button
                      className="edit-btn"
                      onClick={() => handleEdit(index)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(index)}
                    >
                      Delete
                    </button>
                  </li>
                ))
              ) : (
                <li>No history found</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}