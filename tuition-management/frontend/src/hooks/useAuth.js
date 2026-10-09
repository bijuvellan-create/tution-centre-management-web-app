import { useContext } from 'react';
import AuthContext from '../context/AuthContext.jsx';

/** Access the current user and auth actions from any component. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider.');
  return ctx;
}

export default useAuth;
