// Insurance: customer and seller calls go through carshop's authenticated backend.
import { salesClient } from './client.js';
const unwrap = (response) => response.data.data;
export const fetchNovaPlans = (signal) =>
  salesClient.get('insurance/plans', { signal, timeout: 15000 }).then(unwrap);
export const fetchMyInsurance = (signal) =>
  salesClient.get('insurance/me', { signal }).then(unwrap);
