
import React, { useState } from 'react';
import { BuildingIcon, UserIcon, LockIcon } from './Icons';

interface LoginPageProps {
  onLogin: (id: string, pass: string) => void;
  error: string | null;
  onBack?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, error, onBack }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(id, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-24 w-auto text-brand-600 flex justify-center">
            <BuildingIcon className="h-24 w-24" />
          </div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-slate-900">
            Al Ghafoor Eden
          </h2>
          <p className="mt-2 text-center text-lg text-slate-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-lg shadow-sm -space-y-px">
            <div>
              <label htmlFor="user-id" className="sr-only">User ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="user-id"
                  name="id"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-4 pl-10 border-2 border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-t-lg focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-lg"
                  placeholder="User ID (e.g., 101, admin)"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password-input"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-4 pl-10 border-2 border-slate-300 placeholder-slate-400 text-slate-900 bg-white rounded-b-lg focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-lg"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg relative" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
            >
              Sign in
            </button>
          </div>
        </form>
         {onBack && (
            <div className="text-center mt-4">
                <button onClick={onBack} className="font-medium text-brand-600 hover:text-brand-500">
                    &larr; Back to Home
                </button>
            </div>
        )}
        <p className="mt-2 text-center text-sm text-slate-500">
           President: Arbab Khan
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
