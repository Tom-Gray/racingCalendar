const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const gcc = 'Geelong Cycling Club';
const fcc = 'Footscray Cycling Club';

async function prepare(page, mobile) {
  await page.setViewportSize({ width: mobile ? 375 : 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenStateSelector', 'true');
    localStorage.setItem('hasSeenv2Announcement', 'true');
    localStorage.setItem('currentView', 'list');
    localStorage.setItem('statePreferences', JSON.stringify({ VIC: { selectedClubs: ['Geelong Cycling Club'], hideBMXEvents: false, hideMTBEvents: false } }));
    localStorage.setItem('mobileAppState', JSON.stringify({ selectedState: 'VIC', currentView: 'list', isFirstTime: false, statePreferences: { VIC: { selectedClubs: ['Geelong Cycling Club'], hideBMXEvents: false, hideMTBEvents: false } } }));
  });
  await page.route('**/events-vic.json', route => route.fulfill({ json: [
    { eventName: 'Heritage Handicap', eventDate: '2026-09-19T00:00:00Z', clubName: gcc, eventUrl: 'https://entryboss.cc/races/31703' },
    { eventName: 'FCC Race', eventDate: '2026-09-19T00:00:00Z', clubName: fcc, eventUrl: 'https://entryboss.cc/races/99999' }
  ] }));
  await page.goto('/');
  await expect(page.locator(mobile ? '.list-event-card' : '#events-list')).toContainText('Heritage Handicap');
}

test('cleaned state data has one record per URL and correct FCC cross-listing owners', () => {
  for (const file of fs.readdirSync(path.join(__dirname, '../..')).filter(f => /^events-.*\.json$/.test(f))) {
    const events = JSON.parse(fs.readFileSync(path.join(__dirname, '../..', file), 'utf8'));
    expect(new Set(events.map(e => e.eventUrl)).size, file).toBe(events.length);
  }
  const vic = JSON.parse(fs.readFileSync(path.join(__dirname, '../../events-vic.json'), 'utf8'));
  for (const event of vic.filter(e => e.eventUrl.endsWith('/31703'))) expect(event.clubName).toBe(gcc);
  for (const event of vic.filter(e => e.eventUrl.endsWith('/31994'))) expect(event.clubName).toBe('Geelong & Surfcoast Cycling Club');
});

test('owner filtering and colours agree across desktop and mobile', async ({ page }) => {
  await prepare(page, false);
  const desktopCard = page.locator('#events-list .day-event-item').filter({ hasText: 'Heritage Handicap' });
  await expect(desktopCard).toHaveCount(1);
  await expect(page.locator('#events-list')).not.toContainText('FCC Race');
  const desktopColor = await desktopCard.evaluate(el => el.style.borderLeftColor);
  expect(desktopColor).not.toBe('');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.reload();
  const mobileCard = page.locator('.list-event-card').filter({ hasText: 'Heritage Handicap' });
  await expect(mobileCard).toHaveCount(1);
  expect(await mobileCard.evaluate(el => el.style.borderLeftColor)).toBe(desktopColor);
  await expect(page.locator('.list-event-card').filter({ hasText: 'FCC Race' })).toHaveCount(0);
});

test('club colours survive changes to the available clubs and reload', async ({ page }) => {
  await prepare(page, false);
  const before = await page.evaluate(() => clubColors.get('Geelong Cycling Club'));
  const after = await page.evaluate(() => {
    clubs.unshift('A New Club');
    assignClubColors();
    return clubColors.get('Geelong Cycling Club');
  });
  expect(after).toBe(before);
  await page.reload();
  await expect(page.locator('#events-list')).toContainText('Heritage Handicap');
  expect(await page.evaluate(() => clubColors.get('Geelong Cycling Club'))).toBe(before);
});
