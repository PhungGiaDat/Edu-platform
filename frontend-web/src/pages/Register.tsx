import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Register: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock register
        console.log("Register with", name, email, password);
        navigate('/courses');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border-2 border-neutral-200 p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-neutral-800 mb-2">Create Profile</h1>
                    <p className="text-neutral-500">Start learning languages with AR today!</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-neutral-600 font-bold mb-2 text-sm uppercase">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-neutral-100 border-2 border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary font-medium"
                            placeholder="Your Name"
                        />
                    </div>
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
                        className="w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-4 rounded-xl border-b-4 border-secondary-dark active:border-b-0 active:translate-y-1 transition-all mt-6"
                    >
                        CREATE ACCOUNT
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-neutral-500 font-bold">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
