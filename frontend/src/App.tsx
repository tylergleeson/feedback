import { Routes, Route, Link, useLocation } from 'react-router-dom';
import PoemGenerator from './pages/PoemGenerator';
import PoemReview from './pages/PoemReview';
import RevisionReview from './pages/RevisionReview';
import GuideEditor from './pages/GuideEditor';
import History from './pages/History';

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-indigo-600 text-white'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  );
}

function App() {
  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-semibold text-gray-900">
              Poetry Feedback Loop
            </Link>
            <div className="flex gap-2">
              <NavLink to="/">Generate</NavLink>
              <NavLink to="/guide">Guide</NavLink>
              <NavLink to="/history">History</NavLink>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<PoemGenerator />} />
          <Route path="/poem/:id" element={<PoemReview />} />
          <Route path="/poem/:id/revision/:revId" element={<RevisionReview />} />
          <Route path="/guide" element={<GuideEditor />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
