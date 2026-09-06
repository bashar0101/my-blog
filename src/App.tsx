import { Route, Routes } from "react-router-dom";
import LangLayout from "./routes/LangLayout";
import RootRedirect from "./routes/RootRedirect";
import NotFound from "./routes/NotFound";

function Placeholder({ name }: { name: string }) {
  return <main data-testid={`placeholder-${name}`} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/:lang" element={<LangLayout />}>
        <Route index element={<Placeholder name="home" />} />
        <Route path="projects" element={<Placeholder name="projects" />} />
        <Route path="articles" element={<Placeholder name="articles" />} />
        <Route path="articles/:slug" element={<Placeholder name="article" />} />
        <Route path="videos" element={<Placeholder name="videos" />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
