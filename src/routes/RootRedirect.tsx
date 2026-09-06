import { Navigate } from "react-router-dom";
import { negotiateLang } from "../i18n/negotiate";

export default function RootRedirect() {
  return <Navigate to={`/${negotiateLang()}`} replace />;
}
