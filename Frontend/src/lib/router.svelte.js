let _pathname = $state(
  typeof window !== 'undefined' ? window.location.pathname : '/'
);

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    _pathname = window.location.pathname;
  });
}

export function navigate(to) {
  window.history.pushState({}, '', to);
  _pathname = window.location.pathname;
}

export function useLocation() {
  return {
    get pathname() {
      return _pathname;
    }
  };
}
