import { createContext, useCallback, useEffect, useState } from 'react';
import { AuthApi } from '../services/api.js';
import { tokenStore } from '../services/apiClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // loading -> we are checking an existing token; authenticated / unauthenticated
  const [status, setStatus] = useState('loading');

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setStatus('unauthenticated');
      return;
    }
    try {
      const res = await AuthApi.me();
      setUser(res.data.user);
      setStatus('authenticated');
    } catch {
      tokenStore.clear();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // The API client fires this event when any request returns 401.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      setStatus('unauthenticated');
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = async (email, password) => {
    const res = await AuthApi.login({ email, password });
    tokenStore.set(res.data.token);
    setUser(res.data.user);
    setStatus('authenticated');
    return res.data.user;
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
    } catch {
      /* ignore — we clear locally regardless */
    }
    tokenStore.clear();
    setUser(null);
    setStatus('unauthenticated');
  };

  const value = {
    user,
    status,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    login,
    logout,
    reload: loadMe,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
