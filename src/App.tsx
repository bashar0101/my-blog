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
