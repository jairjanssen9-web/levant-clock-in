import React, { useState } from 'react';
import { Button } from './Button';
import { ShieldCheck, Mail, Lock, KeyRound, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminSetupProps {
  onComplete: () => void;
}

export const AdminSetup: React.FC<AdminSetupProps> = ({ onComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || pin.length < 4) {
      setError("Vul alle velden correct in. Pincode moet minimaal 4 cijfers zijn.");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // 1. Create Auth User in Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Store the App PIN and link to admin user so setup is remembered
      const { error: dbError } = await supabase
        .from('settings')
        .insert([{
          pin_code: pin,
          admin_user_id: authData.user?.id ?? null,
        }]);

      if (dbError) throw dbError;

      // Success
      onComplete();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Er ging iets mis bij het instellen.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 bg-[url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      
      <div className="relative z-10 w-full max-w-lg bg-neutral-900 border border-levant-gold rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-levant-gold rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(212,175,55,0.4)]">
            <ShieldCheck size={40} />
          </div>
        </div>

        <h1 className="text-4xl font-serif text-white text-center mb-2">Welkom bij Levant</h1>
        <p className="text-neutral-400 text-center mb-10">Eerste installatie & Admin Account aanmaken</p>

        <form onSubmit={handleSetup} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase text-levant-gold tracking-widest mb-2">
              <Mail size={14}/> Admin Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none transition-colors"
              placeholder="admin@levant.nl"
            />
          </div>

          <div>
             <label className="flex items-center gap-2 text-xs font-bold uppercase text-levant-gold tracking-widest mb-2">
              <Lock size={14}/> Admin Wachtwoord
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none transition-colors"
              placeholder="Veilig wachtwoord voor herstel"
            />
            <p className="text-xs text-neutral-600 mt-2">Gebruikt om pincode te resetten indien vergeten.</p>
          </div>

          <div className="pt-4 border-t border-neutral-800">
             <label className="flex items-center gap-2 text-xs font-bold uppercase text-levant-gold tracking-widest mb-2">
              <KeyRound size={14}/> Dagelijkse Pincode
            </label>
            <input 
              type="text" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-neutral-800 border-2 border-neutral-700 text-white rounded-xl p-4 focus:border-levant-gold outline-none text-center text-2xl tracking-[0.5em]"
              placeholder="1234"
              maxLength={6}
            />
            <p className="text-xs text-neutral-600 mt-2 text-center">Dit is de code die je dagelijks gebruikt om in te loggen.</p>
          </div>

          {error && (
            <div className="bg-red-900/20 text-red-500 p-4 rounded-xl text-sm font-bold text-center border border-red-900/50">
              {error}
            </div>
          )}

          <Button type="submit" size="xl" className="w-full mt-6" disabled={isLoading}>
            {isLoading ? <Loader className="animate-spin" /> : 'Systeem Configureren'}
          </Button>
        </form>
      </div>
    </div>
  );
};
