let _network = $state(localStorage.getItem("network") || "testnet");

export function getNetwork() {
  return {
    get current() { return _network; },
    get isMainnet() { return _network === "mainnet"; },
  };
}

export function setNetwork(net) {
  _network = net === "mainnet" ? "mainnet" : "testnet";
  localStorage.setItem("network", _network);
}

export function toggleNetwork() {
  setNetwork(_network === "mainnet" ? "testnet" : "mainnet");
}
