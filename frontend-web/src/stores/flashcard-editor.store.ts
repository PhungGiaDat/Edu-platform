// frontend-web/src/stores/flashcard-editor.store.ts
import { create } from 'zustand';
import { nanoid } from 'nanoid';

// Element types for the canvas
export type ElementType = 'text' | 'image' | 'qr';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontStyle: 'normal' | 'bold' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  backgroundColor: string | null;
  padding: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  objectFit: 'cover' | 'contain' | 'fill';
  borderRadius: number;
}

export interface QRElement extends BaseElement {
  type: 'qr';
  qrData: string;
  qrSize: number;
  showQR: boolean;
}

export type CanvasElement = TextElement | ImageElement | QRElement;

// Canvas dimensions (3.5 x 2.7 inch at 300dpi)
export const CANVAS_WIDTH = 1056;
export const CANVAS_HEIGHT = 816;

interface HistoryState {
  elements: CanvasElement[];
  selectedId: string | null;
}

interface FlashcardEditorState {
  // Canvas elements
  elements: CanvasElement[];
  selectedId: string | null;
  
  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;
  
  // QR display state
  showQR: boolean;
  qrData: string;
  
  // Export state
  isExporting: boolean;
  
  // Card metadata
  qrId: string;
  frontText: string;
  backText: string;
  
  // Actions
  addElement: (element: Omit<CanvasElement, 'id' | 'zIndex'>) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  deleteElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  
  // Z-index management
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  
  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // QR actions
  setShowQR: (show: boolean) => void;
  setQRData: (data: string) => void;
  
  // Metadata actions
  setQrId: (id: string) => void;
  setFrontText: (text: string) => void;
  setBackText: (text: string) => void;
  
  // Element manipulation
  addTextElement: () => void;
  addImageElement: (src: string) => void;
  addQRElement: () => void;
  
  // Export state
  setIsExporting: (exporting: boolean) => void;
  
  // Reset
  reset: () => void;
  loadFromState: (state: Partial<{
    elements: CanvasElement[];
    qrId: string;
    frontText: string;
    backText: string;
  }>) => void;
}

// Generate unique ID
const generateId = () => nanoid(10);

// Get max zIndex
const getMaxZIndex = (elements: CanvasElement[]): number => {
  if (elements.length === 0) return 0;
  return Math.max(...elements.map((el) => el.zIndex));
};

// Initial state
const initialElements: CanvasElement[] = [
  {
    id: generateId(),
    type: 'text',
    x: 100,
    y: 100,
    width: 400,
    height: 80,
    rotation: 0,
    opacity: 1,
    zIndex: 1,
    text: 'Front Text',
    fontSize: 48,
    fontFamily: 'system-ui',
    fontColor: '#1e3a8a',
    fontStyle: 'bold',
    textAlign: 'center',
    backgroundColor: null,
    padding: 16,
  },
  {
    id: generateId(),
    type: 'text',
    x: 100,
    y: 250,
    width: 400,
    height: 60,
    rotation: 0,
    opacity: 1,
    zIndex: 2,
    text: 'Back Text',
    fontSize: 32,
    fontFamily: 'system-ui',
    fontColor: '#166534',
    fontStyle: 'normal',
    textAlign: 'center',
    backgroundColor: null,
    padding: 12,
  },
];

const initialHistoryState: HistoryState = {
  elements: initialElements,
  selectedId: null,
};

export const useFlashcardEditorStore = create<FlashcardEditorState>((set, get) => ({
  elements: initialElements,
  selectedId: null,
  history: [initialHistoryState],
  historyIndex: 0,
  showQR: true,
  qrData: 'flashcard-preview',
  isExporting: false,
  qrId: '',
  frontText: 'Front Text',
  backText: 'Back Text',

  addElement: (element) => {
    const state = get();
    const maxZ = getMaxZIndex(state.elements);
    const newElement = {
      ...element,
      id: generateId(),
      zIndex: maxZ + 1,
    } as CanvasElement;
    
    set({ elements: [...state.elements, newElement] });
    get().saveToHistory();
  },

  updateElement: (id, updates) => {
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } as CanvasElement : el
      ),
    }));
  },

  deleteElement: (id) => {
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
    get().saveToHistory();
  },

  duplicateElement: (id) => {
    const state = get();
    const element = state.elements.find((el) => el.id === id);
    if (!element) return;

    const maxZ = getMaxZIndex(state.elements);
    const newElement = {
      ...element,
      id: generateId(),
      x: element.x + 20,
      y: element.y + 20,
      zIndex: maxZ + 1,
    };

    set({
      elements: [...state.elements, newElement as CanvasElement],
      selectedId: newElement.id,
    });
    get().saveToHistory();
  },

  selectElement: (id) => {
    set({ selectedId: id });
  },

  bringToFront: (id) => {
    const state = get();
    const maxZ = getMaxZIndex(state.elements);
    set({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, zIndex: maxZ + 1 } : el
      ),
    });
    get().saveToHistory();
  },

  sendToBack: (id) => {
    const state = get();
    const minZ = state.elements.length > 0 
      ? Math.min(...state.elements.map((el) => el.zIndex)) 
      : 0;
    set({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, zIndex: minZ - 1 } : el
      ),
    });
    get().saveToHistory();
  },

  saveToHistory: () => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      elements: JSON.parse(JSON.stringify(state.elements)),
      selectedId: state.selectedId,
    });
    
    // Limit history to 50 items
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) return;
    
    const newIndex = state.historyIndex - 1;
    const historyState = state.history[newIndex];
    
    set({
      elements: JSON.parse(JSON.stringify(historyState.elements)),
      selectedId: historyState.selectedId,
      historyIndex: newIndex,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) return;
    
    const newIndex = state.historyIndex + 1;
    const historyState = state.history[newIndex];
    
    set({
      elements: JSON.parse(JSON.stringify(historyState.elements)),
      selectedId: historyState.selectedId,
      historyIndex: newIndex,
    });
  },

  setShowQR: (show) => {
    set({ showQR: show });
  },

  setQRData: (data) => {
    set({ qrData: data });
  },

  setQrId: (id) => {
    set({ qrId: id, qrData: id });
  },

  setFrontText: (text) => {
    set({ frontText: text });
  },

  setBackText: (text) => {
    set({ backText: text });
  },

  addTextElement: () => {
    const state = get();
    const maxZ = getMaxZIndex(state.elements);
    
    const newTextElement: TextElement = {
      id: generateId(),
      type: 'text',
      x: CANVAS_WIDTH / 2 - 150,
      y: CANVAS_HEIGHT / 2 - 40,
      width: 300,
      height: 80,
      rotation: 0,
      opacity: 1,
      zIndex: maxZ + 1,
      text: 'New Text',
      fontSize: 32,
      fontFamily: 'system-ui',
      fontColor: '#000000',
      fontStyle: 'normal',
      textAlign: 'center',
      backgroundColor: null,
      padding: 8,
    };
    
    set({
      elements: [...state.elements, newTextElement],
      selectedId: newTextElement.id,
    });
    get().saveToHistory();
  },

  addImageElement: (src) => {
    const state = get();
    const maxZ = getMaxZIndex(state.elements);
    
    const newImageElement: ImageElement = {
      id: generateId(),
      type: 'image',
      x: CANVAS_WIDTH / 2 - 150,
      y: CANVAS_HEIGHT / 2 - 100,
      width: 300,
      height: 200,
      rotation: 0,
      opacity: 1,
      zIndex: maxZ + 1,
      src,
      objectFit: 'cover',
      borderRadius: 8,
    };
    
    set({
      elements: [...state.elements, newImageElement],
      selectedId: newImageElement.id,
    });
    get().saveToHistory();
  },

  addQRElement: () => {
    const state = get();
    const maxZ = getMaxZIndex(state.elements);
    
    const newQRElement: QRElement = {
      id: generateId(),
      type: 'qr',
      x: CANVAS_WIDTH - 180,
      y: CANVAS_HEIGHT - 180,
      width: 150,
      height: 150,
      rotation: 0,
      opacity: 1,
      zIndex: maxZ + 1,
      qrData: state.qrData || 'flashcard',
      qrSize: 120,
      showQR: true,
    };
    
    set({
      elements: [...state.elements, newQRElement],
      selectedId: newQRElement.id,
    });
    get().saveToHistory();
  },

  setIsExporting: (exporting) => {
    set({ isExporting: exporting });
  },

  reset: () => {
    set({
      elements: JSON.parse(JSON.stringify(initialElements)),
      selectedId: null,
      history: [initialHistoryState],
      historyIndex: 0,
      showQR: true,
      qrData: 'flashcard-preview',
      isExporting: false,
      qrId: '',
      frontText: 'Front Text',
      backText: 'Back Text',
    });
  },

  loadFromState: (state) => {
    set({
      elements: state.elements || initialElements,
      qrId: state.qrId || '',
      frontText: state.frontText || 'Front Text',
      backText: state.backText || 'Back Text',
      history: [{
        elements: state.elements || initialElements,
        selectedId: null,
      }],
      historyIndex: 0,
    });
  },
}));

export default useFlashcardEditorStore;
