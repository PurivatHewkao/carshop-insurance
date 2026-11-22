import { Router } from 'express';
import { httpError } from '../../utils/httpError.js';
import { CATALOG_EDITORS, staffOnly } from '../../middleware/auth.js';
import { COVER_SLOTS, getCovers, setCover } from './repository.js';

const router = Router();
const MAX_IMAGE_LENGTH = 700_000; // a compressed upload as a data: URL
const IMAGE_PATTERN = /^(https?:\/\/|data:image\/)/i;

function invalid(message) {
  return httpError(400, 'INVALID_COVER', message);
}

// GET /covers — public, the storefront reads it to pick the cover car and picture
router.get('/', async (_req, res) => {
  res.set('Cache-Control', 'no-store').json({ data: await getCovers() });
});

// PUT /covers/:slot  { "carId": "ferrari-296-gtb" | null, "imageUrl": "data:image/jpeg;base64,…" | null }
// A field that is not sent is left unchanged.
router.put('/:slot', ...staffOnly(...CATALOG_EDITORS), async (req, res) => {
  const { slot } = req.params;
  if (!COVER_SLOTS.includes(slot)) {
    throw invalid('slot must be one of: ' + COVER_SLOTS.join(', '));
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object');
  }
  const patch = {};
  if (body.carId !== undefined) {
    const { carId } = body;
    if (
      carId !== null &&
      (typeof carId !== 'string' || !carId.trim() || carId.length > 150)
    ) {
      throw invalid('carId must be a car slug/id or null');
    }
    patch.carId = carId === null ? null : carId.trim();
  }
  if (body.imageUrl !== undefined) {
    const { imageUrl } = body;
    if (
      imageUrl !== null &&
      (typeof imageUrl !== 'string' ||
        imageUrl.length > MAX_IMAGE_LENGTH ||
        !IMAGE_PATTERN.test(imageUrl))
    ) {
      throw invalid(
        'imageUrl must be an http(s) link or an uploaded image (at most ' +
          MAX_IMAGE_LENGTH +
          ' characters)',
      );
    }
    patch.imageUrl = imageUrl;
  }
  if (!Object.keys(patch).length) throw invalid('Send carId and/or imageUrl');
  if (!(await setCover(slot, patch))) {
    throw httpError(404, 'CAR_NOT_FOUND', 'Car model not found');
  }
  res.set('Cache-Control', 'no-store').json({ data: await getCovers() });
});

export default router;
