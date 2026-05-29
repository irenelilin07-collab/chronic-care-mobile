import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { loadState, saveState } from "./lib/storage.js";
import "./index.css";

function Root() {
  const [state, setState] = React.useState(() => loadState());

  React.useEffect(() => {
    saveState(state);
  }, [state]);

  return <App state={state} setState={setState} />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
