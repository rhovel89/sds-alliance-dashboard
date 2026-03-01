import React from "react";
import { Navigate } from "react-router-dom";

export default function RouteRedirect(props: { to: string }) {
  return <Navigate to={props.to} replace />;
}
