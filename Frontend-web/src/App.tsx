import Flashcard from './components/Flashcard';

function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 to-pink-100">
      <Flashcard
        word="elephant"
        imgUrl="https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg"
        qrData="CARD-ELEPHANT-001"
        bgUrl="https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg"
      />
    </div>
  );
}

export default App;
