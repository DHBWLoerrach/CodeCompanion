import { mapWithConcurrency } from '@server/concurrency';

describe('mapWithConcurrency', () => {
  it('preserves input order while processing items concurrently', async () => {
    const resolvers: ((value: string) => void)[] = [];
    const startedIndices: number[] = [];

    const pending = mapWithConcurrency(
      ['a', 'b', 'c'],
      2,
      (item, index) =>
        new Promise<string>((resolve) => {
          startedIndices.push(index);
          resolvers[index] = () => resolve(item.toUpperCase());
        })
    );

    expect(startedIndices).toEqual([0, 1]);

    resolvers[1]('B');
    await Promise.resolve();
    expect(startedIndices).toEqual([0, 1, 2]);

    resolvers[0]('A');
    resolvers[2]('C');

    await expect(pending).resolves.toEqual(['A', 'B', 'C']);
  });

  it('never exceeds the configured concurrency', async () => {
    let activeWorkers = 0;
    let peakWorkers = 0;

    const results = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (item) => {
        activeWorkers += 1;
        peakWorkers = Math.max(peakWorkers, activeWorkers);
        await Promise.resolve();
        await Promise.resolve();
        activeWorkers -= 1;
        return item * 2;
      }
    );

    expect(results).toEqual([2, 4, 6, 8, 10]);
    expect(peakWorkers).toBe(2);
  });

  it('throws for invalid concurrency values', async () => {
    await expect(
      mapWithConcurrency([1], 0, async (value) => value)
    ).rejects.toThrow('concurrency must be a positive integer');
  });
});
