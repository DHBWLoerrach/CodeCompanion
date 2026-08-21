function shouldUseWideTopicTile(topicName: string) {
  return (
    topicName.length > 22 ||
    ((topicName.includes(',') || topicName.includes('(')) &&
      topicName.length > 18)
  );
}

function getWideTileIndexes(topicNames: string[]) {
  const wideIndexes = new Set<number>();
  let rowFill = 0;

  for (let index = 0; index < topicNames.length; index += 1) {
    const isLongTitle = shouldUseWideTopicTile(topicNames[index]);
    const isLastItem = index === topicNames.length - 1;

    if (isLongTitle || (isLastItem && rowFill === 0)) {
      wideIndexes.add(index);
      rowFill = 0;
      continue;
    }

    rowFill = rowFill === 0 ? 1 : 0;
  }

  return wideIndexes;
}

function getTopicRows<T>(topics: T[], wideTileIndexes: Set<number>) {
  const rows: T[][] = [];
  let currentRow: T[] = [];

  for (let index = 0; index < topics.length; index += 1) {
    const topic = topics[index];

    if (wideTileIndexes.has(index)) {
      if (currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }

      rows.push([topic]);
      continue;
    }

    currentRow.push(topic);

    if (currentRow.length === 2) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

export function buildLearnTopicRows<T>(
  topics: T[],
  getTopicName: (topic: T) => string,
  usesLargeLayout: boolean
) {
  if (usesLargeLayout) {
    return topics.map((topic) => [topic]);
  }

  return getTopicRows(
    topics,
    getWideTileIndexes(topics.map((topic) => getTopicName(topic)))
  );
}
