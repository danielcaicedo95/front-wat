"use client";
import { useState, useEffect } from "react";

export default function LoginGate({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const auth = localStorage.getItem("wappbot_auth");
        if (auth === "true") setIsLoggedIn(true);
        setLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Usamos la misma clave de la API como contraseña del panel por simplicidad
        const expected = process.env.NEXT_PUBLIC_API_KEY || process.env.NEXT_PUBLIC_DASHBOARD_API_KEY || "123456";
        
        if (password === expected) {
            localStorage.setItem("wappbot_auth", "true");
            setIsLoggedIn(true);
            setError("");
        } else {
            setError("Contraseña incorrecta");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm border border-gray-100">
                    <div className="text-center mb-8">
                        <div className="h-12 w-12 bg-blue-600 rounded-lg mx-auto flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">WappBot</h2>
                        <p className="text-gray-500 text-sm mt-1">Ingresa para continuar</p>
                    </div>
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border-gray-300 rounded-lg shadow-sm p-3 bg-gray-50 text-gray-900 border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Contraseña de acceso"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md hover:shadow-lg active:transform active:scale-[0.98]"
                        >
                            Entrar al sistema
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
