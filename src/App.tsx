import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HNLiveTerminal from "./pages/hnlive";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HNLiveTerminal />} />
      </Routes>
    </Router>
  );
}
export default App;
