useEffect(() => {
  if (!activeAllianceId) return;

  const normalizedAllianceId = activeAllianceId.toUpperCase();

  supabase
    .from("alliance_hq_map")
    .select("*")
    .eq("alliance_id", normalizedAllianceId)
    .then(({ data, error }) => {
      if (error) {
        console.error("HQ MAP LOAD ERROR", error);
        setSlots([]);
        return;
      }

      setSlots(data || []);
    });
}, [activeAllianceId]);
