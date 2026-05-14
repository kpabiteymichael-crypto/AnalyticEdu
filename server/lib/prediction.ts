// AI Prediction Engine - Statistical regression model
interface ScoreHistory {
  score: number;
  maxScore: number;
  recordedAt: Date;
}

interface PredictionResult {
  predictedScore: number;
  confidenceScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendations: string[];
}

export function predictStudentPerformance(scores: ScoreHistory[]): PredictionResult {
  if (scores.length === 0) {
    return {
      predictedScore: 70,
      confidenceScore: 0.3,
      riskLevel: 'low',
      riskFactors: ['Insufficient data'],
      recommendations: ['Complete more assessments to improve predictions'],
    };
  }

  const percentages = scores.map(s => (s.score / s.maxScore) * 100);
  const n = percentages.length;
  const avg = percentages.reduce((a, b) => a + b, 0) / n;

  // Weighted moving average (recent scores matter more)
  const weights = percentages.map((_, i) => Math.pow(1.3, i));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedAvg = percentages.reduce((acc, val, i) => acc + val * weights[i], 0) / totalWeight;

  // Trend analysis (linear regression)
  const xMean = (n - 1) / 2;
  const yMean = avg;
  let slope = 0;
  if (n > 1) {
    const num = percentages.reduce((acc, y, i) => acc + (i - xMean) * (y - yMean), 0);
    const den = percentages.reduce((acc, _, i) => acc + Math.pow(i - xMean, 2), 0);
    slope = den !== 0 ? num / den : 0;
  }

  // Standard deviation
  const variance = percentages.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Predicted score
  const trendBonus = slope * 1.5;
  const predictedScore = Math.min(100, Math.max(0, weightedAvg + trendBonus));

  // Confidence based on data points and consistency
  const consistencyFactor = Math.max(0, 1 - stdDev / 30);
  const dataPtFactor = Math.min(1, n / 8);
  const confidenceScore = Math.round(consistencyFactor * dataPtFactor * 100) / 100;

  // Risk assessment
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

  if (predictedScore < 50) {
    riskLevel = 'critical';
    riskFactors.push('Predicted score below passing threshold');
    recommendations.push('Schedule immediate intervention session');
    recommendations.push('Assign peer tutor');
  } else if (predictedScore < 65) {
    riskLevel = 'high';
    riskFactors.push('Performance below expected level');
    recommendations.push('Schedule weekly check-ins with teacher');
    recommendations.push('Review foundational concepts');
  } else if (predictedScore < 75) {
    riskLevel = 'medium';
    riskFactors.push('Moderate performance — room for improvement');
    recommendations.push('Focus on practice exercises');
    recommendations.push('Review recent assessment errors');
  } else {
    riskLevel = 'low';
    recommendations.push('Maintain current study habits');
  }

  if (slope < -2) {
    riskFactors.push('Declining performance trend');
    recommendations.push('Investigate root cause of score decline');
  }
  if (stdDev > 20) {
    riskFactors.push('Inconsistent performance');
    recommendations.push('Develop consistent study schedule');
  }

  return { predictedScore, confidenceScore, riskLevel, riskFactors, recommendations };
}
