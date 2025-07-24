import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Invitacion from './components/Invitacion.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Invitacion />
  </StrictMode>,
)
