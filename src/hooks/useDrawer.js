import { useEffect, useCallback } from "react";
export function useDrawer(menuOpen, setMenuOpen, menuRef, menuButton) {
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuButton.current?.focus();
  }, [setMenuOpen, menuButton]);
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeMenu();
      if (e.key === "Tab") {
        const els = [
          menuButton.current,
          ...menuRef.current.querySelectorAll("button"),
        ];
        const i = els.indexOf(document.activeElement);
        e.preventDefault();
        els[(i + (e.shiftKey ? -1 : 1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [menuOpen, menuRef, menuButton, closeMenu]);
  return closeMenu;
}
