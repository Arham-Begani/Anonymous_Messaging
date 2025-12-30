import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    // StrictMode can double-invoke effects in dev, good for debugging but handle socket carefully
    // <React.StrictMode> 
    <App />
    // </React.StrictMode>,
)
