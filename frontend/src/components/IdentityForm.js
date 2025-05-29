import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../utils/IdentitySystemABI.json";
import { validateAadhar, encryptData, decryptData } from "../utils/cryptoUtils";
import "./IdentityForm.css";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function Tooltip({ text, children }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="tooltip-container">
      {children}
      <span
        className={`tooltip-text ${isVisible ? "visible" : ""}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {text}
      </span>
    </div>
  );
}

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
  const [walletAddress, setWalletAddress] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [aadharError, setAadharError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  async function connectWallet() {
    if (!window.ethereum) {
      setError("MetaMask not detected");
      return false;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0] || "");
      return true;
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError("Failed to connect wallet");
      return false;
    }
  }

  useEffect(() => {
    connectWallet();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        setWalletAddress(accounts[0] || "");
      });
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", setWalletAddress);
      }
    };
  }, []);

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
      const walletConnected = await connectWallet();
      if (!walletConnected) {
        return;
      }
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

  function handleExportKey() {
    if (!encryptionKey) {
      setError("No encryption key to export");
      return;
    }
    const keyData = { encryptionKey };
    const dataStr = JSON.stringify(keyData);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const link = document.createElement("a");
    link.setAttribute("href", dataUri);
    link.setAttribute("download", "encryption_key.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccess("Encryption key exported successfully!");
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

  function handleImportKey(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.encryptionKey && typeof imported.encryptionKey === "string") {
          setEncryptionKey(imported.encryptionKey);
          setSuccess("Encryption key imported successfully!");
        } else {
          setError("Invalid key file format");
        }
      } catch {
        setError("Failed to import encryption key");
      }
    };
    reader.readAsText(file);
  }

  function handleDelete(index) {
    setDeleteIndex(index);
    setShowDeleteConfirm(true);
  }

  function confirmDelete() {
    setHistory((prev) => prev.filter((_, i) => i !== deleteIndex));
    setSuccess("Identity deleted successfully!");
    setShowDeleteConfirm(false);
    setDeleteIndex(null);
    if (filteredHistory.length - 1 <= (currentPage - 1) * itemsPerPage && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }

  function cancelDelete() {
    setShowDeleteConfirm(false);
    setDeleteIndex(null);
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

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHistory = filteredHistory.slice(startIndex, startIndex + itemsPerPage);

  function handlePageChange(page) {
    setCurrentPage(page);
  }

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
      {walletAddress && (
        <p className="wallet-address">
          Connected Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </p>
      )}

      <div className="form-wrapper">
        <div className="form-content">
          <div className="input-group">
            <label htmlFor="name">Name*</label>
            <Tooltip text="Enter your full name (e.g., John Doe)">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
              />
            </Tooltip>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email*</label>
            <Tooltip text="Enter a valid email (e.g., user@example.com)">
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
                onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
              />
            </Tooltip>
            {emailError && <p className="error-message">{emailError}</p>}
          </div>

          <div className="input-group">
            <label htmlFor="dob">Date of Birth*</label>
            <Tooltip text="Select your date of birth (YYYY-MM-DD)">
              <input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
                onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
              />
            </Tooltip>
          </div>

          <div className="input-group">
            <label htmlFor="aadhar">Aadhar Number*</label>
            <Tooltip text="Enter 12-digit Aadhar number (e.g., 123456789012)">
              <input
                id="aadhar"
                type="password"
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
                onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
              />
            </Tooltip>
            {aadharError && <p className="error-message">{aadharError}</p>}
          </div>

          <div className="input-group">
            <label htmlFor="encryptionKey">Encryption Key*</label>
            <Tooltip text="Enter a secure key for encryption">
              <input
                id="encryptionKey"
                type="password"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Enter encryption key"
                required
                onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
              />
            </Tooltip>
          </div>

          <div className="input-group">
            <label htmlFor="metadata">Metadata</label>
            <Tooltip text="Optional: Additional info (e.g., address)">
              <input
                id="metadata"
                type="text"
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                placeholder="Additional metadata (optional)"
                onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
              />
            </Tooltip>
          </div>

          <div className="input-group">
            <label>Custom Attributes</label>
            {customAttributes.map((attr, index) => (
              <div key={index} className="custom-attribute-group">
                <Tooltip text="Key-value pairs (e.g., phone: 1234567890)">
                  <input
                    type="text"
                    value={attr.key}
                    onChange={(e) => updateCustomAttribute(index, "key", e.target.value)}
                    placeholder="Attribute key"
                    onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                    onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
                  />
                </Tooltip>
                <Tooltip text="Key-value pairs (e.g., phone: 1234567890)">
                  <input
                    type="text"
                    value={attr.value}
                    onChange={(e) => updateCustomAttribute(index, "value", e.target.value)}
                    placeholder="Attribute value"
                    onFocus={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.add("visible")}
                    onBlur={(e) => e.target.parentElement.querySelector(".tooltip-text").classList.remove("visible")}
                  />
                </Tooltip>
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
            <button onClick={handleExportKey}>Export Key</button>
            <button
              onClick={() => document.getElementById("import-key-input").click()}
            >
              Import Key
            </button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportKey}
              style={{ display: "none" }}
              id="import-key-input"
            />
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
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((item, index) => (
                  <li key={startIndex + index}>
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
                      onClick={() => handleEdit(startIndex + index)}
                    >
                      Edit
                    </button>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(startIndex + index)}
                    >
                      Delete
                    </button>
                  </li>
                ))
              ) : (
                <li>No history found</li>
              )}
            </ul>
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-dialog">
            <p>Are you sure you want to delete this identity?</p>
            <div className="delete-confirm-buttons">
              <button className="confirm-btn" onClick={confirmDelete}>
                Confirm
              </button>
              <button className="cancel-btn" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}