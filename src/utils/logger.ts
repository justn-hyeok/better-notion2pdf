import chalk from 'chalk';

export function logInfo(msg: string) {
  console.log(chalk.cyan('ℹ'), msg);
}

export function logWarn(msg: string) {
  console.warn(chalk.yellow('⚠'), msg);
}

export function logError(msg: string) {
  console.error(chalk.red('✖'), msg);
}
