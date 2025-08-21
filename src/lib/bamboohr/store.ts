import { atom, useAtom } from "jotai";

import { atomStore } from "~/lib/jotai";

const atom__isModalOpen = atom(false);

export function useModal() {
  const [isOpen, setOpen] = useAtom(atom__isModalOpen);
  return { isOpen, setOpen };
}

export function openModal() {
  atomStore.set(atom__isModalOpen, true);
}
