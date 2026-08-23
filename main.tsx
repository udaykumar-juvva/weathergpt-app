import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WeatherGPT from './weathergpt_app (2)';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WeatherGPT />
  </StrictMode>,
);
