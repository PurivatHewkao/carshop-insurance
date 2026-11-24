// Insurance: customer and seller calls go through carshop's authenticated backend.
import { salesClient } from './client.js';
const unwrap = (response) => response.data.data;
export const fetchNovaPlans = (signal, carId) =>
  salesClient
    .get('insurance/plans', { signal, params: { carId }, timeout: 15000 })
    .then(unwrap);
export const fetchMyInsurance = (signal) =>
  salesClient.get('insurance/me', { signal }).then(unwrap);
export const fetchNovaConfigurationPlans = (signal, selection) =>
  salesClient
    .post('insurance/quotes', selection, { signal, timeout: 25000 })
    .then(unwrap);
