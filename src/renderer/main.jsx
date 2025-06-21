import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Counter from "./windows/Counter";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Counter />
  </StrictMode>
);
