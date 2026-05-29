/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, AlertCircle } from "lucide-react";
import { User } from "../types";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Default credentials info message
  const handleUseDemo = () => {
    setEmail("designer@studio.com");
    setPassword("designer123");
    setName("Alex Chen");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate network delay for premium realistic feel
    setTimeout(() => {
      try {
        const storedUsersKey = "chronofocus_users";
        const storedUsersRaw = localStorage.getItem(storedUsersKey);
        const users: User[] = storedUsersRaw ? JSON.parse(storedUsersRaw) : [];

        if (isSignUp) {
          // Sign Up flow
          const userExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
          if (userExists || email.toLowerCase() === "designer@studio.com") {
            setError("This email address is already registered.");
            setLoading(false);
            return;
          }

          const newUser: User = {
            id: "user-" + Math.random().toString(36).substring(2, 9),
            email: email.toLowerCase(),
            name: name,
            role: "Designer",
            hourlyRate: 60, // default rate
            avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces`, // Professional avatar
          };

          users.push(newUser);
          localStorage.setItem(storedUsersKey, JSON.stringify(users));
          
          // Secure password mapping (simulation)
          localStorage.setItem(`pwd_${newUser.id}`, password);

          onLoginSuccess(newUser);
        } else {
          // Log In flow
          if (email.toLowerCase() === "designer@studio.com" && password === "designer123") {
            const demoUser: User = {
              id: "demo-designer-id",
              email: "designer@studio.com",
              name: "Alex Chen",
              role: "Creative Lead",
              hourlyRate: 60,
              avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
            };
            onLoginSuccess(demoUser);
          } else {
            const matchedUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
            const correctPwd = matchedUser ? localStorage.getItem(`pwd_${matchedUser.id}`) : null;

            if (matchedUser && correctPwd === password) {
              onLoginSuccess(matchedUser);
            } else {
              setError("Invalid email address or password.");
            }
          }
        }
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 900);
  };

  return (
    <div className="flex-grow flex flex-col min-h-screen bg-[#faf8ff] text-[#131b2e] selection:bg-[#c3c0ff] selection:text-[#0f0069]">
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[420px]">
          {/* Brand Identity */}
          <div className="text-center mb-8">
            <h1 className="font-sans text-[32px] font-semibold text-[#1f108e] tracking-tight leading-none">
              ChronoFocus
            </h1>
            <p className="text-sm text-[#464553] mt-2.5">
              Precision time management for professionals.
            </p>
          </div>

          {/* Login / Registration Card */}
          <div className="bg-[#ffffff] border border-[#c8c4d5] p-8 shadow-sm rounded-none">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-2 border-[#ba1a1a] flex gap-3 text-sm text-[#93000a]">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#ba1a1a]" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div>
                  <label
                    className="block text-[11px] font-semibold tracking-wider text-[#464553] mb-1.5 uppercase"
                    htmlFor="name"
                  >
                    Full Name
                  </label>
                  <input
                    className="w-full bg-transparent border border-[#c8c4d5] rounded-none px-4 py-3 placeholder:text-gray-400 focus:border-[#1f108e] focus:ring-1 focus:ring-[#1f108e] outline-none transition-all text-sm"
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Chen"
                    required
                  />
                </div>
              )}

              <div>
                <label
                  className="block text-[11px] font-semibold tracking-wider text-[#464553] mb-1.5 uppercase"
                  htmlFor="email"
                >
                  Email Address
                </label>
                <input
                  className="w-full bg-transparent border border-[#c8c4d5] rounded-none px-4 py-3 placeholder:text-gray-400 focus:border-[#1f108e] focus:ring-1 focus:ring-[#1f108e] outline-none transition-all text-sm"
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@studio.com"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    className="block text-[11px] font-semibold tracking-wider text-[#464553] uppercase"
                    htmlFor="password"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    className="w-full bg-transparent border border-[#c8c4d5] rounded-none px-4 py-3 placeholder:text-gray-400 focus:border-[#1f108e] focus:ring-1 focus:ring-[#1f108e] outline-none transition-all text-sm"
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1f108e] transition-colors"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-4">
                <button
                  className="w-full bg-[#1f108e] text-white font-semibold py-3.5 px-6 rounded-none hover:opacity-90 active:opacity-100 transition-opacity flex justify-center items-center gap-2 text-sm disabled:opacity-50"
                  type="submit"
                  disabled={loading}
                >
                  <span>{loading ? "Authenticating..." : isSignUp ? "Sign Up" : "Login"}</span>
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleUseDemo}
                    className="w-full text-center text-xs text-[#1f108e] bg-[#f2f3ff] hover:bg-[#e2e7ff] py-2 px-3 tracking-wide transition-colors font-semibold"
                  >
                    🚀 Fill with Demo Account
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Toggle Action */}
          <div className="mt-6 text-center">
            <p className="text-xs text-[#464553]">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                }}
                className="text-[#1f108e] font-semibold hover:underline ml-1"
              >
                {isSignUp ? "Log in here" : "Request Access / Sign up"}
              </button>
            </p>
          </div>
        </div>
      </main>

      {/* Login Footer */}
      <footer className="w-full py-8 px-6 md:px-12 bg-white border-t border-[#c8c4d5] mt-auto">
        <div className="max-w-[1024px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="font-semibold tracking-wider text-[#1f108e] uppercase">
            ChronoFocus
          </div>
          <div className="text-[#464553] text-center md:text-left">
            © 2026 ChronoFocus. Designed for creative professionals.
          </div>
          <div className="flex gap-6 text-[#464553]">
            <a href="#" className="hover:text-[#1f108e] transition-colors">Support</a>
            <a href="#" className="hover:text-[#1f108e] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1f108e] transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
