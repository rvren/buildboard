import { createContext, useContext } from "react";

/** The current item when rendering inside a repeater; undefined otherwise. */
export const RepeaterContext = createContext<unknown>(undefined);

export const useRepeaterItem = () => useContext(RepeaterContext);
