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
    } catch (err) {
      console.error(err);
      alert("Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
      <h2>Register Identity</h2>
      <div>
        <label>Name: </label>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <label>Date of Birth: </label>
        <input
          required
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit Identity"}
      </button>
    </form>
  );
};

export default IdentityForm;
