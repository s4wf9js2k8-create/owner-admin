import React from "react";
import { moduleInfo, isTaskModule } from "../customerModules";
import { moduleAllowed } from "../customerWorkflows";
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
  Clock3,
  CalendarDays,
  ClipboardList,
  ChartNoAxesCombined,
  Bell,
  UserRound,
  Wrench,
  Package,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  CarFront,
  Folder,
  Palette,
  Lightbulb,
  Target,
  Megaphone,
  Server,
  UserPlus,
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
  ["Onboarding", UserPlus],
  ["Branding Templates", Palette],
  ["Client Insights", ChartNoAxesCombined],
  ["Feature Requests", Lightbulb],
  ["Sales Leads", Target],
  ["Announcements", Megaphone],
  ["Infrastructure", Server],
  ["Settings", Settings],
];
const iconFor = name => ({people:Users,timesheets:Clock3,assets:Package,maintenance:Wrench,inspections:ClipboardCheck,documents:FileText,schedule:CalendarDays,events:CalendarDays,bookings:CalendarDays,donations:HeartHandshake,fleet:CarFront,archives:Folder,projects:ClipboardList,reporting:ChartNoAxesCombined,training:UserRound}[moduleInfo(name).type] || Blocks);

const peopleTypes = new Set(["people","timesheets","schedule","leave","training"]);
const operationsTypes = new Set(["projects","assets","maintenance","inspections","safety","fleet","inventory","operations"]);
const customerGroups = (org, role, roleModules) => {
  const enabled=org.modules.filter(m=>moduleAllowed(role,m,roleModules));
  const modules=enabled.filter(m=>!isTaskModule(m));
  if(enabled.some(isTaskModule)) modules.unshift("Tasks & projects");
  const by = types => modules.filter(m=>types.has(moduleInfo(m).type)).map(m=>[m,iconFor(m)]);
  const grouped = new Set([...peopleTypes,...operationsTypes]);
  return [
    ["WORKSPACE",[["Dashboard",LayoutDashboard],["My work",ClipboardList],["Calendar",CalendarDays],["Notifications",Bell]]],
    ["TEAM",by(peopleTypes)],
    ["WORK & EQUIPMENT",by(operationsTypes)],
    ["BUSINESS & RESOURCES",modules.filter(m=>!grouped.has(moduleInfo(m).type)).map(m=>[m,iconFor(m)])],
    ["ACCOUNT",[["Settings",Settings]]]
  ].filter(([,items])=>items.length);
};
const ownerGroups = [
  ["OWNER CONSOLE",pages.slice(0,8)],
  ["BUSINESS OPERATIONS",pages.slice(8,-1)],
  ["ACCOUNT",[pages[pages.length-1]]]
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
    customerRole,
    roleModules,
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
          {customer ? customerRole+" · Demo workspace" : "Platform management"}
        </div>
        <nav aria-label="Main navigation">
          {(customer ? customerGroups(active,customerRole,roleModules) : ownerGroups).map(([group,items])=>(
            <React.Fragment key={group}>
              <div className="nav-section-label">{group}</div>
              {items.map(([name, Icon])=>(
                <button
                  key={name}
                  aria-current={(customer?customerPage:page)===name?"page":undefined}
                  className={(customer?customerPage:page)===name?"selected":""}
                  onClick={()=>{
                    if(customer){setCustomerPage(name);setMenuOpen(false);}
                    else navigate(name);
                  }}
                ><Icon size={18}/>{name}</button>
              ))}
            </React.Fragment>
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
