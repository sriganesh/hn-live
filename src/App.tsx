import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import HNLiveTerminal from "./pages/hnlive";

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HNLiveTerminal />}>
            <Route path="item/:itemId" element={null} />
            <Route path="item/:itemId/comment/:commentId" element={null} />
          </Route>
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
