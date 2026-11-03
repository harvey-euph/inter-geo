import { createContext } from 'react';

export interface InfoEmbedSlot {
  index: number;
  removed: boolean;
  occurrence: number;
}

export interface InfoEmbedSource {
  file: string;
  cardId: string;
  /** Next visible copy of this token, in card render order. */
  claimSlot: (token: string) => InfoEmbedSlot;
  hideSlot: (token: string, occurrence: number) => void;
}

export const InfoEmbedSourceContext = createContext<InfoEmbedSource | null>(null);
