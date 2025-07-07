'use client';
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  profile_picture: {
    url: string;
  };
  confirmed: boolean;
  blocked: boolean;
  // Add other user properties as needed
}

type AuthContextType = {
  user: User | null;
  token: string | null;
  authenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hasHydrated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.id !== user?.id) {
        localStorage.setItem('user', JSON.stringify(parsedUser)); // assure-toi d'avoir le bon utilisateur
      }
      setUser(parsedUser);
      setToken(storedToken);
      setAuthenticated(true);
    }
    setHasHydrated(true); // ✅ quand les données sont lues
  }, [user?.id]);

  const login = async (user: User, token: string) => {
    localStorage.setItem('token', token);
    setToken(token);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/${user.id}?populate=*`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch user details');
      }
      const fullUser = await res.json();
      localStorage.removeItem('user');
      localStorage.setItem('user', JSON.stringify(fullUser));
      setUser(fullUser);
      setAuthenticated(true);
    } catch (err) {
      console.error('Failed to fetch full user with profile_picture:', err);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setToken(null);
    setAuthenticated(false);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, authenticated, login, logout, hasHydrated }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
