import React, { useEffect } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { updateWallet } from "./wallet.svelte.js";

function PrivyInner() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  useEffect(() => {
    updateWallet({
      ready,
      authenticated,
      address: user?.wallet?.address ?? null,
      login: () => login({ loginMethods: ["wallet"] }),
      logout,
    });
  }, [ready, authenticated, user, login, logout]);

  return null;
}

function getTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function PrivyApp() {
  return React.createElement(
    PrivyProvider,
    {
      appId: import.meta.env.VITE_PRIVY_APP_ID,
      config: {
        loginMethods: ["wallet"],
        embeddedWallets: { createOnLogin: "off" },
      },
      appearance: {
        theme: getTheme(),
      },
    },
    React.createElement(PrivyInner)
  );
}
