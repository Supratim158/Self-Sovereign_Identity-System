import React from "react";
import IdentityForm from "./components/IdentityForm";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <IdentityForm />
      </ErrorBoundary>
    </div>
  );
}

export default App;