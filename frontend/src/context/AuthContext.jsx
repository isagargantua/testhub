import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getMe,
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from "../api/auth";
import {
  clearTokens,
  getAccessToken,
  setTokens,
} from "../api/tokenStorage";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const token = getAccessToken();

        if (!token) {
          setLoading(false);
          return;
        }

        const me = await getMe();

        setUser(me);
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  async function login(email, password) {
    const data = await loginApi({
      email,
      password,
    });

    setTokens(data);

    setUser(data.user);
  }

  async function register(name, email, password) {
    const data = await registerApi({
      name,
      email,
      password,
    });

    setTokens(data);

    setUser(data.user);
  }

  async function logout() {
    const accessToken = getAccessToken();

    clearTokens();
    setUser(null);

    try {
      if (accessToken) {
        await logoutApi(accessToken);
      }
    } catch {
      // Local logout already happened, so a network failure is non-blocking.
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
