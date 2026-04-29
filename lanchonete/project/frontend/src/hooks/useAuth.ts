"use client";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import toast from "react-hot-toast";
import type { TokenResponse } from "@/types";

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout: _logout } = useAuthStore();
  const router = useRouter();

  async function login(email: string, password: string) {
    const form = new URLSearchParams({ username: email, password });
    const { data } = await api.post<TokenResponse>("/auth/login", form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    setAuth(data.user, data.access_token, data.refresh_token);
    return data.user;
  }

  function logout() {
    _logout();
    router.push("/login");
    toast.success("Até logo!");
  }

  return { user, isAuthenticated, login, logout };
}
