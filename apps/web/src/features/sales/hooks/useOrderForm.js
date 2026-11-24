import { useCallback, useState } from 'react';
import { resolveActor } from '../api/actor.js';
import {
  createOrder,
  fetchCustomers,
  fetchSellers,
} from '../api/salesApi.js';
import { createConfiguredUnit, fetchCars as fetchCatalogCars, releaseConfiguredUnit } from '../../catalog/api/catalogApi.js';
import { useAction, useSalesData } from './useSalesData.js';
// Insurance: load NOVA separately so an outage cannot block a car-only sale.

const EMPTY = { customerId: '', insuranceId: '', sellerId: '', discount: '0', note: '', vehicleConfiguration: null, downPaymentPercent: '0', interestRate: '', installmentCount: '' };

/**
 * State and submit logic shared by the two "create order" pages.
 * Car price and insurance premium are read-only here: the server takes the
 * current prices from the database when it creates the order (price snapshot).
 */
export function useOrderForm({ onCreated } = {}) {
  const lookups = useSalesData(async (signal) => {
    const [customers, models, sellers, actor] = await Promise.all([
      fetchCustomers(signal),
      fetchCatalogCars(signal),
      fetchSellers(signal),
      resolveActor(signal),
    ]);
    return { customers, models, sellers, actor };
  }, []);
  // Insurance: independent loading and retry for optional NOVA packages.
  const action = useAction();
  const [form, setForm] = useState(EMPTY);

  const customers = lookups.data?.customers ?? [];
  const models = lookups.data?.models ?? [];
  const sellers = lookups.data?.sellers ?? [];
  const actor = lookups.data?.actor;

  const customerId = form.customerId || customers[0]?.id || '';
  const carId = '';
  const nova = useSalesData(() => Promise.resolve([]), []);
  const insurances = nova.data ?? [];
  const sellerId = (!actor?.isStandIn && actor?.employeeId) || sellers[0]?.id || '';
  const customer = customers.find((item) => item.id === customerId);
  const insurance = insurances.find((item) => item.id === form.insuranceId);

  const carPrice = Number(form.vehicleConfiguration?.price || 0);
  const insurancePrice = insurance?.premium ?? 0;
  const discount = Number(form.discount || 0);
  // Preview only (the server recalculates in integer satang).
  const netTotal =
    Math.round((carPrice + insurancePrice - discount) * 100) / 100;
  // Insurance: require a valid selected NOVA plan and delivery date only when insured.
  const downPaymentPercent = Number(form.downPaymentPercent || 0);
  const downPayment = Math.round(netTotal * downPaymentPercent) / 100;
  const installmentYears = Number(form.installmentCount || 0) / 12;
  const canSubmit = Boolean(customerId && sellerId && form.vehicleConfiguration && form.vehicleConfiguration.price) && discount >= 0 && netTotal >= 0 && downPayment >= 0 && downPayment <= netTotal && Number(form.interestRate || 0) >= 0 && Number(form.interestRate || 0) <= 20 && Number(form.installmentCount || 0) > 0 && Number.isInteger(installmentYears) && installmentYears <= 10 && !form.insuranceId;

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const result = await action.run(async () => {
      const unit = await createConfiguredUnit({
        modelSlug: form.vehicleConfiguration.modelSlug,
        trim: form.vehicleConfiguration.trim,
        colorId: form.vehicleConfiguration.colorId,
        wheelId: form.vehicleConfiguration.wheelId,
      });
      try {
        return await createOrder({
        customerId,
        sellerId,
        carId: unit.carId,
        vehicleConfiguration: { ...form.vehicleConfiguration, price: unit.total },
        downPaymentPercent,
        interestRate: String(form.interestRate || '0'),
        installmentCount: Number(form.installmentCount),
        installmentYears,
        // Insurance: NOVA ids never enter the legacy insurance foreign key.
        insuranceId: null,
        novaPlanId: form.insuranceId || null,
        deliveryDate: form.insuranceId ? form.deliveryDate : undefined,
        expectedPremium: insurancePrice,
        discount: String(form.discount || '0'),
        note: form.note,
        });
      } catch (error) {
        await releaseConfiguredUnit(unit.carId).catch(() => {});
        throw error;
      }
    });
    if (result.ok) {
      // The car now has an active order, so it drops out of the car list.
      setForm({ ...EMPTY, customerId, vehicleConfiguration: null });
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
    lookups, nova, action, form, setForm, submit, canSubmit,
    customers, cars: models, insurances, sellers,
    customerId, carId, sellerId, customer,
    carPrice, insurancePrice, netTotal,
  };
}
