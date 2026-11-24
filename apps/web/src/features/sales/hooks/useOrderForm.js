import { useState } from 'react';
import { resolveActor } from '../api/actor.js';
import {
  createOrder,
  fetchCars,
  fetchCustomers,
  fetchSellers,
} from '../api/salesApi.js';
import { useAction, useSalesData } from './useSalesData.js';
// Insurance: load NOVA separately so an outage cannot block a car-only sale.
import { fetchNovaPlans } from '../api/insuranceApi.js';

const EMPTY = {
  customerId: '',
  carId: '',
  insuranceId: '',
  sellerId: '',
  discount: '0',
  note: '',
};

/**
 * State and submit logic shared by the two "create order" pages.
 * Car price and insurance premium are read-only here: the server takes the
 * current prices from the database when it creates the order (price snapshot).
 */
export function useOrderForm({ onCreated } = {}) {
  const lookups = useSalesData(async (signal) => {
    const [customers, cars, sellers, actor] = await Promise.all([
      fetchCustomers(signal),
      fetchCars(signal),
      fetchSellers(signal),
      resolveActor(signal),
    ]);
    return { customers, cars, sellers, actor };
  }, []);
  // Insurance: independent loading and retry for optional NOVA packages.
  const action = useAction();
  const [form, setForm] = useState(EMPTY);

  const customers = lookups.data?.customers ?? [];
  const cars = lookups.data?.cars ?? [];
  const sellers = lookups.data?.sellers ?? [];
  const actor = lookups.data?.actor;

  const customerId = form.customerId || customers[0]?.id || '';
  const carId = form.carId || cars[0]?.id || '';
  const nova = useSalesData(
    (signal) => (carId ? fetchNovaPlans(signal, carId) : Promise.resolve([])),
    [carId],
  );
  const insurances = nova.loading ? [] : (nova.data ?? []);
  const sellerId =
    (!actor?.isStandIn && actor?.employeeId) || sellers[0]?.id || '';
  const customer = customers.find((item) => item.id === customerId);
  const car = cars.find((item) => item.id === carId);
  const insurance = insurances.find((item) => item.id === form.insuranceId);

  const carPrice = car?.price ?? 0;
  const insurancePrice = insurance?.premium ?? 0;
  const discount = Number(form.discount || 0);
  // Preview only (the server recalculates in integer satang).
  const netTotal =
    Math.round((carPrice + insurancePrice - discount) * 100) / 100;
  // Insurance: require a valid selected NOVA plan and delivery date only when insured.
  const canSubmit =
    Boolean(customerId && carId && sellerId) &&
    discount >= 0 &&
    netTotal >= 0 &&
    (!form.insuranceId ||
      Boolean(insurance && form.deliveryDate && !nova.error && !nova.loading));

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const result = await action.run(() =>
      createOrder({
        customerId,
        sellerId,
        carId,
        // Insurance: NOVA ids never enter the legacy insurance foreign key.
        insuranceId: null,
        novaPlanId: form.insuranceId || null,
        deliveryDate: form.insuranceId ? form.deliveryDate : undefined,
        expectedPremium: insurancePrice,
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
    // Insurance: expose NOVA load state to the small supplemental form component.
    lookups,
    nova,
    action,
    form,
    setForm,
    submit,
    canSubmit,
    customers,
    cars,
    insurances,
    sellers,
    customerId,
    carId,
    sellerId,
    customer,
    carPrice,
    insurancePrice,
    netTotal,
  };
}
