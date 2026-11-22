import { z } from 'zod';

const dateRangeShape = {
  date_from: z.iso.date().optional(),
  date_to: z.iso.date().optional(),
};

export const reportDateRangeQuerySchema = z
  .object(dateRangeShape)
  .superRefine((data, ctx) => {
    if (data.date_from && data.date_to && data.date_from > data.date_to) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be after or equal to date_from',
      });
    }
  });

export const salesSummaryQuerySchema = z
  .object({
    ...dateRangeShape,
    group_by: z.enum(['day', 'month', 'year']).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.date_from && data.date_to && data.date_from > data.date_to) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be after or equal to date_from',
      });
    }
  });

export const activityFeedQuerySchema = z
  .object({
    ...dateRangeShape,
    service: z.enum(['sales', 'payment']).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.date_from && data.date_to && data.date_from > data.date_to) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be after or equal to date_from',
      });
    }
  });
