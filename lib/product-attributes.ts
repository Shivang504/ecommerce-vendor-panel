export type AttributeSelectionMap = Record<string, string[]>;

const toCleanArray = (values: unknown): string[] => {
  if (Array.isArray(values)) {
    return Array.from(
      new Set(
        values
          .map(value => (typeof value === 'string' ? value.trim() : ''))
          .filter(Boolean),
      ),
    );
  }

  if (typeof values === 'string') {
    const trimmed = values.trim();
    return trimmed ? [trimmed] : [];
  }

  return [];
};

const resolveAttributeId = (entry: Record<string, unknown>): string => {
  const candidates = ['attributeId', '_id', 'id', 'attribute', 'name'];
  for (const key of candidates) {
    const raw = entry[key];
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
  }
  return '';
};

/**
 * Normalizes any attribute payload coming from the client or legacy records
 * into the new { attributeId: string[] } structure.
 */
export const sanitizeAttributeSelections = (input: unknown): AttributeSelectionMap => {
  const sanitized: AttributeSelectionMap = {};

  const upsert = (attributeId: string, values: unknown) => {
    const cleanValues = toCleanArray(values);
    if (attributeId && cleanValues.length) {
      sanitized[attributeId] = cleanValues;
    }
  };

  if (!input) {
    return sanitized;
  }

  if (Array.isArray(input)) {
    input.forEach(entry => {
      if (!entry) return;
      if (typeof entry === 'string' && entry.trim()) {
        sanitized[entry.trim()] = [];
        return;
      }
      if (typeof entry === 'object') {
        const attributeId = resolveAttributeId(entry as Record<string, unknown>);
        const values = (entry as Record<string, unknown>).values ?? (entry as Record<string, unknown>).options ?? [];
        upsert(attributeId, values);
      }
    });
    return sanitized;
  }

  if (typeof input === 'object') {
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof key !== 'string') return;
      const attributeId = key.trim();
      upsert(attributeId, value);
    });
  }

  return sanitized;
};

export const isAttributeSelectionEmpty = (attributes?: AttributeSelectionMap): boolean => {
  if (!attributes) return true;
  return !Object.values(attributes).some(values => Array.isArray(values) && values.length > 0);
};

