import Flashcard from "../components/Flashcard";
import elephant from "../../public/flashcards/elephent.jpg"

const FlashcardPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-100">
      <Flashcard
        word="elephant"
        imgUrl={elephant}
        qrData="ele123"
        bgUrl="https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg"
      />
    </div>
  );
};

export default FlashcardPage;