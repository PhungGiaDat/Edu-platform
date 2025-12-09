import Flashcard from "../components/Flashcard";
import elephant from "../../public/assets/flashcards/elephent.jpg";

const FlashcardPage = () => {
  return (
    <div className="h-full w-full flex items-center justify-center py-8 px-4 bg-white/90 backdrop-blur-sm">
      <div className="transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <Flashcard
          word="elephant"
          imgUrl={elephant}
          qrData="ele123"
          bgUrl="https://cdn.pixabay.com/photo/2016/11/14/03/22/elephant-1822636_1280.jpg"
        />
      </div>
    </div>
  );
};

export default FlashcardPage;