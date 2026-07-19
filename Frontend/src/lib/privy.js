import React, { useCallback, useEffect, useState } from "react";
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

function getInjectedEthereumProvider() {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

async function getInjectedAccounts() {
  const provider = getInjectedEthereumProvider();
  if (!provider?.request) return [];
  try {
    return await provider.request({ method: "eth_accounts" });
  } catch (err) {
    console.warn("Unable to read injected wallet accounts:", err);
    return [];
  }
}

function PrivyInner() {
  const { ready, authenticated: privyAuthenticated, user, login: privyLogin, logout: privyLogout, getEthereumProvider } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const [injectedAccounts, setInjectedAccounts] = useState([]);
  const privyAddress = getWalletAddress(user, wallets);
  const injectedAddress = injectedAccounts?.[0] ?? null;
  const authenticated = privyAuthenticated || Boolean(injectedAddress);
  const address = privyAddress ?? injectedAddress;

  useEffect(() => {
    let mounted = true;
    getInjectedAccounts().then((accounts) => {
      if (mounted) setInjectedAccounts(accounts);
    });

    const provider = getInjectedEthereumProvider();
    if (!provider?.on) return () => { mounted = false; };

    const handleAccountsChanged = (accounts) => {
      setInjectedAccounts(Array.isArray(accounts) ? accounts : []);
    };
    const handleDisconnect = () => setInjectedAccounts([]);

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("disconnect", handleDisconnect);

    return () => {
      mounted = false;
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("disconnect", handleDisconnect);
    };
  }, []);

  const login = useCallback(async () => {
    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, window.location.pathname || "/myprotocols");

    const provider = getInjectedEthereumProvider();
    if (provider?.request) {
      try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        setInjectedAccounts(Array.isArray(accounts) ? accounts : []);
        return;
      } catch (err) {
        if (err?.code === 4001) return;
        console.warn("Injected wallet connection failed; falling back to Privy:", err);
      }
    }

    privyLogin({ loginMethods: ["wallet"] });
  }, [privyLogin]);

  const logout = useCallback(async () => {
    const provider = getInjectedEthereumProvider();
    if (provider?.request) {
      try {
        await provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (err) {
        console.warn("Unable to revoke injected wallet permissions:", err);
      }
    }
    setInjectedAccounts([]);
    await privyLogout();
  }, [privyLogout]);

  useEffect(() => {
    updateWallet({
      ready: ready && (!privyAuthenticated || walletsReady),
      authenticated,
      address,
      login,
      logout,
      getEthereumProvider: async () => {
        if (wallets?.[0]) return wallets[0].getEthereumProvider();
        return getInjectedEthereumProvider() ?? getEthereumProvider();
      },
    });
  }, [ready, walletsReady, privyAuthenticated, authenticated, user, wallets, address, login, logout, getEthereumProvider]);

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
