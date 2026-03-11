import { z } from 'zod';

export const CliOptionsSchema = z.object({
  url: z.string().url().refine(
    (u) => /^https:\/\/(www\.)?notion\.(so|site)\//i.test(u),
    { message: 'URL must be an https:// Notion page URL (notion.so or notion.site)' }
  ),
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
  noSandbox: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

export type CliOptions = z.infer<typeof CliOptionsSchema>;

export type Margins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};
