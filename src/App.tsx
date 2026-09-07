import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import LangLayout from "./routes/LangLayout";
import RootRedirect from "./routes/RootRedirect";
import NotFound from "./routes/NotFound";
import Home from "./routes/Home";
import Projects from "./routes/Projects";
import Articles from "./routes/Articles";
import Article from "./routes/Article";
import Videos from "./routes/Videos";
import { LangProvider } from "./i18n/LangProvider";

const AdminLayout = lazy(() => import("./routes/admin/AdminLayout"));
const AdminHome = lazy(() => import("./routes/admin/AdminHome"));
const ProfileEditor = lazy(() => import("./routes/admin/ProfileEditor"));
const ProjectsEditor = lazy(() => import("./routes/admin/ProjectsEditor"));
const VideosEditor = lazy(() => import("./routes/admin/VideosEditor"));
const ArticlesEditor = lazy(() => import("./routes/admin/ArticlesEditor"));
const StringsEditor = lazy(() => import("./routes/admin/StringsEditor"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:lang" element={<LangLayout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="articles" element={<Articles />} />
        <Route path="articles/:slug" element={<Article />} />
        <Route path="videos" element={<Videos />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/admin"
        element={
          <Suspense fallback={<p style={{ padding: "var(--space-8)" }}>Loading…</p>}>
            <AdminLayout />
          </Suspense>
        }
      >
        <Route index element={<AdminHome />} />
        <Route path="profile" element={<ProfileEditor />} />
        <Route path="projects" element={<ProjectsEditor />} />
        <Route path="videos" element={<VideosEditor />} />
        <Route path="articles" element={<ArticlesEditor />} />
        <Route path="strings" element={<StringsEditor />} />
      </Route>
      <Route
        path="*"
        element={
          <LangProvider lang="en">
            <NotFound />
          </LangProvider>
        }
      />
    </Routes>
  );
}
