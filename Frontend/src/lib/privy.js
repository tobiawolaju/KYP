import React, { useEffect } from "react";
import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { navigate } from "./router.svelte.js";
import { updateWallet } from "./wallet.svelte.js";

const POST_LOGIN_REDIRECT_KEY = "kyp_post_login_redirect";

function getWalletAddress(user, wallets) {
  return (
    wallets?.[0]?.address ??
    user?.wallet?.address ??
    user?.linkedAccounts?.find((account) => account.type === "wallet")?.address ??
    null
  );
}

function PrivyInner() {
  const { ready, authenticated, user, login, logout, getEthereumProvider } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const address = getWalletAddress(user, wallets);

  useEffect(() => {
    updateWallet({
      ready: ready && (!authenticated || walletsReady),
      authenticated,
      address,
      login: () => {
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, window.location.pathname || "/myprotocols");
        login({ loginMethods: ["wallet"] });
      },
      logout,
      getEthereumProvider: async () => {
        if (wallets?.[0]) return wallets[0].getEthereumProvider();
        return getEthereumProvider();
      },
    });
  }, [ready, walletsReady, authenticated, user, wallets, address, login, logout, getEthereumProvider]);

  useEffect(() => {
    if (!ready || !authenticated) return;

    const redirectTo = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
    if (redirectTo) {
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      navigate(redirectTo === "/" ? "/myprotocols" : redirectTo);
    } else if (window.location.pathname === "/") {
      navigate("/myprotocols");
    }
  }, [ready, authenticated]);

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
