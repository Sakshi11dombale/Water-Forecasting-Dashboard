export interface BuildingData {
  id: string;
  name: string;
  type: 'Academic' | 'Residential' | 'Administrative' | 'Athletic';
  currentUsage: number;
  dailyLimit: number;
  status: 'Normal' | 'Warning' | 'Critical';
  futureNeed?: number;
  upgradeSuggestion?: string;
}

export interface UsagePoint {
  time: string;
  usage: number;
}

export interface ForecastPoint {
  time: string;
  actual?: number;
  predicted: number;
  upperBound: number;
  lowerBound: number;
}

export interface LeakAlert {
  buildingId: string;
  severity: 'Low' | 'Medium' | 'High';
  confidence: number;
  reasoning: string;
  timestamp: string;
}
