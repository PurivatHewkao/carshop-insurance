// Production queue API (owner: ดิว). Mounted at /api/v1/production.
import { Router } from 'express';
import { httpError, requireUuid } from '../../utils/httpError.js';
import {
  CATALOG_EDITORS,
  CATALOG_STAFF,
  staffOnly,
} from '../../middleware/auth.js';
import {
  MAX_CAPACITY,
  STATUSES,
  TRIMS,
  changeProduction,
  getCarProduction,
  getEta,
  getLoad,
  listQueue,
  scheduleCar,
  setCapacity,
} from './repository.js';

const router = Router();
// Finance and sellers follow the queue too (balance invoices, delivery).
const QUEUE_READERS = [...new Set([...CATALOG_STAFF, 'finance', 'seller'])];
// Sellers may only hand over the car (DELIVER); every other step is stock/admin work.
const PRODUCTION_WRITERS = [...CATALOG_EDITORS, 'seller'];

function readTrim(value, { required }) {
  if (value === undefined || value === '') {
    if (required) throw httpError(400, 'INVALID_QUERY', 'trim is required');
    return undefined;
  }
  const trim = String(value).toUpperCase();
  if (!TRIMS.includes(trim)) {
    throw httpError(
      400,
      'INVALID_QUERY',
      'trim must be one of ' + TRIMS.join(', '),
    );
  }
  return trim;
}

function readModelRef(value) {
  const ref = String(value ?? '').trim();
  if (!ref || ref.length > 150)
    throw httpError(400, 'INVALID_QUERY', 'model is required');
  return ref;
}

const noStore = (res) => res.set('Cache-Control', 'no-store');

// GET /production/eta?model=<slug|uuid>&trim=ECO — public estimate for the configurator.
router.get('/eta', async (req, res) => {
  const data = await getEta(
    readModelRef(req.query.model),
    readTrim(req.query.trim, { required: true }),
  );
  noStore(res).json({ data });
});

router.get('/queue', ...staffOnly(...QUEUE_READERS), async (req, res) => {
  const status = req.query.status;
  if (status !== undefined && !STATUSES.includes(status)) {
    throw httpError(
      400,
      'INVALID_QUERY',
      'status must be one of ' + STATUSES.join(', '),
    );
  }
  noStore(res).json({ data: await listQueue(status) });
});

router.get('/load', ...staffOnly(...QUEUE_READERS), async (req, res) => {
  const weeks = req.query.weeks === undefined ? 8 : Number(req.query.weeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 26) {
    throw httpError(
      400,
      'INVALID_QUERY',
      'weeks must be an integer between 1 and 26',
    );
  }
  noStore(res).json({ data: await getLoad(weeks) });
});

router.put(
  '/capacity/:modelRef',
  ...staffOnly(...CATALOG_EDITORS),
  async (req, res) => {
    const capacity = req.body?.weeklyCapacity;
    if (
      !Number.isInteger(capacity) ||
      capacity < 0 ||
      capacity > MAX_CAPACITY
    ) {
      throw httpError(
        400,
        'INVALID_PRODUCTION',
        'weeklyCapacity must be an integer between 0 and ' + MAX_CAPACITY,
      );
    }
    noStore(res).json({
      data: await setCapacity(readModelRef(req.params.modelRef), capacity),
    });
  },
);

// GET /production/cars/:carId — public: order pages show the delivery window.
router.get('/cars/:carId', async (req, res) => {
  noStore(res).json({
    data: await getCarProduction(requireUuid(req.params.carId, 'carId')),
  });
});

router.post(
  '/cars/:carId/schedule',
  ...staffOnly(...CATALOG_EDITORS),
  async (req, res) => {
    const carId = requireUuid(req.params.carId, 'carId');
    noStore(res).json({
      data: await scheduleCar(
        carId,
        readTrim(req.body?.trim, { required: false }),
      ),
    });
  },
);

router.patch(
  '/cars/:carId',
  ...staffOnly(...PRODUCTION_WRITERS),
  async (req, res) => {
    const carId = requireUuid(req.params.carId, 'carId');
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (req.user.role === 'seller' && body.action !== 'DELIVER') {
      throw httpError(403, 'FORBIDDEN', 'Sellers can only record the delivery');
    }
    noStore(res).json({ data: await changeProduction(carId, body) });
  },
);

export default router;
