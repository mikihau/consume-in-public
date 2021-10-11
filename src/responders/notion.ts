import { ConsumptionAttributes } from 'transformers/transformer.js';
import { ResponderExecutionResult } from '../index.js';
import { getDatabaseId, upsertDatabaseRecord } from '../services/notion.js';

export async function update(attr: ConsumptionAttributes): Promise<ResponderExecutionResult> {
  try {
    const databaseId = await getDatabaseId(attr.Database);
    await upsertDatabaseRecord(databaseId, attr);
  } catch (error: unknown) {
    return {
      success: false,
      message: error as string
    }
  }
  
  return {
    success: true
  };
}
