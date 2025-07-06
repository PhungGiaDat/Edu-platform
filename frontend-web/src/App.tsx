
import Flashcard from './components/Flashcard';
import './App.css';
import elephent from "../public/flashcards/elephent.jpg"
import tiger from "../public/flashcards/tiger.jpg"
import table from "../public/flashcards/table.jpg"

function App() {
  return (
    <div className="mx-auto flex items-center justify-center bg-gradient-to-br from-yellow-100 to-pink-100">
      <Flashcard
        word="table"
        imgUrl={table}
        qrData="CARD-TABLE-001"
        bgUrl="https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg"
      />
    </div>
  );
}

export default App