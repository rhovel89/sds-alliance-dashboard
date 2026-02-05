import './lib/supabaseClient'; // 🔥 FORCE INCLUDE — DO NOT REMOVE

import AppRoutes from './routes/AppRoutes';

export default function App() {
  return <AppRoutes />;
}
console.log("SESSION CHECK", localStorage);
