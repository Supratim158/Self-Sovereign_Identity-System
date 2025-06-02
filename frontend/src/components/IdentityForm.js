import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "../utils/IdentitySystemABI.json";
import { validateAadhar, encryptData, decryptData } from "../utils/cryptoUtils.js";
import "./IdentityForm.css";

const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function Tooltip({ text, children }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="tooltip-container">
      {children}
      <span
        className={`tooltip-text ${isVisible ? "visible" : ""}`}
        id={`tooltip-${children.props.id}`}
        role="tooltip"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
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
  const [gender, setGender] = useState(""); // New state for gender
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
  const [aadharValid, setAadharValid] = useState(null);
  const [aadharWarning, setAadharWarning] = useState("");
  const [encryptionKeyWarning, setEncryptionKeyWarning] = useState("");

  const AADHAR_LIMIT = 12;
  const ENCRYPTION_KEY_LIMIT = 32;

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
        gender: gender || "Not specified", // Include gender in metadata
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
        gender: gender || "Not specified", // Store gender in history
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
    setGender(""); // Reset gender
    setMetadata("");
    setEncryptionKey("");
    setCustomAttributes([{ key: "", value: "" }]);
    setAadharError("");
    setEmailError("");
    setTxHash(null);
    setEditingIndex(null);
    setAadharValid(null);
    setAadharWarning("");
    setEncryptionKeyWarning("");
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

  function handleExportCSV() {
    if (!history.length) {
      setError("No history to export");
      return;
    }
    const headers = ["Name", "Email", "DOB", "Aadhar", "Gender", "Metadata", "Status", "Transaction Hash"]; // Added Gender
    const escapeCSV = (value) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = history.map((item) => [
      escapeCSV(item.name),
      escapeCSV(item.email),
      escapeCSV(item.dob),
      escapeCSV(
        encryptionKey && decryptData(item.aadhar, encryptionKey)
          ? decryptData(item.aadhar, encryptionKey)
          : "Encrypted"
      ),
      escapeCSV(item.gender), // Include gender in CSV
      escapeCSV(item.metadata),
      escapeCSV(item.status),
      escapeCSV(item.txHash),
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "identities.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccess("History exported to CSV successfully!");
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (
          Array.isArray(imported) &&
          imported.every((item) => item.name && item.email && item.dob && item.aadhar && item.metadata)
        ) {
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
    setAadhar(
      encryptionKey && decryptData(item.aadhar, encryptionKey)
        ? decryptData(item.aadhar, encryptionKey)
        : ""
    );
    setGender(item.gender || ""); // Load gender for editing
    setMetadata(JSON.parse(item.metadata).additional || "");
    const custom = JSON.parse(item.metadata).custom || {};
    setCustomAttributes(Object.entries(custom).map(([key, value]) => ({ key, value })));
    setEditingIndex(index);
    setAadharValid(aadhar ? validateAadhar(aadhar) : null);
    setAadharWarning(
      aadhar.length >= AADHAR_LIMIT - 2
        ? `Approaching ${AADHAR_LIMIT}-character limit (${aadhar.length}/${AADHAR_LIMIT})`
        : ""
    );
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
      {loading && <div className="loading-spinner" role="status" aria-label="Loading"></div>}
      <div className="left">
        <h2 id="identity-form-heading" className="form-heading">Self-Sovereign Identity Form</h2>
        {txHash && (
          <p className="tx-hash">
            Transaction Hash:{" "}
            <a
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={"View transaction " + txHash + " on Etherscan"}
            >
              {txHash.slice(0, 6)}...
            </a>
          </p>
        )}
        {walletAddress && (
          <p className="wallet-address" aria-live="polite">
            Connected Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        )}
      </div>
      <div className="right">
        <div className="form-wrapper">
          <form className="form-content" onSubmit={(e) => { e.preventDefault(); createIdentity(); }}>
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
                  aria-describedby="tooltip-name"
                  onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                  onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
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
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) ? "" : "Invalid email format"
                    );
                  }}
                  placeholder="Enter your email"
                  required
                  aria-describedby="tooltip-email"
                  aria-invalid={!!emailError}
                  aria-errormessage="email-error"
                  onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                  onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                />
              </Tooltip>
              {emailError && <p id="email-error" className="error-message">{emailError}</p>}
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
                  aria-describedby="tooltip-dob"
                  onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                  onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                />
              </Tooltip>
            </div>

            <div className="input-group">
              <label htmlFor="gender">Gender</label>
              <Tooltip text="Select your gender (optional)">
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  aria-describedby="tooltip-gender"
                  onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                  onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </Tooltip>
            </div>

            <div className="input-group">
              <label htmlFor="aadhar">Aadhar Number*</label>
              <Tooltip text="Enter 12-digit Aadhar number (e.g., 123456789012)">
                <div className="input-validation-container">
                  <input
                    id="aadhar"
                    type="password"
                    value={aadhar}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAadhar(value);
                      setAadharValid(value ? validateAadhar(value) : null);
                      setAadharError(validateAadhar(value) ? "" : "Invalid Aadhar number");
                      setAadharWarning(
                        value.length >= AADHAR_LIMIT - 2
                          ? `Approaching ${AADHAR_LIMIT}-character limit (${value.length}/${AADHAR_LIMIT})`
                          : value.length > AADHAR_LIMIT
                          ? `Exceeded ${AADHAR_LIMIT}-character limit`
                          : ""
                      );
                    }}
                    placeholder="Enter your Aadhar number"
                    required
                    maxLength={AADHAR_LIMIT}
                    pattern="\d{12}"
                    title="Aadhar number must be exactly 12 digits"
                    aria-describedby="tooltip-aadhar aadhar-warning"
                    aria-invalid={!!aadharError}
                    aria-errormessage="aadhar-error"
                    onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                    onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                  />
                  {aadharValid !== null && (
                    <span
                      className="validation-indicator"
                      aria-hidden="true"
                    >
                      {aadharValid ? "✅" : "❌"}
                    </span>
                  )}
                </div>
              </Tooltip>
              {aadharError && <p id="aadhar-error" className="error-message">{aadharError}</p>}
              {aadharWarning && <p id="aadhar-warning" className="warning-message">{aadharWarning}</p>}
            </div>

            <div className="input-group">
              <label htmlFor="encryptionKey">Encryption Key*</label>
              <Tooltip text="Enter a secure key for encryption (max 32 characters)">
                <div className="input-validation-container">
                  <input
                    id="encryptionKey"
                    type="text"
                    value={encryptionKey}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEncryptionKey(value);
                      setEncryptionKeyWarning(
                        value.length >= ENCRYPTION_KEY_LIMIT - 2
                          ? `Approaching ${ENCRYPTION_KEY_LIMIT}-character limit (${value.length}/${ENCRYPTION_KEY_LIMIT})`
                          : value.length > ENCRYPTION_KEY_LIMIT
                          ? `Exceeded ${ENCRYPTION_KEY_LIMIT}-character limit`
                          : ""
                      );
                    }}
                    placeholder="Enter encryption key"
                    required
                    maxLength={ENCRYPTION_KEY_LIMIT}
                    aria-describedby="tooltip-encryptionKey encryptionkey-warning"
                    onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                    onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                  />
                </div>
              </Tooltip>
              {encryptionKeyWarning && <p id="encryptionkey-warning" className="warning-message">{encryptionKeyWarning}</p>}
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
                  aria-describedby="tooltip-metadata"
                  onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                  onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                />
              </Tooltip>
            </div>

            <div className="input-group">
              <label id="custom-attributes-label">Custom Attributes</label>
              {customAttributes.map((attr, index) => (
                <div key={index} className="custom-attribute-group" aria-labelledby="custom-attributes-label">
                  <Tooltip text="Key-value pairs (e.g., phone: 1234567890)">
                    <input
                      type="text"
                      value={attr.key}
                      onChange={(e) => updateCustomAttribute(index, "key", e.target.value)}
                      placeholder="Attribute key"
                      aria-describedby={`tooltip-custom-key-${index}`}
                      onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                      onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                      id={`custom-key-${index}`}
                    />
                  </Tooltip>
                  <Tooltip text="Key-value pairs (e.g., phone: 1234567890)">
                    <input
                      type="text"
                      value={attr.value}
                      onChange={(e) => updateCustomAttribute(index, "value", e.target.value)}
                      placeholder="Attribute value"
                      aria-describedby={`tooltip-custom-value-${index}`}
                      onFocus={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.add("visible")}
                      onBlur={(e) => e.target.closest(".tooltip-container").querySelector(".tooltip-text").classList.remove("visible")}
                      id={`custom-value-${index}`}
                    />
                  </Tooltip>
                </div>
              ))}
              <button
                type="button"
                onClick={addCustomAttribute}
                aria-label="Add new custom attribute"
              >
                Add Attribute
              </button>
            </div>

            <div className="button-group">
              <button
                type="submit"
                disabled={loading}
                aria-label={editingIndex !== null ? "Update identity" : "Create identity"}
              >
                {loading ? "Submitting..." : editingIndex !== null ? "Update Identity" : "Create Identity"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Reset form"
              >
                Reset Form
              </button>
              <button
                type="button"
                className="history-toggle-btn"
                onClick={toggleHistory}
                aria-expanded={showHistory}
                aria-controls="history-section"
              >
                {showHistory ? "Hide History" : "Show History"}
              </button>
              <button
                type="button"
                onClick={handleExport}
                aria-label="Export identities to JSON"
              >
                Export Identities
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                aria-label="Export identities to CSV"
                className="csv-export-btn"
              >
                Export to CSV
              </button>
              <button
                type="button"
                onClick={handleExportKey}
                aria-label="Export encryption key"
              >
                Export Key
              </button>
              <label htmlFor="import-key-input" className="sr-only">Import encryption key</label>
              <button
                type="button"
                onClick={() => document.getElementById("import-key-input").click()}
                aria-label="Import encryption key"
              >
                Import Key
              </button>
              <input
                type="file"
                accept=".json"
                onChange={handleImportKey}
                style={{ display: "none" }}
                id="import-key-input"
                aria-hidden="true"
              />
              <label htmlFor="import-input" className="sr-only">Import identities</label>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: "none" }}
                id="import-input"
                aria-hidden="true"
              />
              <button
                type="button"
                onClick={() => document.getElementById("import-input").click()}
                aria-label="Import identities from JSON"
              >
                Import Identities
              </button>
            </div>

            {error && <p id="form-error" className="error-message" role="alert">{error}</p>}
            {success && <p id="form-success" className="success-message" role="alert">{success}</p>}
          </form>

          {showHistory && (
            <section className="history-section" id="history-section" aria-labelledby="history-heading">
              <h3 id="history-heading">Identity History</h3>
              <div className="search-bar">
                <label htmlFor="search-history" className="sr-only">Search identities by name or email</label>
                <input
                  id="search-history"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email"
                  aria-describedby="search-instructions"
                />
                <span id="search-instructions" className="sr-only">
                  Enter a name or email to filter the identity history list.
                </span>
              </div>
              <ul aria-label="Identity history list">
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((item, index) => (
                    <li key={startIndex + index} aria-label={`Identity ${item.name}`}>
                      <strong>Name:</strong> {item.name} | <strong>Email:</strong> {item.email} | 
                      <strong>DOB:</strong> {item.dob} | <strong>Gender:</strong> {item.gender} | 
                      <strong>Aadhar:</strong> 
                      {encryptionKey && decryptData(item.aadhar, encryptionKey)
                        ? decryptData(item.aadhar, encryptionKey)
                        : "Encrypted"} | <strong>Metadata:</strong> {item.metadata} | 
                      <strong>Status:</strong> 
                      <span className={`status-${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(startIndex + index)}
                        aria-label={`Edit identity for ${item.name}`}
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(startIndex + index)}
                        aria-label={`Delete identity for ${item.name}`}
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
                <div className="pagination-controls" role="navigation" aria-label="History pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    aria-disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-info" aria-live="polite">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                    aria-disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" role="dialog" aria-labelledby="delete-confirm-title">
          <div className="delete-confirm-dialog">
            <p id="delete-confirm-title">Are you sure you want to delete this identity?</p>
            <div className="delete-confirm-buttons">
              <button className="confirm-btn" onClick={confirmDelete} aria-label="Confirm deletion">
                Confirm
              </button>
              <button className="cancel-btn" onClick={cancelDelete} aria-label="Cancel deletion">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}