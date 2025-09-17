const axios = require('axios');

class TaxService {
  constructor() {
    this.taxRates = new Map();
    this.loadTaxRates();
  }

  loadTaxRates() {
    // Basic tax rates for different countries
    this.taxRates.set('US', 0.08); // Average US sales tax
    this.taxRates.set('CA', 0.13); // Canadian HST
    this.taxRates.set('GB', 0.20); // UK VAT
    this.taxRates.set('DE', 0.19); // German VAT
    this.taxRates.set('FR', 0.20); // French VAT
    this.taxRates.set('AU', 0.10); // Australian GST
    this.taxRates.set('JP', 0.10); // Japanese consumption tax
  }

  async calculateTax(order, shippingAddress) {
    const country = shippingAddress.country;
    let taxRate = this.taxRates.get(country) || 0;

    // For US, we might need to calculate state-specific taxes
    if (country === 'US' && shippingAddress.state) {
      taxRate = await this.getUSTaxRate(shippingAddress.state);
    }

    // Calculate tax amount
    const taxableAmount = order.totalAmount - (order.shipping?.cost || 0);
    const taxAmount = taxableAmount * taxRate;

    return {
      rate: taxRate,
      amount: parseFloat(taxAmount.toFixed(2)),
      country,
      region: shippingAddress.state
    };
  }

  async getUSTaxRate(state) {
    // Simplified state tax rates - in real implementation, use tax API
    const stateTaxRates = {
      'CA': 0.085, 'NY': 0.088, 'TX': 0.082, 'FL': 0.07,
      'IL': 0.088, 'PA': 0.063, 'OH': 0.072, 'GA': 0.07,
      'NC': 0.069, 'MI': 0.06
    };

    return stateTaxRates[state] || 0.08;
  }

  async validateVATNumber(vatNumber, country) {
    try {
      // This would integrate with a VAT validation service
      // For now, return mock validation
      return {
        valid: true,
        name: 'Business Name',
        address: 'Business Address',
        country
      };
    } catch (error) {
      console.error('VAT validation error:', error);
      return { valid: false, error: error.message };
    }
  }

  async generateTaxReport(sellerId, startDate, endDate) {
    const orders = await Order.find({
      seller: sellerId,
      'payment.status': 'completed',
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('buyer');

    const taxReport = {
      totalSales: 0,
      totalTax: 0,
      byCountry: new Map(),
      byMonth: new Map(),
      orders: []
    };

    for (const order of orders) {
      const tax = order.tax || { amount: 0, rate: 0 };
      
      taxReport.totalSales += order.totalAmount;
      taxReport.totalTax += tax.amount;

      // Group by country
      const country = order.shippingAddress.country;
      if (!taxReport.byCountry.has(country)) {
        taxReport.byCountry.set(country, { sales: 0, tax: 0 });
      }
      const countryData = taxReport.byCountry.get(country);
      countryData.sales += order.totalAmount;
      countryData.tax += tax.amount;

      // Group by month
      const month = order.createdAt.toISOString().substring(0, 7);
      if (!taxReport.byMonth.has(month)) {
        taxReport.byMonth.set(month, { sales: 0, tax: 0 });
      }
      const monthData = taxReport.byMonth.get(month);
      monthData.sales += order.totalAmount;
      monthData.tax += tax.amount;

      taxReport.orders.push({
        orderId: order.orderId,
        date: order.createdAt,
        amount: order.totalAmount,
        tax: tax.amount,
        country
      });
    }

    return taxReport;
  }
}

module.exports = new TaxService();