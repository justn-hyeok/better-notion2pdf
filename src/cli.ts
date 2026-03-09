#!/usr/bin/env node
import { Command } from 'commander';
import { z } from 'zod';
import { buildPdf } from './build.js';
import { CliOptionsSchema } from './types.js';
import { logError } from './utils/logger.js';

const program = new Command();

program
  .name('better-notion2pdf')
  .description('Readable Notion-to-PDF builder with smart page breaks')
  .requiredOption('--url <url>', 'Notion page URL')
  .option('--out <path>', 'Output PDF path', 'output.pdf')
  .option('--format <A4|Letter>', 'PDF page format', 'A4')
  .option('--margin <t,r,b,l>', 'PDF margins', '18mm,16mm,18mm,16mm')
  .option('--profile <profile>', 'Style profile: notion-default|portfolio', 'notion-default')
  .option('--clean-level <level>', 'UI clean level: soft|hard', 'soft')
  .option('--wait-ms <ms>', 'Extra wait after style injection', '1200')
  .option('--timeout-ms <ms>', 'Navigation/render timeout', '45000')
  .option('--keep-ui', 'Do not remove Notion app UI')
  .option('--cookie-file <path>', 'JSON cookie file for private Notion pages')
  .option('--code-wrap <mode>', 'Code wrapping mode: soft|hard|none', 'soft')
  .option('--code-font-size <px>', 'Code font size in px (8-16)', '11')
  .option('--debug-shot <path>', 'Save full page screenshot before PDF')
  .option('--debug-html <path>', 'Save page HTML and injected css')
  .option('--verbose', 'Verbose logs')
  .action(async (raw) => {
    try {
      const parsed = CliOptionsSchema.parse({
        ...raw,
        waitMs: Number(raw.waitMs),
        timeoutMs: Number(raw.timeoutMs),
        codeFontSize: Number(raw.codeFontSize),
      });

      await buildPdf(parsed);
      process.exit(0);
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError(`Invalid options: ${error.issues.map((i) => i.message).join(', ')}`);
        process.exit(10);
      }

      const msg = error instanceof Error ? error.message : String(error);
      logError(msg);

      if (/timeout/i.test(msg)) process.exit(20);
      if (/auth|permission|login|not found|403|401/i.test(msg)) process.exit(30);
      process.exit(50);
    }
  });

program.parse();
