import { useState } from 'react';
import Flashcard from './components/Flashcard';
import './App.css';
import elephent from "../public/flashcards/elephent.jpg"

function App() {
  return (
    <div className="mx-auto flex items-center justify-center bg-gradient-to-br from-yellow-100 to-pink-100">
      <Flashcard
        word="elephant"
        imgUrl={elephent}
        qrData="CARD-ELEPHANT-001"
        bgUrl="https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg"
      />
    </div>
  );
}

export default App