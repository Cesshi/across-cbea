import { create } from 'zustand';

interface SidebarState {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  openSubmenu: string | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (val: boolean) => void;
  toggleSubmenu: (key: string) => void;
  setOpenSubmenu: (key: string | null) => void;
  closeMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  isExpanded: true,
  isMobileOpen: false,
  isHovered: false,
  openSubmenu: null,

  toggleSidebar() {
    set({ isExpanded: !get().isExpanded });
  },

  toggleMobileSidebar() {
    set({ isMobileOpen: !get().isMobileOpen });
  },

  setIsHovered(val: boolean) {
    set({ isHovered: val });
  },

  toggleSubmenu(key: string) {
    const current = get().openSubmenu;
    set({ openSubmenu: current === key ? null : key });
  },

  setOpenSubmenu: (key: string | null) => set({ openSubmenu: key }),

  closeMobile() {
    set({ isMobileOpen: false });
  },
}));
