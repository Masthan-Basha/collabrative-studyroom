import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#252538',
            color: '#fff',
            border: '1px solid #333355',
            borderRadius: '12px',
            fontFamily: '"DM Sans", sans-serif',
          },
          success: { iconTheme: { primary: '#34d399', secondary: '#252538' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#252538' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
