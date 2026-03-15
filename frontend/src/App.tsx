import { useState } from 'react'
import './App.css'
import TranslationPage from './pages/TranslationPage'
import PdfUploadDemo from './pages/PdfUploadDemo'

function App() {
  const [currentPage, setCurrentPage] = useState<'translation' | 'pdf'>('translation')

  return (
    <div>
      <nav className="flex gap-4 p-4 border-b">
        <button
          onClick={() => setCurrentPage('translation')}
          className={`px-4 py-2 rounded ${currentPage === 'translation' ? 'bg-black text-white' : 'bg-gray-100'}`}
        >
          Translation Demo
        </button>
        <button
          onClick={() => setCurrentPage('pdf')}
          className={`px-4 py-2 rounded ${currentPage === 'pdf' ? 'bg-black text-white' : 'bg-gray-100'}`}
        >
          PDF Upload Demo
        </button>
      </nav>
      {currentPage === 'translation' ? <TranslationPage /> : <PdfUploadDemo />}
    </div>
  )
}

export default App
