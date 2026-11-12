import {test,expect} from '@playwright/test';
async function open(page,id='demo-engineering'){await page.goto('./');await page.getByRole('button',{name:'Explore customer workspace'}).click();await page.getByLabel('Example workspace').selectOption(id);}
async function go(page,name){await page.getByRole('button',{name:'Open navigation menu'}).click();await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();}
test('dashboard presets, ordering and direct work order creation',async({page})=>{
 await open(page);await expect(page.getByRole('heading',{name:'Your working day'})).toBeVisible();
 await page.getByRole('button',{name:'Customise dashboard'}).click();await page.getByLabel('Dashboard preset').selectOption('Operations');
 await page.getByRole('button',{name:'Move Staff on site down',exact:true}).click();
 await expect(page.locator('.ops-widget').first()).toHaveAttribute('aria-label','Upcoming shifts');
 await page.getByRole('button',{name:'Raise work order',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByLabel('Record title').fill('Dashboard raised repair');await page.getByRole('button',{name:'Save sample work order'}).click();
 await expect(page.locator('.job-board-card').filter({hasText:'Dashboard raised repair'})).toBeVisible();
});
test('staff profile has linked certificate and schedule sections',async({page})=>{
 await open(page);await go(page,'Staff & volunteers');await page.locator('.people-profile').filter({hasText:'Sample coordinator A'}).getByRole('button',{name:'Open profile'}).click();
 await page.getByRole('tab',{name:'Qualifications',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('Maintenance engineering');
 await page.getByRole('tab',{name:'Schedule',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('rota');
 await page.getByRole('tab',{name:'Personal details',exact:true}).click();await page.getByLabel('Team',{exact:true}).fill('Workshop');await expect(page.getByLabel('Team',{exact:true})).toHaveValue('Workshop');
});
test('work-order parts update inventory and completion appears in asset history',async({page})=>{
 await open(page);await go(page,'Assets & equipment');
 await page.locator('.asset-profile-card').first().getByRole('button',{name:'Open asset actions'}).click();await page.getByRole('button',{name:'Create work order for this asset'}).click();
 await page.locator('.job-board-card').filter({hasText:'Service asset:'}).getByRole('button',{name:'Manage work order'}).click();
 await page.getByLabel('Inventory part').selectOption({label:'Hi-vis safety vest · 5 available'});await page.getByLabel('Units to issue').fill('2');await page.getByRole('button',{name:'Allocate part',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('Hi-vis safety vest: 2 units');
 await page.getByLabel('Work order status').selectOption('Complete');await expect(page.getByRole('dialog')).toContainText('Status changed to Complete');
 await page.getByRole('button',{name:'Open linked asset'}).click();await page.getByRole('tab',{name:'Maintenance history',exact:true}).click();await expect(page.getByRole('tabpanel')).toContainText('Complete');
 await page.getByRole('button',{name:'Close dialog'}).click();await go(page,'Inventory and stock');await expect(page.getByRole('row').filter({hasText:'Hi-vis safety vest'})).toContainText('3');
});
test('rota creates an eligible linked shift, then edits its location',async({page})=>{
 await open(page);await go(page,'Shift rotas');await page.getByLabel('Rota week containing').fill('2027-03-01');
 await page.getByRole('button',{name:'Add shift',exact:true}).click();await page.getByLabel('Start',{exact:true}).fill('2027-03-01T09:00');await page.getByLabel('End',{exact:true}).fill('2027-03-01T13:00');await page.getByLabel('Person',{exact:true}).selectOption('Sample coordinator A');await page.getByLabel('Location',{exact:true}).fill('Workshop');await page.getByRole('button',{name:'Save sample record'}).click();
 await page.locator('.rota-assignment').filter({hasText:'Workshop'}).first().click();await page.getByLabel('Shift location').fill('Service bay');await page.getByRole('button',{name:'Save shift changes'}).click();await expect(page.locator('.rota-assignment').filter({hasText:'Service bay'})).toHaveCount(1);
 await page.getByLabel('Minimum shifts per day').fill('2');await expect(page.locator('.rota-coverage')).toContainText('1 unfilled');
});
