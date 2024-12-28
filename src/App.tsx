import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import HNLiveTerminal from "./pages/hnlive";

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HNLiveTerminal />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;
