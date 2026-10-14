import { GameSetup } from './pages/GameSetup';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { StudentDisplay } from './pages/StudentDisplay';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { useGame, useRoute } from './hooks/useGame';

/** Optional Teacher Panel: live controls, or the final results once the game is completed. */
function TeacherRoute() {
  const { state } = useGame();
  if (!state || state.phase !== 'completed') return <TeacherDashboard />;
  return <ResultsPage showControls />;
}

export default function App() {
  const route = useRoute();
  switch (route) {
    case '/setup':
      return <GameSetup />;
    case '/teacher':
    case '/results':
      return <TeacherRoute />;
    case '/display':
    case '/play':
      return <StudentDisplay />;
    default:
      return <HomePage />;
  }
}
