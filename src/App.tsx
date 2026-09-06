import { Route, Routes } from "react-router-dom";
import LangLayout from "./routes/LangLayout";
import RootRedirect from "./routes/RootRedirect";
import NotFound from "./routes/NotFound";
import Home from "./routes/Home";
import Projects from "./routes/Projects";
import Videos from "./routes/Videos";

function Placeholder({ name }: { name: string }) {
  return <main data-testid={`placeholder-${name}`} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:lang" element={<LangLayout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="articles" element={<Placeholder name="articles" />} />
        <Route path="articles/:slug" element={<Placeholder name="article" />} />
        <Route path="videos" element={<Videos />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
