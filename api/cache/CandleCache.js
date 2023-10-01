const TradingData = require("../model/TradingData");

class CandleCache {
  constructor(capacity, model, timeframe) {
    this.capacity = capacity;
    this.Model = model;
    this.data = [];
    this.latestCreatedAt = null;
    this.timeframe = timeframe;
  }

  async fetchData(query = { timeframe: this.timeframe }) {
    // Fetch the latest data from the database.
    const queryWithCreatedAt = Object.assign({}, query, {
      createdAt: { $gt: this.latestCreatedAt },
    });
    const newData = await this.Model.find(queryWithCreatedAt).sort({
      createdAt: -1,
    });
    this.data.push(...newData);
    this.data.sort((a, b) => b.createdAt - a.createdAt);

    while (this.data.length > this.capacity) {
      this.data.pop();
    }

    this.updateLatestCreatedAt();
  }

  push(data) {
    this.data.unshift(data);
    this.updateLatestCreatedAt(data.createdAt);

    while (this.data.length > this.capacity) {
      this.data.pop();
    }
  }

  async get(quantity = 1, query = { timeframe: this.timeframe }) {
    // Always fetch the latest data from the database before returning it.
    await this.fetchData(query);
    return this.data.slice(0, quantity);
  }

  clear() {
    this.data = [];
    this.latestCreatedAt = null;
  }

  remove(index) {
    if (index >= 0 && index < this.data.length) {
      this.data.splice(index, 1);
      this.updateLatestCreatedAt();
    }
  }

  updateLatestCreatedAt(createdAt) {
    if (
      !this.latestCreatedAt ||
      (createdAt && createdAt > this.latestCreatedAt)
    ) {
      this.latestCreatedAt = createdAt;
    }
  }
}

const TradingDate = TradingData;

const OneMinCandleData = new CandleCache(100, TradingData, "1");
const FiveMinCandleData = new CandleCache(100, TradingData, "5");

module.exports = {
  OneMinCandleData,
  FiveMinCandleData,
};
