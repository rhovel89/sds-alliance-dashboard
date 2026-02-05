import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const login = async () => {
    await supabase.auth.signInWithOtp({
      email: prompt('Enter your email'),
      options: {
        emailRedirectTo: window.location.origin + '/dashboard'
      }
    });
    alert('Check your email for the login link');
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <button onClick={login}>Login with Email</button>
    </div>
  );
}
