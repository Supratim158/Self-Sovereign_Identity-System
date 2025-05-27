import React, { useState } from "react";
import { getContract } from "../utils/contract";

const IdentityForm = () => {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const contract = await getContract();
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.registerIdentity(name, dob);
      await tx.wait();
      alert("Identity registered successfully!");
      setName("");
      setDob("");
    } catch (error) {
      console.error(error);
      alert("Transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2>Register Identity</h2>
      <input
        type="text"
        required
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="date"
        required
        value={dob}
        onChange={(e) => setDob(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
};

export default IdentityForm;
