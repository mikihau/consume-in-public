import { ConsumptionAttributes } from 'transformers/transformer.js';
import { ResponderExecutionResult } from '../index.js';
import { postToot } from '../services/mastodon.js';

export async function update(attr: ConsumptionAttributes): Promise<ResponderExecutionResult> {
  try {
    await postToot(attr);
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
