import { useState } from 'react';
import { resolveActor } from '../api/actor.js';
import {
  createOrder,
  fetchCars,
  fetchCustomers,
  fetchInsurances,
  fetchSellers,
} from '../api/salesApi.js';
import { useAction, useSalesData } from './useSalesData.js';

const EMPTY = { customerId: '', carId: '', insuranceId: '', sellerId: '', discount: '0', note: '' };

/**
 * State and submit logic shared by the two "create order" pages.
 * Car price and insurance premium are read-only here: the server takes the
 * current prices from the database when it creates the order (price snapshot).
 */
export function useOrderForm({ onCreated } = {}) {
  const lookups = useSalesData(async (signal) => {
    const [customers, cars, insurances, sellers, actor] = await Promise.all([
      fetchCustomers(signal),
      fetchCars(signal),
      fetchInsurances(signal),
      fetchSellers(signal),
      resolveActor(signal),
    ]);
    return { customers, cars, insurances, sellers, actor };
  }, []);
  const action = useAction();
  const [form, setForm] = useState(EMPTY);

  const customers = lookups.data?.customers ?? [];
  const cars = lookups.data?.cars ?? [];
  const insurances = lookups.data?.insurances ?? [];
  const sellers = lookups.data?.sellers ?? [];
  const actor = lookups.data?.actor;

  const customerId = form.customerId || customers[0]?.id || '';
  const carId = form.carId || cars[0]?.id || '';
  const sellerId =
    form.sellerId || (!actor?.isStandIn && actor?.employeeId) || sellers[0]?.id || '';
  const customer = customers.find((item) => item.id === customerId);
  const car = cars.find((item) => item.id === carId);
  const insurance = insurances.find((item) => item.id === form.insuranceId);

  const carPrice = car?.price ?? 0;
  const insurancePrice = insurance?.premium ?? 0;
  const discount = Number(form.discount || 0);
  // Preview only (the server recalculates in integer satang).
  const netTotal = Math.round((carPrice + insurancePrice - discount) * 100) / 100;
  const canSubmit = Boolean(customerId && carId && sellerId) && discount >= 0 && netTotal >= 0;

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const result = await action.run(() =>
      createOrder({
        customerId,
        sellerId,
        carId,
        insuranceId: form.insuranceId || null,
        discount: String(form.discount || '0'),
        note: form.note,
      }),
    );
    if (result.ok) {
      // The car now has an active order, so it drops out of the car list.
      setForm({ ...form, carId: '', note: '', discount: '0' });
      lookups.reload();
      onCreated?.(result.value);
    }
  }

  return {
    lookups, action, form, setForm, submit, canSubmit,
    customers, cars, insurances, sellers,
    customerId, carId, sellerId, customer,
    carPrice, insurancePrice, netTotal,
  };
}
