/**
 * Machine Learning models implemented in TypeScript
 */

export class LinearRegression {
  private slope: number = 0;
  private intercept: number = 0;

  train(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    this.slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    this.intercept = (sumY - this.slope * sumX) / n;
  }

  predict(x: number): number {
    return this.slope * x + this.intercept;
  }

  getMetrics(x: number[], y: number[]) {
    const predicted = x.map(val => this.predict(val));
    return {
      mse: this.calculateMSE(y, predicted),
      r2: this.calculateR2(y, predicted)
    };
  }

  private calculateMSE(actual: number[], predicted: number[]): number {
    return actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0) / actual.length;
  }

  private calculateR2(actual: number[], predicted: number[]): number {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssRes = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);
    const ssTot = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    return 1 - (ssRes / ssTot);
  }
}

// Simple Decision Tree Regressor (Stump)
export class DecisionTreeRegressor {
  private splitValue: number = 0;
  private leftVal: number = 0;
  private rightVal: number = 0;

  train(x: number[], y: number[]) {
    // Find best split (simplified)
    const meanX = x.reduce((a, b) => a + b, 0) / x.length;
    this.splitValue = meanX;
    
    const left = y.filter((_, i) => x[i] <= this.splitValue);
    const right = y.filter((_, i) => x[i] > this.splitValue);
    
    this.leftVal = left.length ? left.reduce((a, b) => a + b, 0) / left.length : 0;
    this.rightVal = right.length ? right.reduce((a, b) => a + b, 0) / right.length : 0;
  }

  predict(x: number): number {
    return x <= this.splitValue ? this.leftVal : this.rightVal;
  }
}

// Random Forest (Ensemble of Stumps)
export class RandomForestRegressor {
  private trees: DecisionTreeRegressor[] = [];

  train(x: number[], y: number[], numTrees: number = 5) {
    for (let i = 0; i < numTrees; i++) {
      const tree = new DecisionTreeRegressor();
      // Bootstrap sampling
      const indices = Array.from({ length: x.length }, () => Math.floor(Math.random() * x.length));
      const sampleX = indices.map(idx => x[idx]);
      const sampleY = indices.map(idx => y[idx]);
      tree.train(sampleX, sampleY);
      this.trees.push(tree);
    }
  }

  predict(x: number): number {
    const preds = this.trees.map(t => t.predict(x));
    return preds.reduce((a, b) => a + b, 0) / preds.length;
  }
}
