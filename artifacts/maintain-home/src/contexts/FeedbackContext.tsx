import { createContext, useContext, type ReactNode } from "react";

interface FeedbackContextValue {
  openFeedback: () => void;
}

const FeedbackContext = createContext<FeedbackContextValue>({ openFeedback: () => {} });

export function useFeedbackModal() {
  return useContext(FeedbackContext);
}

export function FeedbackProvider({
  children,
  onOpen,
}: {
  children: ReactNode;
  onOpen: () => void;
}) {
  return (
    <FeedbackContext.Provider value={{ openFeedback: onOpen }}>
      {children}
    </FeedbackContext.Provider>
  );
}
