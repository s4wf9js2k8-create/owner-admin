import { preferredModule } from "../../src/completion/moduleNavigation.js";
import { moduleInfo } from "../../src/customerModules.js";
export async function openDestination(page, name) {
  await page
    .getByRole("button", { name: "Open navigation menu", exact: true })
    .click();
  const nav = page.getByRole("navigation");
  let button = nav.getByRole("button", { name, exact: true });
  if (!(await button.count())) {
    name = preferredModule[moduleInfo(name).type] || name;
    button = nav.getByRole("button", { name, exact: true });
  }
  await button.click();
}
