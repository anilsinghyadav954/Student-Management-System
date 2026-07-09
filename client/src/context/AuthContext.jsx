import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";

const AuthContext = createContext();

const TOKEN_KEY = "sms-token";
const USER_KEY = "sms-user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we verify the session on first load

  // On app mount: if a token exists in localStorage, verify it's still
  // valid by calling /auth/me. This is what makes sessions persist across
  // page refreshes without re-prompting for login every time.
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authService.getMe();
        setUser(data.data.user);
      } catch (error) {
        // Token invalid/expired — the api interceptor already clears storage
        // on 401, but we clear defensively here too.
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (email, password) => {
    const { data } = await authService.login(email, password);
    const { token, user: loggedInUser } = data.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if the API call fails (e.g. token already expired), we still
      // want to clear local state so the user isn't stuck "logged in" locally.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  };

  const value = { user, setUser, loading, login, logout, isAuthenticated: !!user };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
