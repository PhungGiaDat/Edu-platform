import CameraCapture from "../components/CameraCapture";

const CameraScanPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <CameraCapture />
      </div>
    </div>
  );
};

export default CameraScanPage;