import { Routes, Route } from "react-router-dom";
import RequireAlliance from "./RequireAlliance";

import MyAlliance from "../pages/MyAlliance";
import EventsPage from "../pages/EventsPage";
import AllianceHQMap from "../pages/dashboard/AllianceHQMap";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="dashboard/:alliance_id" element={<RequireAlliance />}>
        <Route index element={<MyAlliance />} />
        <Route path="hq-map" element={<AllianceHQMap />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
    </Routes>
  );
}
