import { useAchievements } from "../hooks/useAchievements";
import { useMyAchievements } from "../hooks/useMyAchievements";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../contexts/AuthContext";

export default function MyAchievements() {
  const { session } = useAuth();
  const { list } = useAchievements(789);
  const mine = useMyAchievements();

  async function request(id: string) {
    if (!session) return;
    await supabase.from("user_achievements").insert({
      user_id: session.user.id,
      achievement_id: id,
      goal: 100
    });
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>Achievements</h2>

      {list.map(a => {
        const m = mine.find(x => x.achievement_id === a.id);
        return (
          <div key={a.id}>
            <b>{a.title}</b> — {a.description}
            {m ? (
              <span> (Progress: {m.progress}/{m.goal})</span>
            ) : (
              <button onClick={() => request(a.id)}>Request</button>
            )}
          </div>
        );
      })}
    </div>
  );
}
