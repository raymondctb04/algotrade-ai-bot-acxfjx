
import { BotConfig } from '../types/Bot';

const riskToAtr = (risk: number) => {
  if (risk <= 0.005) return 1.0;
  if (risk <= 0.01) return 1.5;
  if (risk <= 0.02) return 2.0;
  return 2.5;
};

// Python sample disabled per requirements
export function getPythonSample_REMOVED_DO_NOT_USE(config: BotConfig) {
  return '# Python code generation has been removed in this build.';
}

// Pine Script functionality removed as requested
export function getPineSample(config: BotConfig) {
  return '// Pine Script functionality has been removed from this build.';
}
