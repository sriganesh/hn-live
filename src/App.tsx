import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import HNLiveTerminal from "./pages/hnlive";
import { FrontPage } from "./components/FrontPage";
import { ShowPage } from "./components/ShowPage";
import { AskPage } from "./components/AskPage";
import { JobsPage } from "./components/JobsPage";
import { BestPage } from "./components/BestPage";

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HNLiveTerminal />}>
            <Route path="front" element={null} />
            <Route path="item/:itemId" element={null} />
            <Route path="item/:itemId/comment/:commentId" element={null} />
            <Route path="show" element={null} />
            <Route path="ask" element={null} />
            <Route path="jobs" element={null} />
            <Route path="best" element={null} />
          </Route>
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
