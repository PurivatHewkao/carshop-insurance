
import { z } from 'zod';

export const salesSummaryQuerySchema = z
  .object({
    date_from: z.iso.date().optional(),

    date_to: z.iso.date().optional(),

    group_by: z
      .enum(['day', 'month', 'year'])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.date_from &&
      data.date_to &&
      data.date_from > data.date_to
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['date_to'],
        message: 'date_to must be after or equal to date_from',
      });
    }
  });
