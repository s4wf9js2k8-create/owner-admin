import React from "react";
import {
  LayoutDashboard,
  Building2,
  Blocks,
  CreditCard,
  Users,
  LifeBuoy,
  ScrollText,
  Settings,
  Menu,
  X,
  CalendarDays,
  ClipboardList,
  ChartNoAxesCombined,
} from "lucide-react";
const pages = [
  ["Overview", LayoutDashboard],
  ["Organisations", Building2],
  ["Company Profile", Building2],
  ["Modules", Blocks],
  ["Subscriptions", CreditCard],
  ["Users", Users],
  ["Support", LifeBuoy],
  ["Activity Logs", ScrollText],
  ["Settings", Settings],
];
export default function Navigation({ controller }) {
  const {
    menuButton,
    menuOpen,
    setMenuOpen,
    customer,
    active,
    setCustomer,
    closeMenu,
    menuRef,
    customerPage,
    page,
    setCustomerPage,
    navigate,
  } = controller;
  return (
    <>
      <header className="topbar">
        <button
          ref={menuButton}
          className="menu-toggle"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={menuOpen}
          aria-controls="navigation"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <span className="topbrand">
          {customer ? active.name : "Owner Admin"}
        </span>
        <span className="tag">Fictional demo</span>
        {customer && (
          <button
            className="header-action"
            onClick={() => {
              setCustomer(false);
              setMenuOpen(false);
            }}
          >
            Owner console
          </button>
        )}
      </header>
      {menuOpen && (
        <button
          className="nav-overlay"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}
      <aside
        ref={menuRef}
        id="navigation"
        className={menuOpen ? "menu-open" : ""}
        inert={!menuOpen ? "" : undefined}
      >
        <div className="brand">{customer ? active.name : "Owner Admin"}</div>
        <div className="sub">
          {customer ? "Customer workspace" : "Platform management"}
        </div>
        <nav aria-label="Main navigation">
          {(customer
            ? [["Dashboard", LayoutDashboard], ["My work", ClipboardList], ["Calendar", CalendarDays], ["Insights", ChartNoAxesCombined], ...active.modules.map((n) => [n, LayoutDashboard])]
            : pages
          ).map(([name, Icon]) => (
            <button
              key={name}
              aria-current={
                (customer ? customerPage : page) === name ? "page" : undefined
              }
              className={
                (customer ? customerPage : page) === name ? "selected" : ""
              }
              onClick={() => {
                if (customer) {
                  setCustomerPage(name);
                  setMenuOpen(false);
                } else navigate(name);
              }}
            >
              <Icon size={18} />
              {name}
            </button>
          ))}
        </nav>
        <div className="foot">
          Demo environment
          <br />
          Changes reset on refresh
        </div>
      </aside>
    </>
  );
}
