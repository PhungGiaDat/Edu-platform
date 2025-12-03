import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock login
        console.log("Login with", email, password);
        navigate('/courses');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-neutral-200 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-neutral-800 mb-2">Welcome Back!</h1>
                    <p className="text-neutral-500">Log in to continue your learning journey.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-neutral-600 font-bold mb-2 text-sm uppercase">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-neutral-100 border-2 border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary font-medium"
                            placeholder="hello@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-neutral-600 font-bold mb-2 text-sm uppercase">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-neutral-100 border-2 border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary font-medium"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl border-b-4 border-primary-dark active:border-b-0 active:translate-y-1 transition-all mt-6"
                    >
                        LOG IN
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-neutral-500 font-bold">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-secondary hover:underline">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
