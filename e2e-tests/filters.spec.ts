import { test, expect } from '@playwright/test';
import { getDatabase } from '../src/lib/db';
import { getAllGames } from '../src/lib/games';

test.describe('Game Catalog Filters', () => {
  test('filters by multiple categories and publisher, then clears filters', async ({ page }) => {
    const games = await getAllGames(getDatabase());
    const categoryNames = [...new Set(
      games.flatMap((game) => game.category ? [game.category.name] : []),
    )].slice(0, 2);

    expect(categoryNames.length).toBe(2);
    const categoryMatches = games.filter((game) =>
      categoryNames.includes(game.category?.name ?? ''),
    );
    const publisherCounts = new Map<string, number>();
    for (const game of categoryMatches) {
      if (game.publisher) {
        publisherCounts.set(
          game.publisher.name,
          (publisherCounts.get(game.publisher.name) ?? 0) + 1,
        );
      }
    }

    const publisherName = [...publisherCounts].find(([, count]) => count < categoryMatches.length)?.[0]
      ?? [...publisherCounts.keys()][0];
    if (!publisherName) {
      throw new Error('The catalog must include a publisher for the selected categories.');
    }
    const combinedMatches = categoryMatches.filter(
      (game) => game.publisher?.name === publisherName,
    );

    await page.goto('/');

    for (const categoryName of categoryNames) {
      await page.getByRole('checkbox', { name: categoryName, exact: true }).check();
    }

    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(
      categoryMatches.length,
    );
    await expect(page.getByTestId('filter-results')).toHaveText(
      `Showing ${categoryMatches.length} of ${games.length} games`,
    );

    await page.getByLabel('Publisher').selectOption({ label: publisherName });

    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(
      combinedMatches.length,
    );
    await expect(page.getByTestId('filter-results')).toHaveText(
      `Showing ${combinedMatches.length} of ${games.length} games`,
    );

    await page.getByTestId('clear-game-filters').click();

    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(games.length);
    await expect(page.getByTestId('filter-results')).toHaveText(
      `Showing ${games.length} of ${games.length} games`,
    );
    await expect(page.getByLabel('Publisher')).toHaveValue('');
    for (const categoryName of categoryNames) {
      await expect(page.getByRole('checkbox', { name: categoryName, exact: true })).not.toBeChecked();
    }
  });
});
