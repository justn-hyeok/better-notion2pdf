import { z } from 'zod';

export const CliOptionsSchema = z.object({
  url: z.string().url(),
  out: z.string().default('output.pdf'),
  format: z.enum(['A4', 'Letter']).default('A4'),
  margin: z.string().default('18mm,16mm,18mm,16mm'),
  profile: z.enum(['notion-default', 'portfolio']).default('notion-default'),
  cleanLevel: z.enum(['soft', 'hard']).default('soft'),
  waitMs: z.number().int().min(0).default(1200),
  timeoutMs: z.number().int().min(1000).default(45000),
  keepUi: z.boolean().default(false),
  cookieFile: z.string().optional(),
  codeWrap: z.enum(['soft', 'hard', 'none']).default('soft'),
  codeFontSize: z.number().int().min(8).max(16).default(11),
  debugShot: z.string().optional(),
  debugHtml: z.string().optional(),
  verbose: z.boolean().default(false),
});

export type CliOptions = z.infer<typeof CliOptionsSchema>;

export type Margins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};
