import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Cards from './pages/Cards';
import SealedProducts from './pages/SealedProducts';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        {/* Navigation */}
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <NavLink to="/" className="flex items-center">
                <span className="text-xl font-bold text-white">OP TCG</span>
              </NavLink>

              <div className="flex items-center space-x-4">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`
                  }
                >
                  Collections
                </NavLink>
                <NavLink
                  to="/cards"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`
                  }
                >
                  All Cards
                </NavLink>
                <NavLink
                  to="/sealed"
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`
                  }
                >
                  Booster Boxes
                </NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/sealed" element={<SealedProducts />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 py-4 mt-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
            Data provided by JustTCG API. Not affiliated with Bandai.
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
