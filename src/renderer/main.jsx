import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ChatWindow from "./windows/chat";
import SettingsWindow from "./windows/settings";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {(() => {
      const page = new URLSearchParams(window.location.search).get("w");
      const Root = page === "settings" ? SettingsWindow : ChatWindow;
      return <Root />;
    })()}
  </StrictMode>
);
