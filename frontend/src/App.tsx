import { useState } from 'react';
import { Layout } from './components/layout/Layout';
import { InventoryPage } from './pages/inventory/InventoryPage';

function App() {
  const [currentPath, setCurrentPath] = useState('/inventario');

  const renderPage = () => {
    switch (currentPath) {
      case '/inventario':
        return <InventoryPage />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400">
              <p className="text-6xl mb-4">🏥</p>
              <p className="text-xl font-medium">Bienvenido al Sistema de Clínica</p>
              <p className="text-sm mt-2">Seleccione una opción del menú</p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout currentPath={currentPath} onNavigate={setCurrentPath}>
      {renderPage()}
    </Layout>
  );
}

export default App;