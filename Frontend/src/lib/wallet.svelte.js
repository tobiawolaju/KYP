let _ready = $state(false);
let _authenticated = $state(false);
let _address = $state(null);
let _login = null;
let _logout = null;
let _getEthereumProvider = null;

export function getWallet() {
  return {
    get ready() { return _ready; },
    get authenticated() { return _authenticated; },
    get address() { return _address; },
    login: _login,
    logout: _logout,
    getProvider: _getEthereumProvider,
  };
}

export function updateWallet(state) {
  _ready = state.ready;
  _authenticated = state.authenticated;
  _address = state.address;
  _login = state.login;
  _logout = state.logout;
  _getEthereumProvider = state.getEthereumProvider;
}
