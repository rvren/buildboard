import { createContext, useContext } from "react";

export interface DragState {
  /** Container node id currently highlighted as the drop target. */
  dropParentId: string | null;
  /** True while a drag (palette or node) is in progress. */
  isDragging: boolean;
}

export const DragStateContext = createContext<DragState>({
  dropParentId: null,
  isDragging: false,
});

export const useDragState = () => useContext(DragStateContext);
