import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import Loader from './components/Loader.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={<Loader label="Loading interface" />}>
      <Home />
    </Suspense>
  </React.StrictMode>
);
